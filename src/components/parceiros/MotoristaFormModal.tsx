import React, { useMemo } from 'react';
import { X, User } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { Parceiro, Motorista } from '../../types';
import { formatDocument, formatContact } from '../../utils/formatters';

// Tipagem para o formulário (string para validadeCnh)
export interface MotoristaFormData extends Omit<Motorista, 'id' | 'createdAt' | 'updatedAt' | 'parceiroId' | 'validadeCnh'> {
  parceiroId: string;
  validadeCnh: string; // String format YYYY-MM-DD
}

interface MotoristaFormModalProps {
  isOpen: boolean;
  parceiroId: string;
  parceiros: Parceiro[];
  formData: MotoristaFormData;
  setFormData: React.Dispatch<React.SetStateAction<MotoristaFormData>>;
  editingId: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const MotoristaFormModal: React.FC<MotoristaFormModalProps> = ({
  isOpen,
  parceiroId,
  parceiros,
  formData,
  setFormData,
  editingId,
  onClose,
  onSubmit,
}) => {
  const { modalRef } = useModal({ isOpen, onClose });
  
  const parceiroProprietario = useMemo(() => parceiros.find(p => p.id === parceiroId), [parceiros, parceiroId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? 'Editar Motorista' : 'Novo Motorista'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Informação do Parceiro Proprietário (Fixo) */}
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center gap-3">
              <User className="h-5 w-5 text-green-600" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                  Parceiro Vinculado: <span className="font-semibold">{parceiroProprietario?.nome || 'N/A'}</span>
              </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            
            {/* Nome e CPF */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF *</label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatDocument(e.target.value, 'PF') }))}
                  className="input-field"
                  placeholder="000.000.000-00"
                  required
                />
              </div>
            </div>
            
            {/* CNH e Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNH *</label>
                <input
                  type="text"
                  value={formData.cnh}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnh: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria CNH</label>
                <input
                  type="text"
                  value={formData.categoriaCnh}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoriaCnh: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Validade CNH</label>
                <input
                  type="date"
                  value={formData.validadeCnh}
                  onChange={(e) => setFormData(prev => ({ ...prev, validadeCnh: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>
            
            {/* Contato e Nacionalidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: formatContact(e.target.value) }))}
                  className="input-field"
                  placeholder="Ex: (11) 98765-4321"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nacionalidade</label>
                <select
                  value={formData.nacionalidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, nacionalidade: e.target.value as Motorista['nacionalidade'] }))}
                  className="input-field"
                >
                  <option value="Brasileiro">Brasileiro</option>
                  <option value="Estrangeiro">Estrangeiro</option>
                </select>
              </div>
            </div>
            
            {/* REMOVIDO: Status Ativo */}
            {/*
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Motorista Ativo?</label>
                <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                        formData.isActive
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800'
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
            */}

            <div className="flex space-x-4 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1">
                {editingId ? 'Salvar alterações' : 'Adicionar Motorista'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MotoristaFormModal;