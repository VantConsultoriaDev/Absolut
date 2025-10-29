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

  const jaIntegrada = useMemo(() => {
    return movimentacoes.some(m => m.cargaId === integratingCarga.id);
  }, [movimentacoes, integratingCarga]);

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
      if (integrateData.somaOpcao === 'adiantamento') {
        return calcularAdiantamento + extrasTotal;
      } else {
        return calcularSaldo + extrasTotal;
      }
    } else {
      return valorTotal + extrasTotal;
    }
  }, [integratingCarga, integrateData, calcularAdiantamento, calcularSaldo, calcularValorBRL]);

  const handleDataChange = (field: keyof IntegrateData, value: any) => {
    setIntegrateData(prev => ({ ...prev, [field]: value }));
  };

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
          {jaIntegrada && (
            <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
              <p className="text-sm text-red-700 dark:text-red-400">
                Esta carga já foi integrada ao financeiro. A integração duplicada não é permitida.
              </p>
            </div>
          )}

          <div className="space-y-6" style={{ opacity: jaIntegrada ? 0.5 : 1, pointerEvents: jaIntegrada ? 'none' : 'auto' }}>
            {/* A. Adiantamento */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="mb-4">
                <StandardCheckbox
                  label="Adiantamento"
                  checked={integrateData.adiantamentoEnabled}
                  onChange={(checked) => handleDataChange('adiantamentoEnabled', checked)}
                  description="Habilitar cálculo de adiantamento sobre o valor total"
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
                  </div>
                </div>
              )}
            </div>

            {/* B. Despesas Adicionais */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="mb-4">
                <StandardCheckbox
                  label="Despesas Adicionais"
                  checked={integrateData.despesasEnabled}
                  onChange={(checked) => handleDataChange('despesasEnabled', checked)}
                  description="Incluir despesas em pesos argentinos com conversão automática"
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
                  label="Diárias"
                  checked={integrateData.diariasEnabled}
                  onChange={(checked) => handleDataChange('diariasEnabled', checked)}
                  description="Incluir valor de diárias em reais"
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

            {/* D. Opção de Soma */}
            {(integrateData.adiantamentoEnabled || integrateData.despesasEnabled || integrateData.diariasEnabled) && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Opção de Soma
                </label>
                <div className="space-y-3">
                  {integrateData.adiantamentoEnabled && (
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
                  {integrateData.adiantamentoEnabled && (
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

            {/* Total Final */}
            {(integrateData.adiantamentoEnabled || integrateData.despesasEnabled || integrateData.diariasEnabled) && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Total Final:</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(calcularTotalFinal)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {integrateData.adiantamentoEnabled && integrateData.somaOpcao === 'adiantamento' && 
                      `Adiantamento + Despesas + Diárias`}
                    {integrateData.adiantamentoEnabled && integrateData.somaOpcao === 'saldo' && 
                      `Saldo + Despesas + Diárias`}
                    {!integrateData.adiantamentoEnabled && 
                      `Valor da Carga + Despesas + Diárias`}
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
              disabled={jaIntegrada}
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