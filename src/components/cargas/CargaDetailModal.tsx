import React, { useMemo } from 'react';
import { X, User, Truck, Link as LinkIcon, Calendar, DollarSign, Briefcase, ArrowRight, Package, UserCircle, MapPin } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { Carga, Trajeto, Parceiro, Motorista, Veiculo, Cliente, MovimentacaoFinanceira } from '../../types';
import { formatCurrency, formatPlaca, createLocalDate } from '../../utils/formatters';
import { format } from 'date-fns';
import { STATUS_CONFIG } from '../../utils/cargasConstants';

interface CargaDetailModalProps {
  isOpen: boolean;
  carga: Carga | null;
  onClose: () => void;
  onEdit: (carga: Carga) => void;
  onLinkTrajeto: (carga: Carga, trajetoIndex: number) => void;
  parceiros: Parceiro[];
  motoristas: Motorista[];
  veiculos: Veiculo[];
  clientes: Cliente[];
  movimentacoes: MovimentacaoFinanceira[]; // NOVO
}

const CargaDetailModal: React.FC<CargaDetailModalProps> = ({
  isOpen,
  carga,
  onClose,
  onEdit,
  onLinkTrajeto,
  parceiros,
  motoristas,
  veiculos,
  clientes,
  movimentacoes, // NOVO
}) => {
  // O useModal garante que este modal só feche se estiver no topo da pilha
  const { modalRef } = useModal({ isOpen, onClose });

  // Assumimos que o componente pai (Cargas.tsx) garante que carga não é null
  if (!carga) return null; 

  // --- NOVO: CÁLCULO FINANCEIRO ---
  const { baseValue, despesasAdicionais, diarias, totalFinanceiro } = useMemo(() => {
    // O valor base é o valor total da carga (soma dos trajetos)
    const base = carga.valor || 0;
    
    // Filtra movimentações relacionadas a esta carga que são extras (Diárias ou Outras Despesas)
    const extrasMovs = movimentacoes.filter(m => 
        m.cargaId === carga.id && 
        (m.categoria === 'DIARIA' || m.categoria === 'OUTRAS DESPESAS')
    );
    
    const totalDiarias = extrasMovs
        .filter(m => m.categoria === 'DIARIA')
        .reduce((sum, m) => sum + (m.valor || 0), 0);
        
    const totalDespesasAdicionais = extrasMovs
        .filter(m => m.categoria === 'OUTRAS DESPESAS')
        .reduce((sum, m) => sum + (m.valor || 0), 0);
        
    // O valor total financeiro é o valor base da carga (soma dos trajetos) + extras
    const total = base + totalDiarias + totalDespesasAdicionais;

    return {
        baseValue: base,
        despesasAdicionais: totalDespesasAdicionais,
        diarias: totalDiarias,
        totalFinanceiro: total,
    };
  }, [carga, movimentacoes]);
  // --- FIM CÁLCULO FINANCEIRO ---

  const getParceiroInfo = (id: string | undefined) => parceiros.find(p => p.id === id);
  const getMotoristaInfo = (id: string | undefined) => motoristas.find(m => m.id === id) || parceiros.find(p => p.id === id && p.isMotorista);
  const getVeiculoInfo = (id: string | undefined) => veiculos.find(v => v.id === id);
  const getClienteInfo = (id: string | undefined) => clientes.find(c => c.id === id);
  
  const cliente = getClienteInfo(carga.clienteId);
  const clienteDisplay = cliente?.tipo === 'PJ' && cliente.nomeFantasia ? cliente.nomeFantasia : cliente?.nome || 'N/A';
  
  const getCarretaPlacas = (ids: string[] | undefined) => {
    if (!ids || ids.length === 0) return 'N/A';
    return ids.map(id => {
      const v = veiculos.find(v => v.id === id);
      // Prioriza placaCarreta, depois placa
      return v ? (formatPlaca(v.placaCarreta || v.placa || 'Placa Desconhecida')) : 'ID Inválido';
    }).join(', ');
  };

  const StatusConfig = STATUS_CONFIG[carga.status as keyof typeof STATUS_CONFIG];

  const renderTrajetoDetails = (trajeto: Trajeto) => {
    const parceiro = getParceiroInfo(trajeto.parceiroId);
    const motorista = getMotoristaInfo(trajeto.motoristaId);
    const veiculo = getVeiculoInfo(trajeto.veiculoId);
    const isLinked = trajeto.parceiroId && trajeto.motoristaId && trajeto.veiculoId;
    
    const coletaDate = trajeto.dataColeta ? createLocalDate(trajeto.dataColeta) : undefined;
    const entregaDate = trajeto.dataEntrega ? createLocalDate(trajeto.dataEntrega) : undefined;

    return (
      <div key={trajeto.index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-700/50">
        <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
          <h4 className="text-md font-bold text-blue-600 dark:text-blue-400">
            Trajeto {trajeto.index}
          </h4>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${isLinked ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {isLinked ? 'VINCULADO' : 'PENDENTE'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLinkTrajeto(carga, trajeto.index);
              }}
              className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors"
              title="Vincular Parceiro/Veículo"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Rota, Valor e Datas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Rota
            </p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {trajeto.cidadeOrigem} - {trajeto.ufOrigem}
              <ArrowRight className="h-3 w-3 mx-1 inline-block text-slate-500" />
              {trajeto.cidadeDestino} - {trajeto.ufDestino}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Datas
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Coleta: <span className="font-medium">{coletaDate ? format(coletaDate, 'dd/MM/yyyy') : 'N/A'}</span>
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Entrega: <span className="font-medium">{entregaDate ? format(entregaDate, 'dd/MM/yyyy') : 'N/A'}</span>
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Valor Base do Frete
            </p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(trajeto.valor)}
            </p>
          </div>
        </div>

        {/* Vínculos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
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
            {/* NOVO: Exibe carretas vinculadas */}
            {veiculo?.tipo === 'Cavalo' && trajeto.carretasSelecionadas && trajeto.carretasSelecionadas.length > 0 && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Carretas: {getCarretaPlacas(trajeto.carretasSelecionadas)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 border-b pb-4 border-slate-200 dark:border-slate-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Package className="h-6 w-6 text-blue-600" />
              Detalhes da Carga: {carga.crt || 'N/A'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(carga)}
                className="btn-secondary text-sm"
              >
                Editar Carga
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Resumo Principal */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* ALTERADO: Valor Base da Carga (Soma dos Trajetos) */}
            <div className="stat-card border-l-4 border-blue-500">
              <p className="stat-label">Valor Base (Frete)</p>
              <p className="stat-value text-xl">{formatCurrency(baseValue)}</p>
            </div>
            
            {/* NOVO: Despesas Adicionais */}
            <div className="stat-card border-l-4 border-red-500">
              <p className="stat-label">Despesas Adicionais</p>
              <p className="stat-value text-xl text-red-600 dark:text-red-400">{formatCurrency(despesasAdicionais)}</p>
            </div>
            
            {/* NOVO: Diárias */}
            <div className="stat-card border-l-4 border-purple-500">
              <p className="stat-label">Diárias</p>
              <p className="stat-value text-xl text-purple-600 dark:text-purple-400">{formatCurrency(diarias)}</p>
            </div>
            
            {/* NOVO: Valor Total Financeiro */}
            <div className="stat-card border-l-4 border-green-500">
              <p className="stat-label">Valor Total Financeiro</p>
              <p className="stat-value text-xl text-green-600 dark:text-green-400">{formatCurrency(totalFinanceiro)}</p>
            </div>
            
            {/* Linha 2: Peso e Status */}
            <div className="stat-card border-l-4 border-gray-500">
              <p className="stat-label">Peso</p>
              <p className="stat-value text-xl">{carga.peso} t</p>
            </div>
            <div className="stat-card border-l-4 border-gray-500">
              <p className="stat-label">Status</p>
              <span className={`badge ${StatusConfig.color}`}>
                {StatusConfig.label}
              </span>
            </div>
            <div className="stat-card border-l-4 border-gray-500 relative md:col-span-2">
              <p className="stat-label">Cliente</p>
              
              {/* Avatar no canto superior direito */}
              <div className="absolute top-0 right-4">
                {cliente?.avatarUrl ? (
                  <img
                    src={cliente.avatarUrl}
                    alt={clienteDisplay}
                    className="h-10 w-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                    <UserCircle className="h-6 w-6" />
                  </div>
                )}
              </div>
              
              {/* Nome do Cliente (ajustado para caber) */}
              <div className="flex items-center gap-2 mt-1 pr-16">
                <p className="text-lg font-bold text-slate-900 dark:text-white break-words leading-tight">
                  {clienteDisplay}
                </p>
              </div>
            </div>
          </div>

          {/* Detalhes dos Trajetos */}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {carga.transbordo === 'com_transbordo' ? 'Múltiplos Trajetos (Transbordo)' : 'Trajeto Único'}
          </h3>
          
          <div className="space-y-4">
            {carga.trajetos.map(renderTrajetoDetails)}
          </div>

          {/* Observações */}
          {carga.observacoes && (
            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações Gerais</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{carga.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CargaDetailModal;