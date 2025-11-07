import React, { useMemo } from 'react';
import { X, RefreshCw, CheckCircle, Truck } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { Parceiro, Veiculo } from '../../types';
import { formatPlaca, forceUpperCase } from '../../utils/formatters';
// import { VehicleService } from '../../services/vehicleService'; // REMOVIDO
// import { showError } from '../../utils/toast'; // REMOVIDO

// Tipagem para o formulário (string para campos numéricos)
interface VeiculoFormData extends Omit<Veiculo, 'id' | 'createdAt' | 'updatedAt' | 'parceiroId' | 'permisso' | 'ano' | 'capacidade'> {
  parceiroId: string;
  ano: string;
  capacidade: string;
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
}) => {
  const { modalRef } = useModal({ isOpen, onClose });
  
  // O parceiro proprietário é fixo, mas precisamos do objeto para o nome
  const parceiroProprietario = useMemo(() => parceiros.find(p => p.id === parceiroId), [parceiros, parceiroId]);

  // Lógica de Placa
  const placaField = useMemo(() => {
    if (formData.tipo === 'Cavalo') return 'placaCavalo';
    if (formData.tipo === 'Carreta') return 'placaCarreta';
    return 'placa';
  }, [formData.tipo]);
  
  const placaValue = formData[placaField] || '';

  // Handler unificado para Placa (Cavalo, Truck, Carreta)
  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Aplica formatação de placa (apenas para visualização)
    const formatted = formatPlaca(value);
    setFormData(prev => ({ ...prev, [placaField]: formatted }));
    
    const placaLimpa = formatted.replace(/[^A-Z0-9]/gi, '');
    
    // Dispara a consulta automaticamente se a placa estiver completa (7 caracteres)
    if (placaLimpa.length === 7 && !placaConsultada && !consultandoPlaca) {
        handlePlacaConsultation(formatted, formData.tipo);
    }
  };
  
  // Handler para forçar maiúsculas no blur (para todos os campos de placa)
  const handlePlacaBlur = () => {
    setFormData(prev => ({ ...prev, [placaField]: forceUpperCase(placaValue) }));
  };
  
  // Lógica de Carretas (apenas para Cavalo)
  // const isCavalo = formData.tipo === 'Cavalo'; // REMOVIDO TS6133
  // const isCarreta = formData.tipo === 'Carreta'; // REMOVIDO TS6133
  
  // Determina se o campo de carroceria deve ser exibido
  // Deve ser exibido apenas para Truck, mas não para Cavalo ou Carreta
  const showCarroceria = formData.tipo === 'Truck';

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

            <form onSubmit={onSubmit} className="space-y-4">
              
              {/* Tipo de Veículo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Veículo *</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        tipo: e.target.value, 
                        placa: '', 
                        placaCavalo: '', 
                        placaCarreta: '', 
                        chassis: '',
                        // Campos removidos do tipo Veiculo, mas mantidos no VeiculoFormData para evitar erros de TS
                        // quantidadeCarretas: 0,
                        // possuiDolly: false,
                        // placaCarreta1: '',
                        // placaCarreta2: '',
                        // placaDolly: '',
                    }))}
                    className="input-field"
                    required
                    disabled={!!editingId}
                  >
                    <option value="Cavalo">Cavalo</option> {/* ALTERADO: Padrão para Cavalo */}
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
                    maxLength={7}
                    required
                  />
                  
                  {/* Mensagens de Status/Erro */}
                  {placaError && <p className="text-xs text-red-600 mt-1">{placaError}</p>}
                  {consultandoPlaca && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Consultando...</p>}
                  {placaConsultada && !consultandoPlaca && <p className="text-xs text-green-600 mt-1 flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Dados consultados automaticamente</p>}
                  
                  {/* Aviso para Carretas (REMOVIDO) */}
                </div>
                
                {/* Botão de Consulta Removido */}
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
              
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">
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