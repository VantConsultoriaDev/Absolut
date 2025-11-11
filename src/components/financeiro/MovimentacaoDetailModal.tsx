import React, { useMemo } from 'react';
import { X, DollarSign, Calendar, Package, Truck, MapPin, FileText, Briefcase, User, AlertTriangle, CreditCard } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { MovimentacaoFinanceira, Carga, Parceiro, Motorista, Veiculo } from '../../types';
import { formatCurrency, formatPlaca, formatPixKey } from '../../utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// Removido: import { STATUS_CONFIG } from '../../utils/cargasConstants';

interface MovimentacaoDetailModalProps {
  isOpen: boolean;
  movimentacao: MovimentacaoFinanceira | null;
  cargas: Carga[];
  parceiros: Parceiro[];
  motoristas: Motorista[];
  veiculos: Veiculo[];
  onClose: () => void;
}

const MovimentacaoDetailModal: React.FC<MovimentacaoDetailModalProps> = ({
  isOpen,
  movimentacao,
  cargas,
  parceiros,
  motoristas,
  veiculos,
  onClose,
}) => {
  const { modalRef } = useModal({ isOpen, onClose });

  // 1. Busca a Carga e o Trajeto associados
  const { carga, trajeto } = useMemo(() => {
    if (!movimentacao || !movimentacao.cargaId || movimentacao.trajetoIndex === undefined) {
      return { carga: null, trajeto: null };
    }
    const foundCarga = cargas.find(c => c.id === movimentacao.cargaId);
    const foundTrajeto = foundCarga?.trajetos.find(t => t.index === movimentacao.trajetoIndex) || null;
    return { carga: foundCarga, trajeto: foundTrajeto };
  }, [movimentacao, cargas]);

  // 2. Busca os Vínculos do Trajeto
  const { parceiro, motorista, veiculo } = useMemo(() => {
    if (!trajeto) return { parceiro: null, motorista: null, veiculo: null };

    const p = parceiros.find(p => p.id === trajeto.parceiroId) || null;
    // Se o parceiro for PF e motorista, ele é o motorista. Caso contrário, busca na lista de motoristas.
    const m = motoristas.find(m => m.id === trajeto.motoristaId) || (p?.isMotorista && p.id === trajeto.motoristaId ? p : null);
    const v = veiculos.find(v => v.id === trajeto.veiculoId) || null;
    
    return { parceiro: p, motorista: m, veiculo: v };
  }, [trajeto, parceiros, motoristas, veiculos]);
  
  // 3. Configuração de Status da Movimentação
  const movStatusConfig = {
    pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-800' },
    pago: { label: 'Pago', color: 'bg-emerald-100 text-emerald-800' },
    cancelado: { label: 'Urgente', color: 'bg-red-100 text-red-800' },
  };
  
  if (!isOpen || !movimentacao) return null;

  const isFrete = movimentacao.categoria === 'FRETE';
  const isLinkedToCarga = carga && trajeto;
  const isTrajetoLinked = trajeto && trajeto.parceiroId && trajeto.motoristaId && trajeto.veiculoId;
  
  const hasPixInfo = parceiro && parceiro.pixKey && parceiro.pixKeyType;
  
  const getCarretaPlacas = (ids: string[] | undefined) => {
    if (!ids || ids.length === 0) return 'N/A';
    return ids.map(id => {
      const v = veiculos.find(v => v.id === id);
      return v ? (v.placaCarreta || v.placa || 'Placa Desconhecida') : 'ID Inválido';
    }).join(', ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 border-b pb-4 border-slate-200 dark:border-slate-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-blue-600" />
              Detalhes da Movimentação
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Seção 1: Detalhes da Movimentação */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Descrição</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{movimentacao.descricao}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Valor</p>
              <p className={`text-xl font-bold ${movimentacao.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {movimentacao.tipo === 'receita' ? '+' : '-'} {formatCurrency(movimentacao.valor)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Vencimento</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {format(new Date(movimentacao.data), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</p>
              <span className={`badge ${movStatusConfig[movimentacao.status as keyof typeof movStatusConfig].color}`}>
                {movStatusConfig[movimentacao.status as keyof typeof movStatusConfig].label}
              </span>
              {movimentacao.dataPagamento && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Pago em: {format(new Date(movimentacao.dataPagamento), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              )}
              {movimentacao.comprovanteUrl && (
                <a 
                  href={movimentacao.comprovanteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1"
                  // Adicionado onClick para garantir que o link abra corretamente
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(movimentacao.comprovanteUrl, '_blank');
                  }}
                >
                  <FileText className="h-3 w-3" /> Ver Comprovante
                </a>
              )}
            </div>
          </div>
          
          {/* Seção 1.5: Informações PIX (Se for despesa, pendente e houver parceiro com PIX) */}
          {isFrete && movimentacao.tipo === 'despesa' && movimentacao.status === 'pendente' && hasPixInfo && (
            <div className="mb-6 p-4 border border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <h4 className="text-lg font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-3">
                    <CreditCard className="h-5 w-5" />
                    Informações PIX para Pagamento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Tipo de Chave</p>
                        <p className="font-medium text-slate-900 dark:text-white">{parceiro.pixKeyType}</p>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Chave PIX</p>
                        <p className="font-mono text-lg font-bold text-blue-700 dark:text-blue-300 break-all">
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

          {/* Seção 2: Detalhes da Carga/Trajeto (se houver) */}
          {isLinkedToCarga && trajeto && (
            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-700">
                <Package className="h-5 w-5 text-blue-600" />
                Carga Associada: {carga.crt || 'N/A'} (Trajeto {trajeto.index})
              </h4>
              
              {/* Rota, Valor e Datas do Trajeto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Rota
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {trajeto.cidadeOrigem} - {trajeto.ufOrigem} → {trajeto.cidadeDestino} - {trajeto.ufDestino}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Datas do Trajeto
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Coleta: <span className="font-medium">{trajeto.dataColeta ? format(new Date(trajeto.dataColeta), 'dd/MM/yyyy') : 'N/A'}</span>
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Entrega: <span className="font-medium">{trajeto.dataEntrega ? format(new Date(trajeto.dataEntrega), 'dd/MM/yyyy') : 'N/A'}</span>
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Valor do Trajeto
                  </p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(trajeto.valor)}
                  </p>
                </div>
              </div>

              {/* Vínculos do Trajeto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Parceiro
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{parceiro?.nome || 'Não Vinculado'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <User className="h-3 w-3" /> Motorista
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{motorista?.nome || 'Não Vinculado'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Veículo
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {veiculo ? `${veiculo.tipo} - ${formatPlaca(veiculo.placa || veiculo.placaCavalo || '')}` : 'Não Vinculado'}
                  </p>
                  {veiculo?.tipo === 'Cavalo' && trajeto.carretasSelecionadas && trajeto.carretasSelecionadas.length > 0 && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Carretas: {getCarretaPlacas(trajeto.carretasSelecionadas)}
                    </p>
                  )}
                </div>
              </div>
              
              {!isTrajetoLinked && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center mt-4">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Este trajeto está pendente de vinculação de Parceiro/Motorista/Veículo.
                    </p>
                </div>
              )}
            </div>
          )}
          
          {/* Seção 3: Movimentação não vinculada */}
          {!isLinkedToCarga && isFrete && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">
                    Esta movimentação de FRETE não está vinculada a uma Carga/Trajeto.
                </p>
            </div>
          )}
          
          {/* Observações da Movimentação */}
          {movimentacao.observacoes && (
            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações da Movimentação</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{movimentacao.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovimentacaoDetailModal;