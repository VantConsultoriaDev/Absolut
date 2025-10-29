import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { formatCurrency } from '../../utils/formatters';
import { Cliente } from '../../types';

// Define the complex form data structure
export interface CargaFormData {
  crt: string;
  origem: string;
  destino: string;
  clienteId?: string;
  ufOrigemSelecionada: string;
  cidadeOrigem: string;
  ufDestinoSelecionada: string;
  cidadeDestino: string;
  dataColeta: string;
  dataEntrega: string;
  valor: string;
  peso: string;
  observacoes: string;
  status: 'entregue' | 'em_transito' | 'a_coletar' | 'armazenada' | 'cancelada';
}

interface CargaFormModalProps {
  isOpen: boolean;
  formData: CargaFormData;
  editingCarga: any;
  clientes: Cliente[];
  ufsOrdenadas: { value: string; label: string }[];
  hasUnsavedChanges: boolean;
  onClose: () => void;
  onFormChange: (field: string, value: string) => void;
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
  onSubmit,
  onConfirmCancel,
  showCancelConfirm,
  setShowCancelConfirm
}) => {
  const { modalRef } = useModal({
    isOpen,
    onClose: onClose,
    closeOnOutsideClick: !hasUnsavedChanges, // Prevent closing if unsaved changes exist
    closeOnEscape: !hasUnsavedChanges,
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          ref={modalRef}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4"
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

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CRT
                  </label>
                  <input
                    type="text"
                    value={formData.crt}
                    onChange={(e) => onFormChange('crt', e.target.value.slice(0, 10))}
                    placeholder="Ex: BR722"
                    className="input-field"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">Máximo 10 caracteres</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => onFormChange('status', e.target.value)}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ORIGEM */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      UF Origem *
                    </label>
                    <select
                      value={formData.ufOrigemSelecionada}
                      onChange={(e) => {
                        onFormChange('ufOrigemSelecionada', e.target.value);
                        if (formData.cidadeOrigem) {
                          onFormChange('cidadeOrigem', '');
                        }
                      }}
                      className="input-field"
                      required
                    >
                      <option value="">Selecione a UF de origem</option>
                      {ufsOrdenadas.map((uf) => (
                        <option key={uf.value} value={uf.value}>
                          {uf.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.ufOrigemSelecionada && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cidade Origem
                      </label>
                      <input
                        type="text"
                        value={formData.cidadeOrigem}
                        onChange={(e) => onFormChange('cidadeOrigem', e.target.value)}
                        placeholder={formData.ufOrigemSelecionada === 'internacional' ? "Digite a cidade/país de origem" : "Digite a cidade de origem"}
                        className="input-field"
                      />
                    </div>
                  )}
                </div>

                {/* DESTINO */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      UF Destino *
                    </label>
                    <select
                      value={formData.ufDestinoSelecionada}
                      onChange={(e) => {
                        onFormChange('ufDestinoSelecionada', e.target.value);
                        if (formData.cidadeDestino) {
                          onFormChange('cidadeDestino', '');
                        }
                      }}
                      className="input-field"
                      required
                    >
                      <option value="">Selecione a UF de destino</option>
                      {ufsOrdenadas.map((uf) => (
                        <option key={uf.value} value={uf.value}>
                          {uf.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.ufDestinoSelecionada && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cidade Destino
                      </label>
                      <input
                        type="text"
                        value={formData.cidadeDestino}
                        onChange={(e) => onFormChange('cidadeDestino', e.target.value)}
                        placeholder={formData.ufDestinoSelecionada === 'internacional' ? "Digite a cidade/país de destino" : "Digite a cidade de destino"}
                        className="input-field"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data de Coleta *
                  </label>
                  <input
                    type="date"
                    value={formData.dataColeta}
                    onChange={(e) => onFormChange('dataColeta', e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data de Entrega *
                  </label>
                  <input
                    type="date"
                    value={formData.dataEntrega}
                    onChange={(e) => onFormChange('dataEntrega', e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="text"
                    value={formData.valor}
                    onChange={(e) => {
                      const formatted = formatCurrency(e.target.value);
                      onFormChange('valor', formatted);
                    }}
                    className="input-field"
                    placeholder="R$ 0,00"
                    required
                  />
                </div>
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