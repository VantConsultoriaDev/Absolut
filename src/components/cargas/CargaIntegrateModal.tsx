import React, { useMemo } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import StandardCheckbox from '../StandardCheckbox';
import { formatCurrency, parseCurrency } from '../../utils/formatters';
import { Carga, MovimentacaoFinanceira } from '../../types';

interface IntegrateData {
  adiantamentoEnabled: boolean;
  adiantamentoPercentual: string;
  dataVencimentoAdiantamento: string;
  dataVencimentoSaldo: string;
  dataVencimentoDespesa: string;
  despesasEnabled: boolean;
  valorARS: string;
  taxaConversao: string;
  valorBRL: string;
  valorBRLExtra: string;
  diariasEnabled: boolean;
  valorDiarias: string;
  somaOpcao: 'adiantamento' | 'saldo';
  splitOption: 'ambos' | 'adiantamento' | 'saldo'; // NOVO CAMPO
}

interface CargaIntegrateModalProps {
  isOpen: boolean;
  integratingCarga: Carga | null;
  movimentacoes: MovimentacaoFinanceira[];
  onClose: () => void;
  onIntegrate: () => void;
  integrateData: IntegrateData;
  setIntegrateData: React.Dispatch<React.SetStateAction<IntegrateData>>;
}

// Funções auxiliares para cálculos automáticos (movidas para o componente)
const formatNumberBR = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  const amount = parseInt(numbers, 10) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const CargaIntegrateModal: React.FC<CargaIntegrateModalProps> = ({
  isOpen,
  integratingCarga,
  movimentacoes,
  onClose,
  onIntegrate,
  integrateData,
  setIntegrateData,
}) => {
  if (!isOpen || !integratingCarga) return null;

  const { hasAdiantamento, hasSaldo, hasFreteUnico, isFullyIntegrated } = useMemo(() => {
    const relatedMovs = movimentacoes.filter(m => m.cargaId === integratingCarga.id && m.categoria === 'FRETE');
    const adto = relatedMovs.some(m => m.descricao.startsWith('Adto -'));
    const saldo = relatedMovs.some(m => m.descricao.startsWith('Saldo -'));
    const freteUnico = relatedMovs.some(m => m.descricao.startsWith('Frete -'));
    
    // Considera totalmente integrado se houver Frete Único OU Adto E Saldo
    const fullyIntegrated = freteUnico || (adto && saldo);
    
    return { hasAdiantamento: adto, hasSaldo: saldo, hasFreteUnico: freteUnico, isFullyIntegrated: fullyIntegrated };
  }, [movimentacoes, integratingCarga]);

  // Ajusta o estado inicial da modal com base no que já foi lançado
  React.useEffect(() => {
    if (isOpen && integratingCarga) {
      if (hasFreteUnico) {
        // Se já tem Frete Único, desabilita tudo
        setIntegrateData(prev => ({
          ...prev,
          adiantamentoEnabled: false,
          despesasEnabled: false,
          diariasEnabled: false,
        }));
      } else if (hasAdiantamento && !hasSaldo) {
        // Se só tem Adiantamento, força o lançamento de Saldo
        setIntegrateData(prev => ({
          ...prev,
          adiantamentoEnabled: true,
          splitOption: 'saldo',
        }));
      } else if (hasSaldo && !hasAdiantamento) {
        // Se só tem Saldo, força o lançamento de Adiantamento
        setIntegrateData(prev => ({
          ...prev,
          adiantamentoEnabled: true,
          splitOption: 'adiantamento',
        }));
      } else if (hasAdiantamento && hasSaldo) {
        // Se já tem Adiantamento E Saldo, desabilita tudo
        setIntegrateData(prev => ({
          ...prev,
          adiantamentoEnabled: true, // Mantém habilitado para mostrar os valores
          splitOption: 'ambos',
          despesasEnabled: false,
          diariasEnabled: false,
        }));
      } else {
        // Estado inicial (nada lançado)
        setIntegrateData(initialIntegrateData);
      }
    }
  }, [isOpen, integratingCarga, hasAdiantamento, hasSaldo, hasFreteUnico, setIntegrateData]);


  const calcularValorBRL = useMemo(() => {
    if (!integrateData.despesasEnabled) return 0;
    const valorARS = parseCurrency(integrateData.valorARS || '');
    const taxa = parseCurrency(integrateData.taxaConversao || '');
    const extraBRL = parseCurrency(integrateData.valorBRLExtra || '');
    return (valorARS * taxa) + extraBRL;
  }, [integrateData.despesasEnabled, integrateData.valorARS, integrateData.taxaConversao, integrateData.valorBRLExtra]);

  const calcularAdiantamento = useMemo(() => {
    if (!integrateData.adiantamentoEnabled || !integratingCarga) return 0;
    const valorTotal = parseFloat(integratingCarga.valor?.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const percentual = parseFloat(integrateData.adiantamentoPercentual) / 100;
    return valorTotal * percentual;
  }, [integrateData.adiantamentoEnabled, integratingCarga, integrateData.adiantamentoPercentual]);

  const calcularSaldo = useMemo(() => {
    if (!integrateData.adiantamentoEnabled || !integratingCarga) return 0;
    const valorTotal = parseFloat(integratingCarga.valor?.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    return valorTotal - calcularAdiantamento;
  }, [integrateData.adiantamentoEnabled, integratingCarga, calcularAdiantamento]);

  const calcularTotalFinal = useMemo(() => {
    const valorBRL = calcularValorBRL;
    const diarias = integrateData.diariasEnabled ? 
      parseCurrency(integrateData.valorDiarias || '') : 0;
    const valorTotal = integratingCarga ? 
      parseFloat(integratingCarga.valor?.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
    
    const extrasTotal = valorBRL + diarias;

    if (integrateData.adiantamentoEnabled) {
      let baseValue = 0;
      
      if (integrateData.splitOption === 'adiantamento') {
        baseValue = calcularAdiantamento;
      } else if (integrateData.splitOption === 'saldo') {
        baseValue = calcularSaldo;
      } else { // 'ambos' ou fallback
        baseValue = valorTotal;
      }
      
      if (integrateData.splitOption === 'ambos') {
          return valorTotal + extrasTotal;
      }
      
      // Se for 'adiantamento' ou 'saldo', soma os extras apenas à parcela selecionada
      return baseValue + extrasTotal;
      
    } else {
      // Sem adiantamento, o total é o valor da carga + extras
      return valorTotal + extrasTotal;
    }
  }, [integratingCarga, integrateData, calcularAdiantamento, calcularSaldo, calcularValorBRL]);

  const handleDataChange = (field: keyof IntegrateData, value: any) => {
    setIntegrateData(prev => ({ ...prev, [field]: value }));
  };

  // Determina se o botão de integração deve ser desabilitado
  const isIntegrationDisabled = useMemo(() => {
    if (isFullyIntegrated) return true;
    
    // Se for lançamento de Adiantamento, mas Adiantamento já existe
    if (integrateData.splitOption === 'adiantamento' && hasAdiantamento) return true;
    
    // Se for lançamento de Saldo, mas Saldo já existe
    if (integrateData.splitOption === 'saldo' && hasSaldo) return true;
    
    // Se for lançamento de Ambos, mas já existe Adiantamento OU Saldo (o que significa que já foi lançado parcialmente)
    if (integrateData.splitOption === 'ambos' && (hasAdiantamento || hasSaldo)) return true;
    
    // Se for lançamento único (sem adiantamento habilitado), mas já existe qualquer lançamento
    if (!integrateData.adiantamentoEnabled && (hasAdiantamento || hasSaldo || hasFreteUnico)) return true;
    
    return false;
  }, [isFullyIntegrated, integrateData.splitOption, integrateData.adiantamentoEnabled, hasAdiantamento, hasSaldo, hasFreteUnico]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Integrar Financeiro - Carga {integratingCarga.crt || integratingCarga.id}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          {isFullyIntegrated && (
            <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">
                Esta carga já está totalmente integrada ao financeiro.
              </p>
            </div>
          )}
          
          {/* Aviso de Lançamento Parcial */}
          {(hasAdiantamento && !hasSaldo) && (
            <div className="p-4 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Apenas o Adiantamento foi lançado. Você pode lançar o Saldo agora.
              </p>
            </div>
          )}
          {(hasSaldo && !hasAdiantamento) && (
            <div className="p-4 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Apenas o Saldo foi lançado. Você pode lançar o Adiantamento agora.
              </p>
            </div>
          )}

          <div className="space-y-6" style={{ opacity: isFullyIntegrated ? 0.5 : 1, pointerEvents: isFullyIntegrated ? 'none' : 'auto' }}>
            {/* A. Adiantamento */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="mb-4">
                <StandardCheckbox
                  label="Adiantamento (Habilitar cálculo de adiantamento sobre o valor total)"
                  checked={integrateData.adiantamentoEnabled}
                  onChange={(checked) => {
                    handleDataChange('adiantamentoEnabled', checked);
                    // Se desabilitar, reseta a opção de split para 'ambos'
                    if (!checked) {
                        handleDataChange('splitOption', 'ambos');
                    }
                  }}
                  disabled={hasFreteUnico} // Não pode habilitar se já tem frete único
                />
              </div>
              
              {integrateData.adiantamentoEnabled && (
                <div className="space-y-4 ml-7">
                  {/* Seleção de Percentual */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Percentual do Adiantamento
                    </label>
                    <select
                      value={integrateData.adiantamentoPercentual}
                      onChange={(e) => handleDataChange('adiantamentoPercentual', e.target.value)}
                      className="input-field"
                    >
                      <option value="70">70%</option>
                      <option value="80">80%</option>
                    </select>
                  </div>
                  
                  {/* Opção de Split (Adiantamento, Saldo, Ambos) */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Lançamento no Financeiro
                    </label>
                    <div className="space-y-2">
                      <label className={`flex items-center text-sm text-gray-700 dark:text-gray-300 ${hasAdiantamento || hasSaldo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="radio"
                          name="splitOption"
                          value="ambos"
                          checked={integrateData.splitOption === 'ambos'}
                          onChange={(e) => handleDataChange('splitOption', e.target.value as 'ambos' | 'adiantamento' | 'saldo')}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          disabled={hasAdiantamento || hasSaldo}
                        />
                        Adiantamento e Saldo (2 lançamentos)
                      </label>
                      <label className={`flex items-center text-sm text-gray-700 dark:text-gray-300 ${hasAdiantamento ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="radio"
                          name="splitOption"
                          value="adiantamento"
                          checked={integrateData.splitOption === 'adiantamento'}
                          onChange={(e) => handleDataChange('splitOption', e.target.value as 'ambos' | 'adiantamento' | 'saldo')}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          disabled={hasAdiantamento}
                        />
                        Somente Adiantamento (1 lançamento)
                      </label>
                      <label className={`flex items-center text-sm text-gray-700 dark:text-gray-300 ${hasSaldo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="radio"
                          name="splitOption"
                          value="saldo"
                          checked={integrateData.splitOption === 'saldo'}
                          onChange={(e) => handleDataChange('splitOption', e.target.value as 'ambos' | 'adiantamento' | 'saldo')}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          disabled={hasSaldo}
                        />
                        Somente Saldo (1 lançamento)
                      </label>
                    </div>
                  </div>
                  
                  {/* Cálculos Automáticos */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Valor Total da Carga:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(typeof integratingCarga.valor === 'number' ? integratingCarga.valor : parseCurrency(integratingCarga.valor || '0'))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Adiantamento ({integrateData.adiantamentoPercentual}%):</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {formatCurrency(calcularAdiantamento)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Saldo ({100 - (parseFloat(integrateData.adiantamentoPercentual || '0'))}%):</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(calcularSaldo)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Datas de Vencimento */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {integrateData.splitOption !== 'saldo' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Data de Vencimento do Adiantamento
                        </label>
                        <input
                          type="date"
                          value={integrateData.dataVencimentoAdiantamento}
                          onChange={(e) => handleDataChange('dataVencimentoAdiantamento', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    )}
                    {integrateData.splitOption !== 'adiantamento' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Data de Vencimento do Saldo
                        </label>
                        <input
                          type="date"
                          value={integrateData.dataVencimentoSaldo}
                          onChange={(e) => handleDataChange('dataVencimentoSaldo', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* B. Despesas Adicionais */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="mb-4">
                <StandardCheckbox
                  label="Despesas Adicionais (Incluir despesas em pesos argentinos com conversão automática)"
                  checked={integrateData.despesasEnabled}
                  onChange={(checked) => handleDataChange('despesasEnabled', checked)}
                  disabled={hasFreteUnico}
                />
              </div>
              
              {integrateData.despesasEnabled && (
                <div className="space-y-4 ml-7">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Valor adicional em Reais (BRL)
                      </label>
                      <input
                        type="text"
                        value={integrateData.valorBRLExtra}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          handleDataChange('valorBRLExtra', formatted);
                        }}
                        className="input-field"
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Valor em Pesos Argentinos (ARS)
                      </label>
                      <input
                        type="text"
                        value={integrateData.valorARS}
                        onChange={(e) => {
                          const formatted = formatNumberBR(e.target.value);
                          handleDataChange('valorARS', formatted);
                        }}
                        className="input-field"
                        placeholder="$ 0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Taxa de Conversão
                      </label>
                      <input
                        type="text"
                        value={integrateData.taxaConversao}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d.,]/g, '');
                          handleDataChange('taxaConversao', value);
                        }}
                        className="input-field"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Valor em Reais (BRL) - Calculado Automaticamente
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(calcularValorBRL)}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                    />
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total das Despesas Adicionais em BRL: </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(calcularValorBRL)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* C. Diárias */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="mb-4">
                <StandardCheckbox
                  label="Diárias (Incluir valor de diárias em reais)"
                  checked={integrateData.diariasEnabled}
                  onChange={(checked) => handleDataChange('diariasEnabled', checked)}
                  disabled={hasFreteUnico}
                />
              </div>
              
              {integrateData.diariasEnabled && (
                <div className="ml-7">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Valor em Reais (BRL)
                  </label>
                  <input
                    type="text"
                    value={integrateData.valorDiarias}
                    onChange={(e) => {
                      const formatted = formatCurrency(e.target.value);
                      handleDataChange('valorDiarias', formatted);
                    }}
                    className="input-field"
                    placeholder="R$ 0,00"
                  />
                </div>
              )}
            </div>

            {/* Vencimento da Despesa (sem adições) */}
            {(!integrateData.adiantamentoEnabled && !integrateData.despesasEnabled && !integrateData.diariasEnabled) && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data de Vencimento da Despesa
                </label>
                <input
                  type="date"
                  value={integrateData.dataVencimentoDespesa}
                  onChange={(e) => handleDataChange('dataVencimentoDespesa', e.target.value)}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Sem adições: será integrada como despesa no valor total da carga.
                </p>
              </div>
            )}

            {/* D. Opção de Soma (Apenas se houver extras e adiantamento não estiver habilitado ou se o split for 'ambos') */}
            {((integrateData.despesasEnabled || integrateData.diariasEnabled) && integrateData.adiantamentoEnabled && integrateData.splitOption !== 'ambos') && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Onde somar Despesas/Diárias?
                </label>
                <div className="space-y-3">
                  {integrateData.splitOption === 'adiantamento' && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="somaOpcao"
                        value="adiantamento"
                        checked={integrateData.somaOpcao === 'adiantamento'}
                        onChange={(e) => handleDataChange('somaOpcao', e.target.value as 'adiantamento' | 'saldo')}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Somar ao Adiantamento</span>
                    </label>
                  )}
                  {integrateData.splitOption === 'saldo' && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="somaOpcao"
                        value="saldo"
                        checked={integrateData.somaOpcao === 'saldo'}
                        onChange={(e) => handleDataChange('somaOpcao', e.target.value as 'adiantamento' | 'saldo')}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Somar ao Saldo</span>
                    </label>
                  )}
                </div>
              </div>
            )}
            
            {/* D. Opção de Soma (Se não houver adiantamento, mas houver extras) */}
            {((integrateData.despesasEnabled || integrateData.diariasEnabled) && !integrateData.adiantamentoEnabled) && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Despesas e Diárias serão somadas ao valor total da carga em um único lançamento.
                </p>
              </div>
            )}


            {/* Total Final (Apenas para resumo, se houver extras ou se não houver split) */}
            {((integrateData.despesasEnabled || integrateData.diariasEnabled) || !integrateData.adiantamentoEnabled) && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      {integrateData.adiantamentoEnabled && integrateData.splitOption !== 'ambos' ? 'Valor do Lançamento Único:' : 'Total da Carga + Extras:'}
                    </span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(calcularTotalFinal)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {integrateData.adiantamentoEnabled && integrateData.splitOption === 'adiantamento' && 
                      `Adiantamento + Extras (${integrateData.somaOpcao === 'adiantamento' ? 'somados ao adiantamento' : 'somados ao saldo'}).`}
                    {integrateData.adiantamentoEnabled && integrateData.splitOption === 'saldo' && 
                      `Saldo + Extras (${integrateData.somaOpcao === 'saldo' ? 'somados ao saldo' : 'somados ao adiantamento'}).`}
                    {integrateData.adiantamentoEnabled && integrateData.splitOption === 'ambos' && 
                      `Serão criados 2 lançamentos (Adiantamento e Saldo), totalizando o valor da carga + extras.`}
                    {!integrateData.adiantamentoEnabled && 
                      `Valor da Carga + Despesas + Diárias.`}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
          </button>
            <button
              type="button"
              onClick={onIntegrate}
              disabled={isIntegrationDisabled}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Integrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CargaIntegrateModal;