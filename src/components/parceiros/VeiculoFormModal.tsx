import React, { useMemo } from 'react';
import { X, RefreshCw, CheckCircle, Truck, FileText, AlertTriangle } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { Parceiro, Veiculo, PermissoInternacional } from '../../types';
import { formatPlaca, forceUpperCase, formatDocument, parseDocument } from '../../utils/formatters';
import { format, isValid } from 'date-fns';

// Tipagem para o formulário (string para campos numéricos)
// NOTE: Esta interface deve ser mantida em sincronia com a definição em Parceiros.tsx
export interface VeiculoFormData extends Omit<Veiculo, 'id' | 'createdAt' | 'updatedAt' | 'parceiroId' | 'permisso' | 'ano' | 'capacidade'> {
  parceiroId: string;
  ano: string;
  capacidade: string;
  
  // Permisso fields (NOVO)
  permissoRazaoSocial: string;
  permissoNomeFantasia: string;
  permissoCnpj: string;
  permissoEnderecoCompleto: string;
  permissoSimulado: boolean;
  permissoDataConsulta: Date | undefined;
  permissoChassiAtualizado: string | undefined;
}

interface VeiculoFormModalProps {
  isOpen: boolean;
  parceiroId: string;
  parceiros: Parceiro[];
  formData: VeiculoFormData;
  setFormData: React.Dispatch<React.SetStateAction<VeiculoFormData>>;
  editingId: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  consultandoPlaca: boolean;
  placaConsultada: boolean;
  placaError: string;
  handlePlacaConsultation: (placa: string, tipo: string) => void;
  
  // NOVO: Props para Permisso
  consultandoPermisso: boolean;
  permissoError: string;
  handlePermissoConsultation: (placa: string) => void;
}

const VeiculoFormModal: React.FC<VeiculoFormModalProps> = ({
  isOpen,
  parceiroId,
  parceiros,
  formData,
  setFormData,
  editingId,
  onClose,
  onSubmit,
  consultandoPlaca,
  placaConsultada,
  placaError,
  handlePlacaConsultation,
  
  // NOVO: Permisso Props
  consultandoPermisso,
  permissoError,
  handlePermissoConsultation,
}) => {
  const { modalRef } = useModal({ isOpen, onClose });
  
  const parceiroProprietario = useMemo(() => parceiros.find(p => p.id === parceiroId), [parceiros, parceiroId]);

  // Lógica de Placa
  const placaField = useMemo(() => {
    if (formData.tipo === 'Cavalo') return 'placaCavalo';
    if (formData.tipo === 'Carreta') return 'placaCarreta';
    return 'placa';
  }, [formData.tipo]);
  
  // A placa no estado já está sem hífen (graças ao formatPlaca no onChange)
  const placaValue = formData[placaField] || '';

  // Handler unificado para Placa (Cavalo, Truck, Carreta)
  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // 1. Limpa o valor para obter apenas caracteres alfanuméricos e limita a 7
    const placaLimpa = value.replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 7);
    
    // 2. Aplica formatação de placa (que agora retorna sem hífen)
    const formatted = formatPlaca(value); 
    
    // 3. Atualiza o estado com o valor formatado (sem hífen)
    setFormData(prev => ({ ...prev, [placaField]: formatted }));
    
    // 4. Dispara a consulta se a placa estiver completa (7 caracteres alfanuméricos)
    if (placaLimpa.length === 7 && !consultandoPlaca) {
        // Passamos a placa limpa para a consulta
        handlePlacaConsultation(placaLimpa, formData.tipo);
    }
  };
  
  // Handler para forçar maiúsculas no blur (para todos os campos de placa)
  const handlePlacaBlur = () => {
    // Garante que o valor final seja limpo e em maiúsculas (formatPlaca já faz isso)
    const finalFormatted = formatPlaca(placaValue);
    setFormData(prev => ({ ...prev, [placaField]: finalFormatted }));
  };
  
  // Determina se o campo de carroceria deve ser exibido
  const showCarroceria = formData.tipo === 'Truck';
  
  // Determina se a seção Permisso deve ser exibida (apenas Cavalo ou Truck)
  const showPermissoSection = formData.tipo === 'Cavalo' || formData.tipo === 'Truck';
  
  // Handler para mudança nos campos do Permisso
  const handlePermissoChange = (field: keyof VeiculoFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handler para o botão Sincronizar Permisso
  const handleSyncPermisso = () => {
    const placa = formData.placa || formData.placaCavalo || formData.placaCarreta;
    if (!placa || placa.replace(/[^A-Z0-9]/gi, '').length < 7) {
        setPlacaError('Preencha a placa corretamente antes de sincronizar o Permisso.');
        return;
    }
    // Passa a placa limpa para a consulta
    handlePermissoConsultation(placa.replace(/[^A-Z0-9]/gi, ''));
  };
  
  const isPermissoDataLoaded = !!formData.permissoRazaoSocial || !!formData.permissoCnpj;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto mx-4">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? 'Editar Veículo' : 'Novo Veículo'}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Informação do Parceiro Proprietário (Fixo) */}
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center gap-3">
                <Truck className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Parceiro Proprietário: <span className="font-semibold">{parceiroProprietario?.nome || 'N/A'}</span>
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              
              {/* Seção 1: Detalhes do Veículo */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">Detalhes do Veículo</h4>
                
                {/* Tipo de Veículo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Veículo *</label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          tipo: e.target.value as VeiculoFormData['tipo'], 
                          placa: '', 
                          placaCavalo: '', 
                          placaCarreta: '', 
                          chassis: '',
                          // Limpa Permisso ao mudar o tipo
                          permissoRazaoSocial: '',
                          permissoNomeFantasia: '',
                          permissoCnpj: '',
                          permissoEnderecoCompleto: '',
                          permissoSimulado: false,
                          permissoDataConsulta: undefined,
                          permissoChassiAtualizado: undefined,
                      }))}
                      className="input-field"
                      required
                      disabled={!!editingId}
                    >
                      <option value="Cavalo">Cavalo</option>
                      <option value="Truck">Truck</option>
                      <option value="Carreta">Carreta</option>
                    </select>
                  </div>
                </div>
                
                {/* Placa e Consulta */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Placa {formData.tipo === 'Cavalo' ? 'Cavalo' : formData.tipo === 'Carreta' ? 'Carreta' : 'Truck'} *
                    </label>
                    <input
                      type="text"
                      value={placaValue}
                      onChange={handlePlacaChange}
                      onBlur={handlePlacaBlur}
                      className="input-field"
                      placeholder="Ex: ABC1234 ou ABC1D23"
                      required
                    />
                    
                    {/* Mensagens de Status/Erro */}
                    {placaError && <p className="text-xs text-red-600 mt-1">{placaError}</p>}
                    {consultandoPlaca && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Consultando...</p>}
                    {placaConsultada && !consultandoPlaca && <p className="text-xs text-green-600 mt-1 flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Dados consultados automaticamente</p>}
                  </div>
                </div>
                
                {/* Detalhes do Veículo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fabricante</label>
                    <input
                      type="text"
                      value={formData.fabricante}
                      onChange={(e) => setFormData(prev => ({ ...prev, fabricante: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo</label>
                    <input
                      type="text"
                      value={formData.modelo}
                      onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano</label>
                    <input
                      type="number"
                      value={formData.ano}
                      onChange={(e) => setFormData(prev => ({ ...prev, ano: e.target.value }))}
                      className="input-field"
                      maxLength={4}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chassis</label>
                    <input
                      type="text"
                      value={formData.chassis}
                      onChange={(e) => setFormData(prev => ({ ...prev, chassis: e.target.value }))}
                      onBlur={(e) => setFormData(prev => ({ ...prev, chassis: forceUpperCase(e.target.value) }))}
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacidade (t)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.capacidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacidade: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  
                  {/* Carroceria (apenas para Truck) */}
                  {showCarroceria && (
                      <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carroceria</label>
                          <input
                              type="text"
                              value={formData.carroceria}
                              onChange={(e) => setFormData(prev => ({ ...prev, carroceria: e.target.value }))}
                              className="input-field"
                          />
                      </div>
                  )}
                </div>
              </div>
              
              {/* Seção 2: Permisso Internacional (Apenas Cavalo/Truck) */}
              {showPermissoSection && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      Dados do Permisso Internacional (Opcional)
                    </h4>
                    <button
                      type="button"
                      onClick={handleSyncPermisso}
                      disabled={consultandoPermisso}
                      className="btn-secondary text-sm px-3 py-1.5"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${consultandoPermisso ? 'animate-spin' : ''}`} />
                      {consultandoPermisso ? 'Sincronizando...' : 'Sincronizar'}
                    </button>
                  </div>
                  
                  {permissoError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-400">{permissoError}</p>
                    </div>
                  )}
                  
                  {formData.permissoSimulado && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Dados simulados. Falha na API de Permisso/ANTT.
                      </p>
                    </div>
                  )}
                  
                  {isPermissoDataLoaded && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Última consulta: {formData.permissoDataConsulta ? format(formData.permissoDataConsulta, 'dd/MM/yyyy HH:mm') : 'N/A'}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Razão Social</label>
                      <input
                        type="text"
                        value={formData.permissoRazaoSocial}
                        onChange={(e) => handlePermissoChange('permissoRazaoSocial', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Fantasia</label>
                      <input
                        type="text"
                        value={formData.permissoNomeFantasia}
                        onChange={(e) => handlePermissoChange('permissoNomeFantasia', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={formatDocument(formData.permissoCnpj, 'PJ')}
                        onChange={(e) => handlePermissoChange('permissoCnpj', parseDocument(e.target.value))}
                        className="input-field"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço Completo</label>
                      <input
                        type="text"
                        value={formData.permissoEnderecoCompleto}
                        onChange={(e) => handlePermissoChange('permissoEnderecoCompleto', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1" disabled={consultandoPlaca || consultandoPermisso}>
                  {editingId ? 'Salvar alterações' : 'Adicionar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default VeiculoFormModal;