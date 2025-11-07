import React, { useMemo, useState, useEffect } from 'react';
import { X, AlertTriangle, Plus, Minus } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { formatCurrency, parseCurrency } from '../../utils/formatters';
import { Cliente, Trajeto } from '../../types';
import StandardCheckbox from '../StandardCheckbox';
import { UFS_BRASIL, UFS_ESTRANGEIRAS } from '../../utils/cargasConstants';
import CityAutocompleteInput from '../CityAutocompleteInput';

// Define a form-specific Trajeto type where valor is a string and dates are required strings
export interface TrajetoForm extends Omit<Trajeto, 'valor' | 'dataColeta' | 'dataEntrega'> {
  valor: string;
  dataColeta: string;
  dataEntrega: string;
}

// Define a estrutura de dados do formulário, incluindo a lista de trajetos
export interface CargaFormData {
  crt: string;
  clienteId?: string;
  dataColeta: string; // Global dates are kept for compatibility but not used in logic
  dataEntrega: string; // Global dates are kept for compatibility but não used in logic
  peso: string;
  observacoes: string;
  status: 'entregue' | 'em_transito' | 'a_coletar' | 'armazenada' | 'cancelada';
  
  // Novos campos para transbordo
  transbordo: 'sem_transbordo' | 'com_transbordo';
  trajetos: TrajetoForm[];
  
  // NOVO CAMPO
  tipoOperacao: 'importacao' | 'exportacao';
}

interface CargaFormModalProps {
  isOpen: boolean;
  formData: CargaFormData;
  editingCarga: any;
  clientes: Cliente[];
  ufsOrdenadas: { value: string; label: string }[];
  hasUnsavedChanges: boolean;
  onClose: () => void;
  onFormChange: (field: keyof CargaFormData, value: any) => void;
  onTrajetoChange: (index: number, field: keyof TrajetoForm, value: string) => void;
  onAddTrajeto: () => void;
  onRemoveTrajeto: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onConfirmCancel: () => void;
  showCancelConfirm: boolean;
  setShowCancelConfirm: (show: boolean) => void;
}

const CargaFormModal: React.FC<CargaFormModalProps> = ({
  isOpen,
  formData,
  editingCarga,
  clientes,
  ufsOrdenadas,
  hasUnsavedChanges,
  onClose,
  onFormChange,
  onTrajetoChange,
  onAddTrajeto,
  onRemoveTrajeto,
  onSubmit,
  onConfirmCancel,
  showCancelConfirm,
  setShowCancelConfirm
}) => {
  const { modalRef } = useModal({
    isOpen,
    onClose: onClose,
    closeOnOutsideClick: !hasUnsavedChanges,
    closeOnEscape: !hasUnsavedChanges,
  });
  
  // NOVO ESTADO: Apenas para o sufixo numérico do CRT
  const [crtSuffix, setCrtSuffix] = useState('');
  
  // Efeito para inicializar o crtSuffix ao editar
  useEffect(() => {
      if (editingCarga && formData.crt) {
          // Tenta extrair o sufixo numérico do CRT completo
          const prefix = getCrtPrefix(formData.trajetos[0]?.ufOrigem, formData.trajetos[formData.trajetos.length - 1]?.ufDestino);
          if (formData.crt.startsWith(prefix)) {
              setCrtSuffix(formData.crt.substring(prefix.length));
          } else {
              // Se não for um CRT padrão, usa o CRT completo como sufixo (fallback)
              setCrtSuffix(formData.crt);
          }
      } else if (!editingCarga) {
          setCrtSuffix('');
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCarga, formData.crt]);
  
  // 1. Função para calcular o prefixo do CRT
  const getCrtPrefix = (ufOrigem: string | undefined, ufDestino: string | undefined): string => {
      if (!ufOrigem && !ufDestino) return '';
      
      // Regra 1: UF ORIGEM é Argentina, Chile ou Uruguai
      if (ufOrigem === 'AR') return 'BR5708';
      if (ufOrigem === 'CL') return 'BR5846';
      if (ufOrigem === 'UY') return 'BR5709';
      
      // Regra 2: UF ORIGEM não é estrangeira, mas UF DESTINO é Argentina ou Chile
      if (ufDestino === 'AR') return 'AR5708';
      if (ufDestino === 'CL') return 'CL5846';
      
      return '';
  };
  
  // 2. Valor total do CRT (Prefix + Suffix)
  const fullCrt = useMemo(() => {
      const ufOrigem = formData.trajetos[0]?.ufOrigem;
      const ufDestino = formData.trajetos[formData.trajetos.length - 1]?.ufDestino;
      const prefix = getCrtPrefix(ufOrigem, ufDestino);
      
      // Se não houver prefixo, o CRT é o sufixo (ou vazio)
      if (!prefix) return crtSuffix;
      
      // Se houver prefixo, concatena com o sufixo (apenas números)
      const cleanSuffix = crtSuffix.replace(/\D/g, '').slice(0, 6);
      return prefix + cleanSuffix;
  }, [formData.trajetos, crtSuffix]);
  
  // 3. Atualiza o CRT no formData sempre que o fullCrt mudar
  useEffect(() => {
      onFormChange('crt', fullCrt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullCrt]);


  // Calcula o valor total da carga somando os trajetos
  const valorTotalCarga = useMemo(() => {
    return formData.trajetos.reduce((sum, trajeto) => sum + parseCurrency(trajeto.valor || '0'), 0);
  }, [formData.trajetos]);

  // Função auxiliar para determinar se é um país estrangeiro
  const isForeignCountry = (uf: string) => UFS_ESTRANGEIRAS.some(u => u.value === uf);
  
  // Estado booleano derivado para o checkbox
  const isTransbordoEnabled = formData.transbordo === 'com_transbordo';
  
  // Opções de UF de Origem filtradas
  const filteredUfOrigemOptions = useMemo(() => {
      if (formData.tipoOperacao === 'importacao') {
          // Importação: Origem deve ser um país estrangeiro
          return UFS_ESTRANGEIRAS;
      }
      // Exportação: Origem deve ser uma UF brasileira
      return UFS_BRASIL;
  }, [formData.tipoOperacao]);

  const handleTransbordoToggle = (checked: boolean) => {
    const newTransbordo = checked ? 'com_transbordo' : 'sem_transbordo';
    onFormChange('transbordo', newTransbordo);
    
    // Lógica de consolidação/expansão
    if (!checked && formData.trajetos.length > 1) {
      // Transição: Com Transbordo -> Sem Transbordo (Consolidar)
      
      // 1. Pega o primeiro e o último trajeto para definir a rota consolidada
      const primeiroTrajeto = formData.trajetos[0];
      const ultimoTrajeto = formData.trajetos[formData.trajetos.length - 1];
      
      // 2. Calcula o valor total
      const totalValue = formData.trajetos.reduce((sum, t) => sum + parseCurrency(t.valor || '0'), 0);
      
      // 3. Cria o trajeto consolidado (usando o primeiro trajeto como base para o array)
      const consolidatedTrajeto: TrajetoForm = {
          ...primeiroTrajeto,
          ufDestino: ultimoTrajeto.ufDestino,
          cidadeDestino: ultimoTrajeto.cidadeDestino,
          valor: formatCurrency(totalValue),
          // Datas globais são a coleta do primeiro e a entrega do último
          dataEntrega: ultimoTrajeto.dataEntrega,
      };
      
      // 4. Aplica a mudança no estado (forçando o array a ter apenas 1 elemento)
      onFormChange('trajetos', [consolidatedTrajeto]);
      
    } else if (checked && formData.trajetos.length === 0) {
        // Transição: Sem Transbordo -> Com Transbordo (Garantir 1 trajeto)
        onAddTrajeto();
    }
  };
  
  // Função auxiliar para obter o sufixo do rótulo
  const getLabelSuffix = (index: number) => {
      if (isTransbordoEnabled) {
          return ` Trajeto ${index}`;
      }
      // Se não houver transbordo, e for o primeiro trajeto (index 1), não mostra sufixo
      return '';
  };
  
  // Verifica se o CRT deve ser gerado automaticamente
  const shouldGenerateCrt = useMemo(() => {
      const ufOrigem = formData.trajetos[0]?.ufOrigem;
      const ufDestino = formData.trajetos[formData.trajetos.length - 1]?.ufDestino;
      return !!getCrtPrefix(ufOrigem, ufDestino);
  }, [formData.trajetos]);
  
  const crtPrefix = useMemo(() => {
      const ufOrigem = formData.trajetos[0]?.ufOrigem;
      const ufDestino = formData.trajetos[formData.trajetos.length - 1]?.ufDestino;
      return getCrtPrefix(ufOrigem, ufDestino);
  }, [formData.trajetos]);


  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          ref={modalRef}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto mx-4"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCarga ? 'Editar Carga' : 'Nova Carga'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Seção 1: Dados Básicos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* NOVO CAMPO: Tipo de Operação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Operação *
                  </label>
                  <select
                    value={formData.tipoOperacao}
                    onChange={(e) => onFormChange('tipoOperacao', e.target.value as CargaFormData['tipoOperacao'])}
                    className="input-field"
                    required
                  >
                    <option value="exportacao">Exportação</option>
                    <option value="importacao">Importação</option>
                  </select>
                </div>
                
                {/* Cliente */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cliente
                  </label>
                  <select
                    value={formData.clienteId || ''}
                    onChange={(e) => onFormChange('clienteId', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.tipo === 'PJ' && c.nomeFantasia ? c.nomeFantasia : c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => onFormChange('status', e.target.value as CargaFormData['status'])}
                    className="input-field"
                    required
                  >
                    <option value="a_coletar">À coletar</option>
                    <option value="em_transito">Em trânsito</option>
                    <option value="armazenada">Armazenada</option>
                    <option value="entregue">Entregue</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>
              
              {/* Seção 2: Transbordo (Checkbox) */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">Configuração de Trajeto</h4>
                
                {/* Checkbox de Transbordo */}
                <StandardCheckbox
                  label="Transbordo (Múltiplos Trajetos)"
                  checked={isTransbordoEnabled}
                  onChange={handleTransbordoToggle}
                  className="bg-white dark:bg-gray-800 p-0" // Remove o fundo cinza interno
                />
                
                {/* Renderização Dinâmica dos Trajetos */}
                {formData.trajetos.map((trajeto, index) => {
                  const isOrigemForeign = isForeignCountry(trajeto.ufOrigem);
                  const isDestinoForeign = isForeignCountry(trajeto.ufDestino);
                  const isOrigemDisabled = isTransbordoEnabled && index > 0;
                  
                  return (
                  <div key={trajeto.index} className={`p-4 border rounded-lg ${index > 0 ? 'mt-4 border-blue-200 dark:border-blue-700' : 'border-gray-100 dark:border-gray-700'}`}>
                    
                    {/* Cabeçalho do Trajeto (Mostra índice apenas se Transbordo estiver ativo) */}
                    {isTransbordoEnabled && (
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                            Trajeto {trajeto.index}
                          </h5>
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => onRemoveTrajeto(index)}
                              className="text-red-500 hover:text-red-700 p-1 rounded"
                              title="Remover Trajeto"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Origem */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            UF Origem{getLabelSuffix(trajeto.index)} *
                          </label>
                          <select
                            value={trajeto.ufOrigem}
                            onChange={(e) => {
                              onTrajetoChange(index, 'ufOrigem', e.target.value);
                              // Limpa a cidade se a UF mudar
                              onTrajetoChange(index, 'cidadeOrigem', '');
                            }}
                            className="input-field"
                            required
                            // A UF de origem só pode ser alterada no primeiro trajeto
                            disabled={isOrigemDisabled} 
                          >
                            <option value="">Selecione a UF de origem</option>
                            {filteredUfOrigemOptions.map((uf) => (
                              <option key={uf.value} value={uf.value}>
                                {uf.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {trajeto.ufOrigem && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {isOrigemForeign ? 'Cidade/Local Origem' : 'Cidade Origem'}
                            </label>
                            
                            {isOrigemForeign ? (
                                <input
                                  type="text"
                                  value={trajeto.cidadeOrigem}
                                  onChange={(e) => onTrajetoChange(index, 'cidadeOrigem', e.target.value)}
                                  placeholder={'Digite a cidade/local'}
                                  className="input-field"
                                  disabled={isOrigemDisabled}
                                />
                            ) : (
                                <CityAutocompleteInput
                                    uf={trajeto.ufOrigem}
                                    value={trajeto.cidadeOrigem}
                                    onChange={(city) => onTrajetoChange(index, 'cidadeOrigem', city)}
                                    placeholder={'Digite a cidade'}
                                    disabled={isOrigemDisabled}
                                />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Destino */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            UF Destino{getLabelSuffix(trajeto.index)} *
                          </label>
                          <select
                            value={trajeto.ufDestino}
                            onChange={(e) => {
                                onTrajetoChange(index, 'ufDestino', e.target.value);
                                // Limpa a cidade se a UF mudar
                                onTrajetoChange(index, 'cidadeDestino', '');
                            }}
                            className="input-field"
                            required
                          >
                            <option value="">Selecione a UF de destino</option>
                            {/* O destino pode ser qualquer UF/País */}
                            {ufsOrdenadas.map((uf) => (
                              <option key={uf.value} value={uf.value}>
                                {uf.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {trajeto.ufDestino && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {isDestinoForeign ? 'Cidade/Local Destino' : 'Cidade Destino'}
                            </label>
                            
                            {isDestinoForeign ? (
                                <input
                                  type="text"
                                  value={trajeto.cidadeDestino}
                                  onChange={(e) => onTrajetoChange(index, 'cidadeDestino', e.target.value)}
                                  placeholder={'Digite a cidade/local'}
                                  className="input-field"
                                />
                            ) : (
                                <CityAutocompleteInput
                                    uf={trajeto.ufDestino}
                                    value={trajeto.cidadeDestino}
                                    onChange={(city) => onTrajetoChange(index, 'cidadeDestino', city)}
                                    placeholder={'Digite a cidade'}
                                    disabled={false}
                                />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Datas do Trajeto */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Data Coleta{getLabelSuffix(trajeto.index)}
                            </label>
                            <input
                                type="date"
                                value={trajeto.dataColeta}
                                onChange={(e) => onTrajetoChange(index, 'dataColeta', e.target.value)}
                                className="input-field"
                                // REMOVIDO: required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Data Entrega{getLabelSuffix(trajeto.index)}
                            </label>
                            <input
                                type="date"
                                value={trajeto.dataEntrega}
                                onChange={(e) => onTrajetoChange(index, 'dataEntrega', e.target.value)}
                                className="input-field"
                                // REMOVIDO: required
                            />
                        </div>
                        
                        {/* Valor do Trajeto */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Valor Trajeto{getLabelSuffix(trajeto.index)} (R$) *
                            </label>
                            <input
                                type="text"
                                value={trajeto.valor}
                                onChange={(e) => {
                                    const formatted = formatCurrency(e.target.value);
                                    onTrajetoChange(index, 'valor', formatted);
                                }}
                                className="input-field"
                                placeholder="R$ 0,00"
                                required
                            />
                        </div>
                    </div>
                  </div>
                );
                })}
                
                {/* Botão Adicionar Trajeto */}
                {isTransbordoEnabled && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={onAddTrajeto}
                      className="btn-secondary text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Plus className="h-5 w-5" />
                      Adicionar Transbordo (Trajeto {formData.trajetos.length + 1})
                    </button>
                  </div>
                )}
              </div>
              
              {/* Seção 3: Peso e CRT (REORGANIZADA) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Peso */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Peso (toneladas) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.peso}
                    onChange={(e) => onFormChange('peso', e.target.value)}
                    className="input-field"
                    placeholder="0.00"
                    max={1000}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Máximo 1000 toneladas</p>
                </div>
                
                {/* CRT (NOVO LAYOUT) */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CRT {shouldGenerateCrt ? '(Automático)' : ''}
                    </label>
                    <div className="flex">
                        {shouldGenerateCrt && (
                            <div className="flex items-center bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg px-3 text-sm font-mono text-gray-700 dark:text-gray-300">
                                {crtPrefix}
                            </div>
                        )}
                        <input
                            type="text"
                            value={crtSuffix}
                            onChange={(e) => {
                                // Permite apenas números e limita a 6 dígitos
                                const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setCrtSuffix(cleanValue);
                            }}
                            placeholder={shouldGenerateCrt ? 'XXXXXX' : 'CRT Manual'}
                            className={`input-field font-mono ${shouldGenerateCrt ? 'rounded-l-none' : ''}`}
                            maxLength={shouldGenerateCrt ? 6 : 10}
                            disabled={!shouldGenerateCrt && editingCarga} // Desabilita edição manual se já existe CRT
                        />
                    </div>
                    {shouldGenerateCrt && (
                        <p className="text-xs text-gray-500 mt-1">CRT Completo: {fullCrt}</p>
                    )}
                    {!shouldGenerateCrt && (
                        <p className="text-xs text-gray-500 mt-1">CRT Manual (Máx. 10 caracteres)</p>
                    )}
                </div>
              </div>
              
              {/* Valor Total Calculado */}
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Valor Total da Carga (Soma dos Trajetos):
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(valorTotalCarga)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => onFormChange('observacoes', e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Observações adicionais..."
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  {editingCarga ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de confirmação para cancelar */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirmar Cancelamento
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Você tem alterações não salvas. Tem certeza que deseja cancelar? Todas as alterações serão perdidas.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Continuar Editando
              </button>
              <button
                onClick={onConfirmCancel}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Descartar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CargaFormModal;