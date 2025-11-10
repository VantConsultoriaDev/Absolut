import React, { useState, useMemo } from 'react';
import { X, Edit, Trash2, Briefcase, User, Truck, Mail, Phone, MapPin, CreditCard, FileText, AlertTriangle, Building2, Search, Calendar, FileBadge } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { Parceiro, Motorista, Veiculo, PermissoInternacional } from '../../types';
import { formatDocument, formatContact, formatPlaca, formatPixKey } from '../../utils/formatters';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ParceiroDetailModalProps {
  isOpen: boolean;
  parceiro: Parceiro | null;
  motoristas: Motorista[];
  veiculos: Veiculo[];
  getPermissoByVeiculoId: (veiculoId: string) => PermissoInternacional | null;
  onClose: () => void;
  onEdit: (parceiro: Parceiro) => void;
  onDelete: (id: string) => void;
  onAddMotorista: (parceiroId: string) => void;
  onAddVeiculo: (parceiroId: string) => void;
  onEditMotorista: (motorista: Motorista) => void;
  onEditVeiculo: (veiculo: Veiculo) => void;
  onDeleteMotorista: (id: string) => void;
  onDeleteVeiculo: (id: string) => void;
  // REMOVIDO: onOpenPermissoModal: (veiculo: Veiculo) => void;
}

const ParceiroDetailModal: React.FC<ParceiroDetailModalProps> = ({
  isOpen,
  parceiro,
  motoristas,
  veiculos,
  getPermissoByVeiculoId,
  onClose,
  onEdit,
  onDelete,
  onAddMotorista,
  onAddVeiculo,
  onEditMotorista,
  onEditVeiculo,
  onDeleteMotorista,
  onDeleteVeiculo,
  // REMOVIDO: onOpenPermissoModal,
}) => {
  const { modalRef } = useModal({ isOpen, onClose });
  const [activeTab, setActiveTab] = useState<'detalhes' | 'motoristas' | 'veiculos'>('detalhes');
  
  // Estados para busca e filtro de veículos
  const [veiculoSearchTerm, setVeiculoSearchTerm] = useState('');
  const [veiculoFilterType, setVeiculoFilterType] = useState('');
  
  // NOVO: Estado para busca de motoristas
  const [motoristaSearchTerm, setMotoristaSearchTerm] = useState('');

  if (!isOpen || !parceiro) return null;

  const displayTitle = parceiro.tipo === 'PJ' && parceiro.nomeFantasia ? parceiro.nomeFantasia : parceiro.nome;
  const secondaryTitle = parceiro.tipo === 'PJ' && parceiro.nomeFantasia ? parceiro.nome : undefined;
  const isPJ = parceiro.tipo === 'PJ';
  const isBlocked = parceiro.isActive === false;
  
  const fullAddress = [
    parceiro.endereco,
    parceiro.numero ? `, ${parceiro.numero}` : '',
    parceiro.complemento ? ` (${parceiro.complemento})` : '',
  ].join('');
  
  const hasAddressInfo = !!parceiro.endereco || !!parceiro.cidade || !!parceiro.cep;

  // Lógica de filtragem de motoristas
  const filteredMotoristas = useMemo(() => {
    const parceiroMotoristas = motoristas.filter(m => m.parceiroId === parceiro.id);
    const q = motoristaSearchTerm.trim().toLowerCase();
    
    if (!q) return parceiroMotoristas;
    
    return parceiroMotoristas.filter(m =>
        (m.nome || '').toLowerCase().includes(q) ||
        (m.cpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) || // Busca por CPF limpo
        (m.cnh || '').toLowerCase().includes(q)
    );
  }, [motoristas, parceiro.id, motoristaSearchTerm]);
  
  // Lógica de filtragem e ordenação de veículos
  const filteredAndSortedVeiculos = useMemo(() => {
    const parceiroVeiculos = veiculos.filter(v => v.parceiroId === parceiro.id);
    let filtered = parceiroVeiculos;
    
    const q = veiculoSearchTerm.trim().toLowerCase();
    if (q) {
        filtered = filtered.filter(v =>
            (v.placa || v.placaCavalo || v.placaCarreta || '').toLowerCase().includes(q) ||
            (v.modelo || '').toLowerCase().includes(q) ||
            (v.fabricante || '').toLowerCase().includes(q) ||
            (v.chassis || '').toLowerCase().includes(q)
        );
    }
    
    if (veiculoFilterType) {
        filtered = filtered.filter(v => v.tipo === veiculoFilterType);
    }
    
    // Ordenação: 1º Cavalo, 2º Carreta, 3º Truck
    const typeOrder = (type: string) => {
        if (type === 'Cavalo') return 1;
        if (type === 'Truck') return 3;
        if (type === 'Carreta') return 2;
        return 4;
    };
    
    return filtered.sort((a, b) => {
        const orderA = typeOrder(a.tipo);
        const orderB = typeOrder(b.tipo);
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        // Ordenação secundária por placa
        const placaA = (a.placa || a.placaCavalo || a.placaCarreta || '').toLowerCase();
        const placaB = (b.placa || b.placaCavalo || b.placaCarreta || '').toLowerCase();
        if (placaA > placaB) return 1;
        if (placaA < placaB) return -1;
        return 0;
    });
  }, [veiculos, parceiro.id, veiculoSearchTerm, veiculoFilterType]);
  
  const hasPixInfo = parceiro.pixKey && parceiro.pixKeyType;

  const renderDetalhes = () => (
    <div className="space-y-6">
      
      {/* Informações de Identificação (PF) */}
      {!isPJ && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="md:col-span-3">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileBadge className="h-5 w-5 text-green-600" /> Identificação Pessoal
                </h4>
            </div>
            <div className="detail-item">
                <p className="detail-label flex items-center gap-1"><Calendar className="h-4 w-4" /> Data Nasc.</p>
                <p className="detail-value">
                    {parceiro.dataNascimento && isValid(parceiro.dataNascimento) 
                        ? format(parceiro.dataNascimento, 'dd/MM/yyyy', { locale: ptBR }) 
                        : 'N/A'}
                </p>
            </div>
            <div className="detail-item">
                <p className="detail-label flex items-center gap-1"><FileText className="h-4 w-4" /> RG</p>
                <p className="detail-value">{parceiro.rg || 'N/A'}</p>
            </div>
            <div className="detail-item">
                <p className="detail-label flex items-center gap-1"><FileText className="h-4 w-4" /> Órgão Emissor</p>
                <p className="detail-value">{parceiro.orgaoEmissor || 'N/A'}</p>
            </div>
        </div>
      )}
      
      {/* Informações de Contato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="detail-item">
          <p className="detail-label flex items-center gap-1"><Mail className="h-4 w-4" /> Email</p>
          <p className="detail-value">{parceiro.email || 'N/A'}</p>
        </div>
        <div className="detail-item">
          <p className="detail-label flex items-center gap-1"><Phone className="h-4 w-4" /> Contato</p>
          <p className="detail-value">{formatContact(parceiro.telefone || 'N/A')}</p>
        </div>
        {parceiro.tipo === 'PJ' && parceiro.responsavel && (
            <div className="detail-item md:col-span-2">
                <p className="detail-label flex items-center gap-1"><User className="h-4 w-4" /> Responsável</p>
                <p className="detail-value">{parceiro.responsavel}</p>
            </div>
        )}
      </div>
      
      {/* Informações de Endereço (Apenas se for PJ ou se houver dados) */}
      {(isPJ || hasAddressInfo) && (
        <div className="detail-item">
          <p className="detail-label flex items-center gap-1"><MapPin className="h-4 w-4" /> Endereço Completo</p>
          <p className="detail-value">
            {fullAddress || 'N/A'}
            {parceiro.cidade && parceiro.uf && (
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                ({parceiro.cidade} - {parceiro.uf}, {parceiro.cep})
              </span>
            )}
          </p>
        </div>
      )}
      
      {/* Informações PIX */}
      {hasPixInfo && (
        <div className="p-4 border border-purple-300 dark:border-purple-700 rounded-lg bg-purple-50 dark:bg-purple-900/20">
          <h4 className="text-md font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2 mb-3">
            <CreditCard className="h-5 w-5" />
            Dados PIX
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Tipo de Chave</p>
              <p className="font-medium text-slate-900 dark:text-white">{parceiro.pixKeyType}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Chave PIX</p>
              <p className="font-mono text-sm font-bold text-purple-700 dark:text-purple-300 break-all">
                {formatPixKey(parceiro.pixKey!, parceiro.pixKeyType!)}
              </p>
            </div>
            <div className="space-y-1 md:col-span-3">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Titular</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {parceiro.pixTitular || parceiro.nome || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Observações */}
      {parceiro.observacoes && (
        <div className="detail-item bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <p className="detail-label">Observações</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{parceiro.observacoes}</p>
        </div>
      )}
      
      {/* Status Bloqueado */}
      {isBlocked && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">
            Este parceiro está BLOQUEADO.
          </p>
        </div>
      )}
    </div>
  );

  const renderMotoristas = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {/* Busca de Motoristas */}
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
                type="text"
                placeholder="Buscar nome, CPF ou CNH..."
                value={motoristaSearchTerm}
                onChange={(e) => setMotoristaSearchTerm(e.target.value)}
                className="input-field pl-10 h-10 text-sm w-full"
            />
        </div>
        <button onClick={() => onAddMotorista(parceiro.id)} className="btn-secondary text-sm ml-4">
          Adicionar Motorista
        </button>
      </div>
      {filteredMotoristas.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nenhum motorista encontrado {motoristaSearchTerm ? 'com o termo de busca' : 'vinculado a este parceiro'}.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMotoristas.map(m => (
            <div key={m.id} className="card p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <div className="flex items-center gap-4">
                <User className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{m.nome}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{formatDocument(m.cpf, 'PF')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">CNH: {m.cnh} ({m.categoriaCnh})</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => onEditMotorista(m)} className="text-blue-600 hover:text-blue-800 p-1" title="Editar">
                  <Edit className="h-4 w-4" />
                </button>
                <button onClick={() => onDeleteMotorista(m.id)} className="text-red-600 hover:text-red-800 p-1" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderVeiculos = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {/* Filtros de Veículos */}
        <div className="flex gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                    type="text"
                    placeholder="Buscar placa, modelo ou chassi..."
                    value={veiculoSearchTerm}
                    onChange={(e) => setVeiculoSearchTerm(e.target.value)}
                    className="input-field pl-10 h-10 text-sm w-48"
                />
            </div>
            <select
                value={veiculoFilterType}
                onChange={(e) => setVeiculoFilterType(e.target.value)}
                className="input-field h-10 text-sm w-36"
            >
                <option value="">Todos Tipos</option>
                <option value="Cavalo">Cavalo</option>
                <option value="Truck">Truck</option>
                <option value="Carreta">Carreta</option>
            </select>
        </div>
        
        <button onClick={() => onAddVeiculo(parceiro.id)} className="btn-secondary text-sm">
          Adicionar Veículo
        </button>
      </div>
      
      {filteredAndSortedVeiculos.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nenhum veículo encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedVeiculos.map(v => {
            // ALTERADO: formatPlaca agora retorna sem hífen
            const placaDisplay = formatPlaca(v.placa || v.placaCavalo || v.placaCarreta || 'N/A');
            const permisso = getPermissoByVeiculoId(v.id);
            const isCavaloOuTruck = v.tipo === 'Cavalo' || v.tipo === 'Truck';
            
            return (
              <div key={v.id} className="card p-4 flex justify-between items-start hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-4">
                  <Truck className={`h-6 w-6 ${isCavaloOuTruck ? 'text-amber-600' : 'text-gray-600'} flex-shrink-0`} />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{v.fabricante} {v.modelo} ({v.ano})</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{placaDisplay} ({v.tipo})</p>
                    {v.chassis && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Chassis: {v.chassis}</p>
                    )}
                    
                    {/* Status Permisso */}
                    {isCavaloOuTruck && (
                        <div className="mt-1 flex items-center gap-2">
                            <span className={`badge ${permisso ? 'badge-success' : 'badge-warning'}`}>
                                <FileText className="h-3 w-3 mr-1" />
                                {permisso ? 'Permisso Registrado' : 'Permisso Pendente'}
                            </span>
                            {permisso && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Última Consulta: {format(permisso.dataConsulta, 'dd/MM/yyyy')}
                                </span>
                            )}
                        </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 flex-shrink-0">
                  <button onClick={() => onEditVeiculo(v)} className="text-blue-600 hover:text-blue-800 p-1" title="Editar">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDeleteVeiculo(v.id)} className="text-red-600 hover:text-red-800 p-1" title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6 border-b pb-4 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${isPJ ? 'bg-blue-500' : 'bg-green-500'} text-white shadow-md`}>
                {React.createElement(isPJ ? Building2 : User, { className: "h-6 w-6" })}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{displayTitle}</h3>
                {secondaryTitle && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{secondaryTitle}</p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">
                  {formatDocument(parceiro.documento || 'N/A', parceiro.tipo)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(parceiro)}
                className="btn-secondary text-sm"
              >
                <Edit className="h-4 w-4" /> Editar
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab('detalhes')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'detalhes'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              } flex items-center gap-2`}
            >
              <Briefcase className="h-4 w-4" />
              Detalhes
            </button>
            <button
              onClick={() => setActiveTab('motoristas')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'motoristas'
                  ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              } flex items-center gap-2`}
            >
              <User className="h-4 w-4" />
              Motoristas ({filteredMotoristas.length})
            </button>
            <button
              onClick={() => setActiveTab('veiculos')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'veiculos'
                  ? 'border-b-2 border-amber-600 text-amber-600 dark:text-amber-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              } flex items-center gap-2`}
            >
              <Truck className="h-4 w-4" />
              Veículos ({filteredAndSortedVeiculos.length})
            </button>
          </div>

          {/* Conteúdo da Aba */}
          <div className="pt-2">
            {activeTab === 'detalhes' && renderDetalhes()}
            {activeTab === 'motoristas' && renderMotoristas()}
            {activeTab === 'veiculos' && renderVeiculos()}
          </div>
          
          {/* Ações de Exclusão */}
          <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
            <button
              type="button"
              onClick={() => onDelete(parceiro.id)}
              className="btn-danger text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Parceiro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParceiroDetailModal;