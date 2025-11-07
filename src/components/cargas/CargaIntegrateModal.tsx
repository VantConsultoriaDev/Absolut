import React, { useMemo } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import StandardCheckbox from '../StandardCheckbox';
import { formatCurrency, parseCurrency } from '../../utils/formatters';
import { Carga, MovimentacaoFinanceira, IntegrateData, initialIntegrateData } from '../../types'; // Importando IntegrateData e initialIntegrateData

interface CargaIntegrateModalProps {
  isOpen: boolean;
  integratingCarga: Carga | null;
  movimentacoes: MovimentacaoFinanceira[];
  onClose: () => void;
  onIntegrate: () => void;
  integrateData: IntegrateData;
  setIntegrateData: React.Dispatch<React.SetStateAction<IntegrateData>>;
}

// Funções auxiliares para cálculos automáticos
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
  // Assumimos que o componente pai garante que integratingCarga não é null
  if (!integratingCarga) return null; 
  
  const trajetoSelecionado = integratingCarga.trajetos.find(t => t.index === integrateData.trajetoIndex);
  const valorBase = trajetoSelecionado ? parseCurrency(formatCurrency(trajetoSelecionado.valor || 0)) : 0;

  const { hasAdiantamento, hasSaldo, hasFreteUnico, isFullyIntegrated } = useMemo(() => {
    if (integrateData.trajetoIndex === undefined) {
        return { hasAdiantamento: false, hasSaldo: false, hasFreteUnico: false, isFullyIntegrated: false };
    }
    
    const relatedMovs = movimentacoes.filter(m => m.cargaId === integratingCarga.id && m.trajetoIndex === integrateData.trajetoIndex && m.categoria === 'FRETE');
    const adto = relatedMovs.some(m => m.descricao.startsWith('Adto -'));
    const saldo = relatedMovs.some(m => m.descricao.startsWith('Saldo -'));
    const freteUnico = relatedMovs.some(m => m.descricao.startsWith('Frete -'));
    
    // Considera totalmente integrado se houver Frete Único OU Adto E Saldo
    const fullyIntegrated = freteUnico || (adto && saldo);
    
    return { hasAdiantamento: adto, hasSaldo: saldo, hasFreteUnico: freteUnico, isFullyIntegrated: fullyIntegrated };
  }, [movimentacoes, integratingCarga, integrateData.trajetoIndex]);

  // Ajusta o estado inicial da modal com base no que já foi lançado
  React.useEffect(() => {
    if (isOpen && integratingCarga && integrateData.trajetoIndex !== undefined) {
      if (hasFreteUnico) {
        setIntegrateData(prev => ({
          ...prev,
          adiantamentoEnabled: false,
          despesasEnabled: false,
          diariasEnabled: false,
        }));
      } else if (hasAdiantamento && !hasSaldo) {
        setIntegrateData(prev => ({
          ...prev,
          adiantamentoEnabled: true,
          splitOption: 'saldo',
        }));
      } else if (hasSaldo && !hasAdiantamento) {
        setIntegrateData(prev => ({
          ...prev,
          adiantamentoEnabled: true,
          splitOption: 'adiantamento',
        }));
      } else if (hasAdiantamento && hasSaldo) {
        setIntegrateData(prev => ({
          ...prev,
          adiantamentoEnabled: true,
          splitOption: 'ambos',
          despesasEnabled: false,
          diariasEnabled: false,
        }));
      } else {
        // Estado inicial (nada lançado)
        setIntegrateData(prev => ({ ...initialIntegrateData, trajetoIndex: prev.trajetoIndex }));
      }
    }
  }, [isOpen, integratingCarga, integrateData.trajetoIndex, hasAdiantamento, hasSaldo, hasFreteUnico, setIntegrateData]);


  const calcularValorBRL = useMemo(() => {
    if (!integrateData.despesasEnabled) return 0;
    const valorARS = parseCurrency(integrateData.valorARS || '');
    const taxa = parseCurrency(integrateData.taxaConversao || '');
    const extraBRL = parseCurrency(integrateData.valorBRLExtra || '');
    return (valorARS * taxa) + extraBRL;
  }, [integrateData.despesasEnabled, integrateData.valorARS, integrateData.taxaConversao, integrateData.valorBRLExtra]);

  const calcularAdiantamento = useMemo(() => {
    if (!integrateData.adiantamentoEnabled || !integratingCarga || !trajetoSelecionado) return 0;
    const percentual = parseFloat(integrateData.adiantamentoPercentual) / 100;
    return valorBase * percentual;
  }, [integrateData.adiantamentoEnabled, integratingCarga, integrateData.adiantamentoPercentual, valorBase, trajetoSelecionado]);

  const calcularSaldo = useMemo(() => {
    if (!integrateData.adiantamentoEnabled || !integratingCarga || !trajetoSelecionado) return 0;
    return valorBase - calcularAdiantamento;
  }, [integrateData.adiantamentoEnabled, integratingCarga, calcularAdiantamento, valorBase, trajetoSelecionado]);
  
  const diariasTotal = integrateData.diariasEnabled ? 
    parseCurrency(integrateData.valorDiarias || '') : 0;
    
  const despesasAdicionaisTotal = calcularValorBRL;
    
  // Extras que serão CONSOLIDADOS (não lançados individualmente)
  const extrasConsolidados = useMemo(() => {
    let total = 0;
    if (integrateData.adiantamentoEnabled) {
        if (integrateData.despesasEnabled && integrateData.splitExtrasOption !== 'individual') {
            total += despesasAdicionaisTotal;
        }
        if (integrateData.diariasEnabled && integrateData.splitDiariasOption !== 'individual') {
            total += diariasTotal;
        }
    }
    return total;
  }, [integrateData.adiantamentoEnabled, integrateData.despesasEnabled, integrateData.splitExtrasOption, despesasAdicionaisTotal, integrateData.diariasEnabled, integrateData.splitDiariasOption, diariasTotal]);

  // Extras que serão LANÇADOS INDIVIDUALMENTE
  const extrasIndividuais = useMemo(() => {
    let total = 0;
    if (integrateData.adiantamentoEnabled) {
        if (integrateData.despesasEnabled && integrateData.splitExtrasOption === 'individual') {
            total += despesasAdicionaisTotal;
        }
        if (integrateData.diariasEnabled && integrateData.splitDiariasOption === 'individual') {
            total += diariasTotal;
        }
    }
    return total;
  }, [integrateData.adiantamentoEnabled, integrateData.despesasEnabled, integrateData.splitExtrasOption, despesasAdicionaisTotal, integrateData.diariasEnabled, integrateData.splitDiariasOption, diariasTotal]);


  const calcularTotalFinal = useMemo(() => {
    if (!integrateData.adiantamentoEnabled) {
      // Lançamento Único de Frete
      const freteBaseMaisDespesas = valorBase + despesasAdicionaisTotal;
      
      if (integrateData.diariasEnabled && integrateData.calculoFreteOption === 'diarias_separadas') {
          // Se diárias separadas, o total é a soma das duas movimentações
          return freteBaseMaisDespesas + diariasTotal;
      }
      // Opção 'Total' (Frete + Despesas + Diárias)
      return freteBaseMaisDespesas + diariasTotal;
    }
    
    // Com adiantamento
    const _isAdiantamento = integrateData.splitOption === 'adiantamento'; // FIX TS6133
    // const parcelaNome = _isAdiantamento ? 'Adiantamento' : 'Saldo'; // REMOVIDO TS6133
    // const parcelaValor = _isAdiantamento ? calcularAdiantamento : calcularSaldo; // REMOVIDO TS6133
    
    if (integrateData.splitOption === 'ambos') {
        // No modo 'ambos', os extras consolidados são somados ao Saldo
        return valorBase + extrasConsolidados;
    }
    
    // Se for lançamento de Adiantamento ou Saldo individualmente (parcela única)
    const baseValue = _isAdiantamento ? calcularAdiantamento : calcularSaldo;
    
    // Verifica se os extras consolidados serão somados a esta parcela
    const shouldSumExtras = (_isAdiantamento && integrateData.somaOpcao === 'adiantamento') ||
                            (!_isAdiantamento && integrateData.somaOpcao === 'saldo');
                            
    return shouldSumExtras ? baseValue + extrasConsolidados : baseValue;
    
  }, [integrateData, calcularAdiantamento, calcularSaldo, valorBase, extrasConsolidados, despesasAdicionaisTotal, diariasTotal]);

  const handleDataChange = (field: keyof IntegrateData, value: any) => {
    setIntegrateData(prev => ({ ...prev, [field]: value }));
  };

  // Determina se o botão de integração deve ser desabilitado
  const isIntegrationDisabled = useMemo(() => {
    if (integrateData.trajetoIndex === undefined) return true;
    if (isFullyIntegrated) return true;
    
    // Se for lançamento de Adiantamento, mas Adiantamento já existe
    if (integrateData.splitOption === 'adiantamento' && hasAdiantamento) return true;
    
    // Se for lançamento de Saldo, mas Saldo já existe
    if (integrateData.splitOption === 'saldo' && hasSaldo) return true;
    
    // Se for lançamento de Ambos, mas já existe Adiantamento OU Saldo (o que significa que já foi lançado parcialmente)
    if (integrateData.splitOption === 'ambos' && (hasAdiantamento || hasSaldo)) return true;
    
    // Se extras estiverem habilitados, mas não houver valor
    if (integrateData.despesasEnabled && despesasAdicionaisTotal === 0 && parseCurrency(integrateData.valorBRLExtra) === 0) return true;
    if (integrateData.diariasEnabled && diariasTotal === 0) return true;
    
    // Se for lançamento único (sem adiantamento habilitado), mas já existe qualquer lançamento
    if (!integrateData.adiantamentoEnabled && (hasAdiantamento || hasSaldo || hasFreteUnico)) return true;
    
    // Se Diárias Separadas estiver selecionado, a data de vencimento das diárias é obrigatória
    if (!integrateData.adiantamentoEnabled && integrateData.diariasEnabled && integrateData.calculoFreteOption === 'diarias_separadas' && !integrateData.dataVencimentoDiarias) return true;
    
    // NOVO: Se Despesas Adicionais for individual, a data é obrigatória
    if (integrateData.adiantamentoEnabled && integrateData.despesasEnabled && integrateData.splitExtrasOption === 'individual' && !integrateData.dataVencimentoExtras) return true;
    
    // NOVO: Se Diárias for individual, a data é obrigatória
    if (integrateData.adiantamentoEnabled && integrateData.diariasEnabled && integrateData.splitDiariasOption === 'individual' && !integrateData.dataVencimentoDiariasIndividual) return true;
    
    return false;
  }, [isFullyIntegrated, integrateData, hasAdiantamento, hasSaldo, hasFreteUnico, despesasAdicionaisTotal, diariasTotal]);

  // --- MENSAGEM DE RESUMO ---
  const getSummaryMessage = () => {
    const extrasConsolidadosDisplay = formatCurrency(extrasConsolidados);
    const extrasIndividuaisDisplay = formatCurrency(extrasIndividuais);
    
    let message = '';
    
    if (!integrateData.adiantamentoEnabled) {
        // Lançamento Único (Frete Total ou Diárias Separadas)
        const freteBaseMaisDespesas = valorBase + despesasAdicionaisTotal;
        
        if (integrateData.diariasEnabled) {
            if (integrateData.calculoFreteOption === 'total') {
                // Opção 'Total' (Frete + Despesas + Diárias)
                return `Será criado 1 lançamento de Despesa (Frete) no valor de ${formatCurrency(calcularTotalFinal)}. Diárias (${formatCurrency(diariasTotal)}) consolidadas.`;
            } else {
                // Opção 'Diárias separadas'
                return `Serão criados 2 lançamentos de Despesa: 1 de Frete (${formatCurrency(freteBaseMaisDespesas)}) e 1 de Diárias (${formatCurrency(diariasTotal)}).`;
            }
        }
        
        // Sem diárias habilitadas
        return `Será criado 1 lançamento de Despesa (Frete) no valor de ${formatCurrency(calcularTotalFinal)}.`;
    }
    
    // Com Adiantamento (Split)
    const _isAdiantamento = integrateData.splitOption === 'adiantamento'; // FIX TS6133
    // const parcelaNome = _isAdiantamento ? 'Adiantamento' : 'Saldo'; // REMOVIDO TS6133
    // const parcelaValor = _isAdiantamento ? calcularAdiantamento : calcularSaldo; // REMOVIDO TS6133
    
    let numMovs = 0;
    if (integrateData.splitOption === 'ambos') numMovs = 2;
    if (integrateData.splitOption === 'adiantamento' || integrateData.splitOption === 'saldo') numMovs = 1;
    
    if (extrasIndividuais > 0) {
        numMovs += (integrateData.despesasEnabled && integrateData.splitExtrasOption === 'individual' ? 1 : 0);
        numMovs += (integrateData.diariasEnabled && integrateData.splitDiariasOption === 'individual' ? 1 : 0);
    }
    
    message = `Serão criados ${numMovs} lançamentos.`;
    
    if (extrasConsolidados > 0) {
        if (integrateData.splitOption === 'ambos') {
            message += ` Extras consolidados (${extrasConsolidadosDisplay}) somados ao Saldo.`;
        } else {
            const target = _isAdiantamento ? 'Adiantamento' : 'Saldo';
            message += ` Extras consolidados (${extrasConsolidadosDisplay}) somados ao ${target}.`;
        }
    }
    
    if (extrasIndividuais > 0) {
        message += ` ${extrasIndividuaisDisplay} serão lançados individualmente.`;
    }
    
    return message;
  };
  // --- FIM MENSAGEM DE RESUMO ---


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
            {/* Seleção de Trajeto (Apenas se houver mais de um) */}
            {integratingCarga.trajetos.length > 1 && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Selecione o Trajeto para Integração *
                    </label>
                    <select
                        value={integrateData.trajetoIndex || ''}
                        onChange={(e) => handleDataChange('trajetoIndex', parseInt(e.target.value))}
                        className="input-field"
                        required
                    >
                        <option value="">Selecione um trajeto</option>
                        {integratingCarga.trajetos.map(t => (
                            <option key={t.index} value={t.index}>
                                Trajeto {t.index}: {t.ufOrigem} → {t.ufDestino} ({formatCurrency(t.valor)})
                            </option>
                        ))}
                    </select>
                </div>
            )}
            
            {trajetoSelecionado && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                        Integrando Trajeto {trajetoSelecionado.index}. Valor base: <span className="font-bold">{formatCurrency(valorBase)}</span>
                    </p>
                </div>
            )}

          {isFullyIntegrated && (
            <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">
                Este trajeto já está totalmente integrado ao financeiro.
              </p>
            </div>
          )}
          
          {/* Aviso de Lançamento Parcial */}
          {(hasAdiantamento && !hasSaldo) && (
            <div className="p-4 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Apenas o Adiantamento foi lançado para este trajeto. Você pode lançar o Saldo agora.
              </p>
            </div>
          )}
          {(hasSaldo && !hasAdiantamento) && (
            <div className="p-4 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Apenas o Saldo foi lançado para este trajeto. Você pode lançar o Adiantamento agora.
              </p>
            </div>
          )}

          <div className="space-y-6" style={{ opacity: integrateData.trajetoIndex === undefined || isFullyIntegrated ? 0.5 : 1, pointerEvents: integrateData.trajetoIndex === undefined || isFullyIntegrated ? 'none' : 'auto' }}>
            {/* A. Adiantamento */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="mb-4">
                <StandardCheckbox
                  label="Adiantamento"
                  checked={integrateData.adiantamentoEnabled}
                  onChange={(checked) => {
                    handleDataChange('adiantamentoEnabled', checked);
                    if (!checked) {
                        handleDataChange('splitOption', 'ambos');
                    }
                  }}
                  disabled={hasFreteUnico}
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
                        <span className="text-gray-600 dark:text-gray-400">Valor Base do Trajeto:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(valorBase)}
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
                  label="Despesas Adicionais"
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
                  
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total das Despesas Adicionais em BRL: </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(despesasAdicionaisTotal)}
                      </span>
                    </div>
                  </div>
                  
                  {/* NOVO: Opção de Split para Despesas Adicionais (Apenas se Adiantamento estiver habilitado) */}
                  {integrateData.adiantamentoEnabled && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Lançamento das Despesas Adicionais
                      </label>
                      <select
                        value={integrateData.splitExtrasOption}
                        onChange={(e) => handleDataChange('splitExtrasOption', e.target.value as 'adiantamento' | 'saldo' | 'individual')}
                        className="input-field"
                      >
                        <option value="saldo">Somar ao Saldo</option>
                        <option value="adiantamento">Somar ao Adiantamento</option>
                        <option value="individual">Lançamento individual</option>
                      </select>
                      
                      {integrateData.splitExtrasOption === 'individual' && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Data de Vencimento (Despesa Individual) *
                          </label>
                          <input
                            type="date"
                            value={integrateData.dataVencimentoExtras}
                            onChange={(e) => handleDataChange('dataVencimentoExtras', e.target.value)}
                            className="input-field"
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}
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
                  disabled={hasFreteUnico}
                />
              </div>
              
              {integrateData.diariasEnabled && (
                <div className="ml-7 space-y-4">
                  <div>
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
                  
                  {/* NOVO CAMPO: Seleção da forma de cálculo (Apenas se Adiantamento NÃO estiver habilitado) */}
                  {!integrateData.adiantamentoEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Selecione a forma de cálculo *
                      </label>
                      <select
                        value={integrateData.calculoFreteOption}
                        onChange={(e) => handleDataChange('calculoFreteOption', e.target.value as 'total' | 'diarias_separadas')}
                        className="input-field"
                        required
                      >
                        <option value="total">Total ({formatCurrency(valorBase + despesasAdicionaisTotal + diariasTotal)})</option>
                        <option value="diarias_separadas">Diárias separadas ({formatCurrency(valorBase + despesasAdicionaisTotal)} + {formatCurrency(diariasTotal)})</option>
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Se "Total" for selecionado, o valor das diárias será incluído no lançamento de Frete.
                      </p>
                    </div>
                  )}
                  
                  {/* NOVO CAMPO: Data de Vencimento das Diárias (Apenas se Diárias Separadas estiver selecionado) */}
                  {!integrateData.adiantamentoEnabled && integrateData.calculoFreteOption === 'diarias_separadas' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Data de Vencimento das Diárias *
                      </label>
                      <input
                        type="date"
                        value={integrateData.dataVencimentoDiarias}
                        onChange={(e) => handleDataChange('dataVencimentoDiarias', e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                  )}
                  
                  {/* NOVO: Opção de Split para Diárias (Apenas se Adiantamento estiver habilitado) */}
                  {integrateData.adiantamentoEnabled && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Lançamento das Diárias
                      </label>
                      <select
                        value={integrateData.splitDiariasOption}
                        onChange={(e) => handleDataChange('splitDiariasOption', e.target.value as 'adiantamento' | 'saldo' | 'individual')}
                        className="input-field"
                      >
                        <option value="saldo">Somar ao Saldo</option>
                        <option value="adiantamento">Somar ao Adiantamento</option>
                        <option value="individual">Lançamento individual</option>
                      </select>
                      
                      {integrateData.splitDiariasOption === 'individual' && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Data de Vencimento (Diária Individual) *
                          </label>
                          <input
                            type="date"
                            value={integrateData.dataVencimentoDiariasIndividual}
                            onChange={(e) => handleDataChange('dataVencimentoDiariasIndividual', e.target.value)}
                            className="input-field"
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* D. Opção de Soma dos Extras (Apenas se Adiantamento estiver ativo E não for split 'ambos') */}
            {integrateData.adiantamentoEnabled && extrasConsolidados > 0 && integrateData.splitOption !== 'ambos' && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Onde somar Extras Consolidados ({formatCurrency(extrasConsolidados)})?
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="somaOpcao"
                      value="adiantamento"
                      checked={integrateData.somaOpcao === 'adiantamento'}
                      onChange={(e) => handleDataChange('somaOpcao', e.target.value as 'adiantamento' | 'saldo')}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Somar ao Adiantamento ({formatCurrency(integrateData.somaOpcao === 'adiantamento' ? calcularAdiantamento + extrasConsolidados : calcularAdiantamento)})</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="somaOpcao"
                      value="saldo"
                      checked={integrateData.somaOpcao === 'saldo'}
                      onChange={(e) => handleDataChange('somaOpcao', e.target.value as 'adiantamento' | 'saldo')}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Somar ao Saldo ({formatCurrency(integrateData.somaOpcao === 'saldo' ? calcularSaldo + extrasConsolidados : calcularSaldo)})</span>
                  </label>
                </div>
              </div>
            )}
            
            {/* Vencimento da Despesa (sem adições) */}
            {(!integrateData.adiantamentoEnabled && (integrateData.despesasEnabled || integrateData.diariasEnabled)) && (
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
                  Esta data será usada para o lançamento de Frete (e Diárias, se consolidadas).
                </p>
              </div>
            )}

            {/* D. Opção de Soma (Se não houver adiantamento, mas houver extras) */}
            {((integrateData.despesasEnabled || integrateData.diariasEnabled) && !integrateData.adiantamentoEnabled) && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {integrateData.diariasEnabled && integrateData.calculoFreteOption === 'diarias_separadas' ? 
                    `O Frete (${formatCurrency(valorBase + despesasAdicionaisTotal)}) e as Diárias (${formatCurrency(diariasTotal)}) serão lançados separadamente.` :
                    `O valor total de ${formatCurrency(calcularTotalFinal)} (Frete + Extras) será lançado em uma única movimentação.`
                  }
                </p>
              </div>
            )}


            {/* Total Final (Apenas para resumo, se houver extras ou se não houver split) */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    {integrateData.adiantamentoEnabled && integrateData.splitOption !== 'ambos' ? 'Valor do Lançamento Único:' : 'Total do Lançamento(s):'}
                  </span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(calcularTotalFinal)}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {getSummaryMessage()}
                </div>
              </div>
            </div>
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