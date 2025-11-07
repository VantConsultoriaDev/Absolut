import React from 'react';
import { X, Edit, Trash2, Building2, User, Globe, Mail, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { Cliente } from '../../types';
import { formatDocument, formatContact } from '../../utils/formatters';

interface ClienteDetailModalProps {
  isOpen: boolean;
  cliente: Cliente | null;
  onClose: () => void;
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
}

const ClienteDetailModal: React.FC<ClienteDetailModalProps> = ({
  isOpen,
  cliente,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { modalRef } = useModal({ isOpen, onClose });

  if (!isOpen || !cliente) return null;

  const displayTitle = cliente.tipo === 'PJ' && cliente.nomeFantasia ? cliente.nomeFantasia : cliente.nome;
  const secondaryTitle = cliente.tipo === 'PJ' && cliente.nomeFantasia ? cliente.nome : cliente.nomeFantasia;
  
  const fullAddress = [
    cliente.endereco,
    cliente.numero ? `, ${cliente.numero}` : '',
    cliente.complemento ? ` (${cliente.complemento})` : '',
  ].join('');

  const handleEdit = () => {
    onEdit(cliente);
    onClose(); // Fecha o modal de detalhes para abrir o de formulário
  };

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?`)) {
      onDelete(cliente.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6 border-b pb-4 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              {cliente.avatarUrl ? (
                <img 
                  src={cliente.avatarUrl} 
                  alt={cliente.nome} 
                  className="h-12 w-12 rounded-full object-cover flex-shrink-0 border-2 border-blue-500"
                />
              ) : (
                <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  cliente.tipo === 'PJ' ? 'bg-blue-500 text-white' : 
                  cliente.tipo === 'PF' ? 'bg-green-500 text-white' : 
                  'bg-purple-500 text-white'
                }`}>
                  {cliente.tipo === 'PJ' ? <Building2 className="h-6 w-6" /> :
                   cliente.tipo === 'PF' ? <User className="h-6 w-6" /> :
                   <Globe className="h-6 w-6" />}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{displayTitle}</h3>
                {secondaryTitle && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{secondaryTitle}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Detalhes */}
          <div className="space-y-4">
            {/* Documento e Tipo */}
            <div className="grid grid-cols-2 gap-4">
                <div className="detail-item">
                    <p className="detail-label">Tipo</p>
                    <p className="detail-value flex items-center gap-2">
                        {cliente.tipo === 'PJ' ? <Building2 className="h-4 w-4 text-blue-500" /> :
                         cliente.tipo === 'PF' ? <User className="h-4 w-4 text-green-500" /> :
                         <Globe className="h-4 w-4 text-purple-500" />}
                        {cliente.tipo === 'PJ' ? 'Pessoa Jurídica' :
                         cliente.tipo === 'PF' ? 'Pessoa Física' :
                         'Internacional'}
                    </p>
                </div>
                <div className="detail-item">
                    <p className="detail-label">{cliente.tipo === 'PJ' ? 'CNPJ' : cliente.tipo === 'PF' ? 'CPF' : 'Documento'}</p>
                    <p className="detail-value font-mono">{formatDocument(cliente.documento || 'N/A', cliente.tipo)}</p>
                </div>
            </div>

            {/* Contato */}
            <div className="grid grid-cols-2 gap-4">
                <div className="detail-item">
                    <p className="detail-label">Email</p>
                    <p className="detail-value flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" /> {cliente.email || 'N/A'}
                    </p>
                </div>
                <div className="detail-item">
                    <p className="detail-label">Contato</p>
                    <p className="detail-value flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" /> {formatContact(cliente.telefone || 'N/A')}
                    </p>
                </div>
                {cliente.tipo === 'PJ' && cliente.responsavel && (
                    <div className="detail-item col-span-2">
                        <p className="detail-label">Responsável</p>
                        <p className="detail-value flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" /> {cliente.responsavel}
                        </p>
                    </div>
                )}
            </div>

            {/* Endereço */}
            <div className="detail-item">
                <p className="detail-label">Endereço Completo</p>
                <p className="detail-value flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" /> 
                    {fullAddress || 'N/A'}
                    {cliente.cidade && cliente.uf && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                            {cliente.cidade} - {cliente.uf} ({cliente.cep})
                        </span>
                    )}
                </p>
            </div>

            {/* Observações */}
            {cliente.observacoes && (
                <div className="detail-item bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="detail-label">Observações</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cliente.observacoes}</p>
                </div>
            )}
            
            {/* Status */}
            {!cliente.isActive && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                        Este cliente está inativo ou bloqueado.
                    </p>
                </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex space-x-4 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
            <button
              type="button"
              onClick={handleEdit}
              className="btn-secondary flex-1 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Edit className="h-5 w-5" />
              Editar Dados
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn-danger flex-1"
            >
              <Trash2 className="h-5 w-5" />
              Excluir Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteDetailModal;

// Estilos auxiliares
// Nota: Estes estilos devem ser definidos no CSS global ou inline, mas para fins de componente, definimos a estrutura aqui.
// No contexto do projeto, eles serão aplicados via classes Tailwind.
/*
.detail-item {
    @apply space-y-1;
}
.detail-label {
    @apply text-xs font-medium text-gray-500 dark:text-gray-400;
}
.detail-value {
    @apply text-sm font-medium text-gray-900 dark:text-white;
}
*/