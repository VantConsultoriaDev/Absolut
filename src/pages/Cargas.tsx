import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, parseCurrency, createLocalDate } from '../utils/formatters';
import { undoService } from '../services/undoService';
import { Carga, MovimentacaoFinanceira, Trajeto, IntegrateData, initialIntegrateData } from '../types';
import {
  Plus,
  Search,
  RefreshCw,
  Upload,
  CreditCard,
  Calendar,
  Edit,
  Trash2,
  ArrowUp, // Ícone de ordenação
  ArrowDown, // Ícone de ordenação
} from 'lucide-react';
import { showError } from '../utils/toast';

// Importar componentes modulares e constantes
import RangeCalendar from '../components/RangeCalendar';
import CargasStats from '../components/cargas/CargasStats';
import CargaFormModal, { CargaFormData, TrajetoForm } from '../components/cargas/CargaFormModal';
import CargaLinkModal from '../components/cargas/CargaLinkModal';
import CargaIntegrateModal from '../components/cargas/CargaIntegrateModal';
import CargaImportModal from '../components/cargas/CargaImportModal';
import StatusChangeModal from '../components/StatusChangeModal';
import CargaDetailModal from '../components/cargas/CargaDetailModal';
import MultiSelectStatus from '../components/MultiSelectStatus'; // NOVO: Importando MultiSelectStatus
import ConfirmationModal from '../components/ConfirmationModal'; // Importando ConfirmationModal
import { UFS_ORDENADAS, STATUS_CONFIG, extrairUfECidade, getBaseCrt } from '../utils/cargasConstants'; // IMPORTANDO getBaseCrt

// Tipagem para a configuração de ordenação
type SortKey = 'crt' | 'origem' | 'destino' | 'dataColeta' | 'valor' | 'status';
type SortDirection = 'asc' | 'desc';

// NOVO: Mapeamento de prioridade de status para ordenação
const STATUS_ORDER: Record<Carga['status'], number> = {
  a_coletar: 1,
  em_transito: 2,
  armazenada: 3,
  entregue: 4,
  cancelada: 5,
};

const Cargas: React.FC = () => {
  const location = useLocation();
  const { 
    cargas, 
    createCarga, 
    updateCarga, 
    deleteCarga,
    veiculos,
    clientes,
    movimentacoes,
    createMovimentacao,
    deleteMovimentacao,
    buildMovimentacaoDescription,
    parceiros,
    motoristas
  } = useDatabase();

  // Definições iniciais movidas para dentro do componente ou inicializadas de forma simples
  const initialTrajeto: TrajetoForm = {
    index: 1,
    ufOrigem: '',
    cidadeOrigem: '',
    ufDestino: '',
    cidadeDestino: '',
    valor: formatCurrency(0), // Inicialização simples
    dataColeta: '', // ALTERADO: Vazio
    dataEntrega: '', // ALTERADO: Vazio
  };

  const initialFormData: CargaFormData = {
    crt: '',
    clienteId: '',
    dataColeta: '', // ALTERADO: Vazio
    dataEntrega: '', // ALTERADO: Vazio
    peso: '',
    observacoes: '',
    status: 'a_coletar',
    transbordo: 'sem_transbordo',
    trajetos: [{ ...initialTrajeto }],
  };

  const [showForm, setShowForm] = useState(false);
  const [editingCarga, setEditingCarga] = useState<Carga | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string[]>([]); // ALTERADO: Array de strings
  const [filterOrigem, setFilterOrigem] = useState(''); // NOVO: Filtro de Origem
  
  // Filtros de intervalo
  const [filterColetaStartDate, setFilterColetaStartDate] = useState('');
  const [filterColetaEndDate, setFilterColetaEndDate] = useState('');
  const [filterEntregaStartDate, setFilterEntregaStartDate] = useState('');
  const [filterEntregaEndDate, setFilterEntregaEndDate] = useState('');
  
  // Calendários ancorados state (mantidos)
  const [showColetaCalendar, setShowColetaCalendar] = useState(false);
  const [coletaCalendarPosition, setColetaCalendarPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
  const [coletaMonth, setColetaMonth] = useState<Date>(new Date());
  const [tempColetaStart, setTempColetaStart] = useState<Date | null>(null);
  const [tempColetaEnd, setTempColetaEnd] = useState<Date | null>(null);
  const [showEntregaCalendar, setShowEntregaCalendar] = useState(false);
  const [entregaCalendarPosition, setEntregaCalendarPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
  const [entregaMonth, setEntregaMonth] = useState<Date>(new Date());
  const [tempEntregaStart, setTempEntregaStart] = useState<Date | null>(null);
  const [tempEntregaEnd, setTempEntregaEnd] = useState<Date | null>(null);
  
  // Estado para o modal de status centralizado
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTargetCarga, setStatusTargetCarga] = useState<Carga | null>(null);
  
  // Estado para o modal de detalhes
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTargetCarga, setDetailTargetCarga] = useState<Carga | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<CargaFormData>(initialFormData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<CargaFormData | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Linking State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingCarga, setLinkingCarga] = useState<Carga | null>(null);
  const [linkingTrajetoIndex, setLinkingTrajetoIndex] = useState<number | undefined>(undefined); // NOVO
  const [selectedParceiro, setSelectedParceiro] = useState('');
  const [selectedMotorista, setSelectedMotorista] = useState('');
  const [selectedVeiculo, setSelectedVeiculo] = useState('');
  const [selectedCarretas, setSelectedCarretas] = useState<string[]>([]);

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);

  // Integrate State
  const [showIntegrateModal, setShowIntegrateModal] = useState(false);
  const [integratingCarga, setIntegratingCarga] = useState<Carga | null>(null);
  const [integrateData, setIntegrateData] = useState<IntegrateData>(initialIntegrateData);

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{id: string, descricao: string} | null>(null);
  
  // NOVO: Estado para deleção de carga dividida
  const [showSplitDeleteConfirm, setShowSplitDeleteConfirm] = useState(false);
  const [splitDeleteTarget, setSplitDeleteTarget] = useState<{ id: string, baseCrt: string, descricao: string } | null>(null);
  
  // ALTERADO: Estado de Ordenação Padrão
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({
    key: 'dataColeta',
    direction: 'asc',
  });

  // Mapeamento de status para o modal
  const cargaStatusOptions = useMemo(() => {
    return Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
      key: key as Carga['status'],
      label: cfg.label,
      icon: cfg.icon,
      textColor: cfg.textColor,
      color: cfg.color,
    }));
  }, []);
  
  // Mapeamento de status para o MultiSelect
  const multiSelectOptions = useMemo(() => {
    return Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
        key: key,
        label: cfg.label,
        // Mapeia a cor para o badge-color correspondente
        color: cfg.color.includes('green') ? 'bg-emerald-600' : 
               cfg.color.includes('blue') ? 'bg-blue-600' : 
               cfg.color.includes('purple') ? 'bg-purple-600' : 
               cfg.color.includes('orange') ? 'bg-amber-600' : 
               'bg-red-600'
    }));
  }, []);

  // Opções de filtro de Origem (País/Brasil)
  const origemFilterOptions = [
    { value: '', label: 'Todas as Origens' },
    { value: 'BR', label: 'Brasil' },
    { value: 'AR', label: 'Argentina' },
    { value: 'CL', label: 'Chile' },
    { value: 'UY', label: 'Uruguai' },
  ];

  // useEffect para aplicar filtro de status vindo da navegação
  useEffect(() => {
    if (location.state?.filterStatus) {
      // Se vier um status da navegação, define como o único selecionado
      setFilterStatus([location.state.filterStatus]);
    }
  }, [location.state]);

  // Reset para tela inicial quando navegado via menu lateral
  useEffect(() => {
    if (location.state?.resetModule) {
      performReset();
      setShowLinkModal(false);
      setLinkingCarga(null);
      setLinkingTrajetoIndex(undefined);
      setSelectedParceiro('');
      setSelectedMotorista('');
      setSelectedVeiculo('');
      setSelectedCarretas([]);
      setShowIntegrateModal(false);
      setIntegratingCarga(null);
      setIntegrateData(initialIntegrateData);
      setShowImportModal(false);
      setShowStatusModal(false);
      setStatusTargetCarga(null);
      setSearchTerm('');
      setFilterStatus([]); // ALTERADO: Limpar para array vazio
      setFilterOrigem(''); // NOVO: Limpar filtro de origem
      setFilterColetaStartDate('');
      setFilterColetaEndDate('');
      setFilterEntregaStartDate('');
      setFilterEntregaEndDate('');
      setShowColetaCalendar(false);
      setShowEntregaCalendar(false);
      // ALTERADO: Resetar ordenação para dataColeta crescente
      setSortConfig({ key: 'dataColeta', direction: 'asc' }); 
    }
  }, [location.state]);

  // Função auxiliar para obter o nome da cidade/país para exibição na tabela
  const getLocalDisplay = (localCompleto: string) => {
    const info = extrairUfECidade(localCompleto);
    // Se a UF for um código de país (AR, CL, UY) e a cidade estiver preenchida, mostra a cidade.
    if (['AR', 'CL', 'UY'].includes(info.uf) && info.cidade) {
        return `${info.cidade} - ${info.uf}`;
    }
    // Se for um código de país sem cidade, mostra o código.
    if (['AR', 'CL', 'UY'].includes(info.uf)) {
        return info.uf;
    }
    // Se for um local completo (Cidade - UF), retorna o local completo.
    if (info.uf && info.cidade) {
        return `${info.cidade} - ${info.uf}`;
    }
    // Caso contrário, retorna o valor bruto (que pode ser o CRT se o mapeamento falhou)
    return localCompleto;
  };
  
  // Handlers de Formulário (mantidos)
  const handleFormChange = (field: keyof CargaFormData, value: any) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };
      
      // Lógica de transbordo: se mudar para sem_transbordo, garante 1 trajeto
      if (field === 'transbordo' && value === 'sem_transbordo' && newFormData.trajetos.length > 1) {
        // A lógica de consolidação é feita no modal, mas garantimos o estado mínimo aqui
        newFormData.trajetos = [newFormData.trajetos[0]];
      }
      
      // Detectar se há mudanças comparando com os dados originais
      if (originalFormData) {
        const hasChanges = JSON.stringify(newFormData) !== JSON.stringify(originalFormData);
        setHasUnsavedChanges(hasChanges);
      }
      return newFormData;
    });
  };
  
  const handleTrajetoChange = (index: number, field: keyof TrajetoForm, value: string) => {
    setFormData(prev => {
      const newTrajetos = [...prev.trajetos];
      const currentTrajeto = newTrajetos[index];
      
      // 1. Atualiza o campo
      (currentTrajeto as any)[field] = value;
      
      // 2. Lógica de preenchimento automático (UF Origem = UF Destino anterior)
      if (index > 0 && (field === 'ufDestino' || field === 'cidadeDestino')) {
        const prevTrajeto = newTrajetos[index - 1];
        
        // Preenche UF Origem do trajeto atual com UF Destino do trajeto anterior
        currentTrajeto.ufOrigem = prevTrajeto.ufDestino;
        currentTrajeto.cidadeOrigem = prevTrajeto.cidadeDestino;
      }
      
      // 3. Lógica de preenchimento automático (UF Origem do próximo trajeto)
      if (index < newTrajetos.length - 1 && (field === 'ufDestino' || field === 'cidadeDestino')) {
        const nextTrajeto = newTrajetos[index + 1];
        nextTrajeto.ufOrigem = currentTrajeto.ufDestino;
        nextTrajeto.cidadeOrigem = currentTrajeto.cidadeDestino;
      }
      
      const newFormData = { ...prev, trajetos: newTrajetos };
      
      if (originalFormData) {
        const hasChanges = JSON.stringify(newFormData) !== JSON.stringify(originalFormData);
        setHasUnsavedChanges(hasChanges);
      }
      
      return newFormData;
    });
  };
  
  const handleAddTrajeto = () => {
    setFormData(prev => {
      const lastTrajeto = prev.trajetos[prev.trajetos.length - 1];
      
      // Validação básica antes de adicionar
      if (!lastTrajeto.ufDestino) {
        showError('Preencha a UF Destino do trajeto anterior antes de adicionar um transbordo.');
        return prev;
      }
      
      const newIndex = prev.trajetos.length + 1;
      const newTrajeto: TrajetoForm = {
        index: newIndex,
        ufOrigem: lastTrajeto.ufDestino,
        cidadeOrigem: lastTrajeto.cidadeDestino,
        ufDestino: '',
        cidadeDestino: '',
        valor: formatCurrency(0),
        dataColeta: '', // ALTERADO: Vazio
        dataEntrega: '', // ALTERADO: Vazio
      };
      
      const newFormData = { ...prev, trajetos: [...prev.trajetos, newTrajeto] };
      
      if (originalFormData) {
        const hasChanges = JSON.stringify(newFormData) !== JSON.stringify(originalFormData);
        setHasUnsavedChanges(hasChanges);
      }
      
      return newFormData;
    });
  };
  
  const handleRemoveTrajeto = (index: number) => {
    setFormData(prev => {
      const newTrajetos = prev.trajetos.filter((_, i) => i !== index);
      
      // Reajusta os índices e a origem do trajeto seguinte
      newTrajetos.forEach((trajeto, i) => {
        trajeto.index = i + 1;
        if (i > 0) {
          const prevTrajeto = newTrajetos[i - 1];
          trajeto.ufOrigem = prevTrajeto.ufDestino;
          trajeto.cidadeOrigem = prevTrajeto.cidadeDestino;
        }
      });
      
      const newFormData = { ...prev, trajetos: newTrajetos };
      
      if (originalFormData) {
        const hasChanges = JSON.stringify(newFormData) !== JSON.stringify(originalFormData);
        setHasUnsavedChanges(hasChanges);
      }
      
      return newFormData;
    });
  };

  const performReset = () => {
    setFormData(initialFormData);
    setEditingCarga(null);
    setShowForm(false);
    setHasUnsavedChanges(false);
    setOriginalFormData(null);
    setShowCancelConfirm(false);
  };

  const handleCloseForm = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
      return;
    }
    performReset();
  };

  const handleEdit = (carga: Carga) => {
    // Fecha o modal de detalhes se estiver aberto
    setShowDetailModal(false);
    setDetailTargetCarga(null);
    
    // Mapeia a carga para o formato do formulário
    const formDataToSet: CargaFormData = {
      crt: carga.crt || '',
      clienteId: carga.clienteId || '',
      // Datas globais são mantidas para compatibilidade, mas não são usadas no formulário
      dataColeta: carga.dataColeta ? format(new Date(carga.dataColeta), 'yyyy-MM-dd') : '', // ALTERADO: Vazio se não houver
      dataEntrega: carga.dataEntrega ? format(new Date(carga.dataEntrega), 'yyyy-MM-dd') : '', // ALTERADO: Vazio se não houver
      peso: carga.peso.toString(),
      observacoes: carga.observacoes || '',
      status: carga.status,
      transbordo: carga.transbordo,
      // Mapeia trajetos, garantindo que o valor seja formatado
      trajetos: (carga.trajetos || []).map(t => ({ // Garante que trajetos seja um array
        ...t,
        valor: formatCurrency(t.valor || 0),
        dataColeta: t.dataColeta || '', // ALTERADO: Vazio se não houver
        dataEntrega: t.dataEntrega || '', // ALTERADO: Vazio se não houver
      })) as TrajetoForm[],
    };
    
    // Se for sem transbordo, mas o array estiver vazio (erro de importação/sync), garante 1 trajeto
    if (formDataToSet.transbordo === 'sem_transbordo' && formDataToSet.trajetos.length === 0) {
        const origemInfo = extrairUfECidade(carga.origem);
        const destinoInfo = extrairUfECidade(carga.destino);
        formDataToSet.trajetos = [{
            index: 1,
            ufOrigem: origemInfo.uf,
            cidadeOrigem: origemInfo.cidade,
            ufDestino: destinoInfo.uf,
            cidadeDestino: destinoInfo.cidade,
            valor: formatCurrency(carga.valor || 0),
            dataColeta: carga.dataColeta ? format(carga.dataColeta, 'yyyy-MM-dd') : '', // ALTERADO: Vazio se não houver
            dataEntrega: carga.dataEntrega ? format(carga.dataEntrega, 'yyyy-MM-dd') : '', // ALTERADO: Vazio se não houver
        }];
    }

    setFormData(formDataToSet);
    setOriginalFormData(formDataToSet);
    setEditingCarga(carga);
    setShowForm(true);
    setHasUnsavedChanges(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.crt.length > 10) {
      showError('CRT deve ter no máximo 10 caracteres');
      return;
    }
    if (formData.trajetos.length === 0) {
        showError('A carga deve ter pelo menos um trajeto.');
        return;
    }
    
    // 1. Validação dos Trajetos
    for (const trajeto of formData.trajetos) {
        if (!trajeto.ufOrigem || !trajeto.ufDestino || parseCurrency(trajeto.valor) <= 0) {
            showError(`Trajeto ${trajeto.index} incompleto. Preencha UF Origem, UF Destino e Valor.`);
            return;
        }
    }
    
    // 2. Cálculo do Valor Total e Definição de Origem/Destino da Carga
    const valorTotal = formData.trajetos.reduce((sum, t) => sum + parseCurrency(t.valor), 0);
    const origemCarga = formData.trajetos[0];
    const destinoCarga = formData.trajetos[formData.trajetos.length - 1];
    
    // 3. Construção da Carga
    const cargaData: Omit<Carga, 'id' | 'createdAt' | 'updatedAt'> = {
      descricao: formData.crt || 'Carga sem descrição',
      // Origem e Destino da Carga são os pontos inicial e final
      origem: origemCarga.cidadeOrigem.trim() 
        ? `${origemCarga.cidadeOrigem.trim()} - ${origemCarga.ufOrigem}`
        : origemCarga.ufOrigem,
      destino: destinoCarga.cidadeDestino.trim() 
        ? `${destinoCarga.cidadeDestino.trim()} - ${destinoCarga.ufDestino}`
        : destinoCarga.ufDestino,
      peso: parseFloat(formData.peso),
      valor: valorTotal,
      // Datas globais são a coleta do primeiro trajeto e a entrega do último
      // ALTERADO: Só cria o objeto Date se a string não for vazia
      dataColeta: origemCarga.dataColeta ? createLocalDate(origemCarga.dataColeta) : undefined,
      dataEntrega: destinoCarga.dataEntrega ? createLocalDate(destinoCarga.dataEntrega) : undefined,
      status: formData.status,
      crt: formData.crt || undefined,
      clienteId: formData.clienteId || undefined,
      
      // Novos campos
      transbordo: formData.transbordo,
      trajetos: formData.trajetos.map(t => ({
          ...t,
          valor: parseCurrency(t.valor), // Salva o valor como número
          // ALTERADO: Garante que as datas sejam strings vazias ou YYYY-MM-DD
          dataColeta: t.dataColeta || undefined,
          dataEntrega: t.dataEntrega || undefined,
      })) as Trajeto[],
    };

    try {
      if (editingCarga) {
        // CORREÇÃO: Usar o ID da carga em edição
        updateCarga(editingCarga.id, cargaData);
      } else {
        createCarga(cargaData);
      }
      performReset();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar carga.');
    }
  };

  // Handlers de Ações (Delete, Status, Link, Integrate)
  const handleDelete = (id: string) => {
    const carga = cargas.find(c => c.id === id);
    if (!carga) return;
    
    const baseCrt = getBaseCrt(carga.crt);
    
    if (baseCrt) {
        // É uma carga dividida, pergunta ao usuário
        setSplitDeleteTarget({
            id: id,
            baseCrt: baseCrt,
            descricao: carga.descricao || carga.crt || 'Carga sem descrição'
        });
        setShowSplitDeleteConfirm(true);
    } else {
        // Carga normal, usa o modal de confirmação padrão
        setDeleteTarget({
            id: id,
            descricao: carga.descricao || carga.crt || 'Carga sem descrição'
        });
        setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = (deleteMode: 'single' | 'all' = 'single') => {
    let targetId: string | undefined;
    let targetDescription: string | undefined;
    let baseCrt: string | undefined;
    
    if (showSplitDeleteConfirm && splitDeleteTarget) {
        targetId = splitDeleteTarget.id;
        targetDescription = splitDeleteTarget.descricao;
        baseCrt = splitDeleteTarget.baseCrt;
    } else if (showDeleteConfirm && deleteTarget) {
        targetId = deleteTarget.id;
        targetDescription = deleteTarget.descricao;
    }
    
    if (!targetId || !targetDescription) return;
    
    const deletedCarga = cargas.find(c => c.id === targetId);
    if (!deletedCarga) return;
    
    // Se for deleção de todas as partes
    if (deleteMode === 'all' && baseCrt) {
        // Encontra todas as cargas com o mesmo CRT base
        const allParts = cargas.filter(c => getBaseCrt(c.crt) === baseCrt);
        const allIds = allParts.map(p => p.id);
        
        // Deleta todas as partes e suas movimentações associadas
        const associatedMovs = movimentacoes.filter(m => allIds.includes(m.cargaId || ''));
        
        allIds.forEach(id => deleteCarga(id));
        
        // Cria uma única ação de undo para todas as partes
        undoService.addUndoAction({
            type: 'delete_cargo_split_all',
            description: `Todas as partes da Carga base "${baseCrt}" (${allIds.length} partes) excluídas`,
            data: { deletedCargas: allParts, associatedMovs },
            undoFunction: async () => {
                allParts.forEach(carga => createCarga(carga));
                associatedMovs.forEach(mov => {
                    createMovimentacao({ ...mov, cargaId: mov.cargaId! });
                });
            }
        });
        
    } else {
        // Deleção de carga única (seja ela split ou não)
        const associatedMovs = movimentacoes.filter(m => m.cargaId === targetId);
        deleteCarga(targetId);
        
        undoService.addUndoAction({
            type: 'delete_cargo',
            description: `Carga "${targetDescription}" excluída`,
            data: { deletedCarga, associatedMovs },
            undoFunction: async () => {
                const restoredCarga = createCarga(deletedCarga);
                associatedMovs.forEach(mov => {
                    createMovimentacao({ ...mov, cargaId: restoredCarga.id });
                });
            }
        });
    }
    
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    setShowSplitDeleteConfirm(false);
    setSplitDeleteTarget(null);
  };

  const handleOpenStatusModal = (carga: Carga) => {
    setStatusTargetCarga(carga);
    setShowStatusModal(true);
  };

  const handleChangeStatus = (newStatus: string) => {
    if (statusTargetCarga) {
      try {
        updateCarga(statusTargetCarga.id, { status: newStatus as Carga['status'] });
        // showSuccess(`Status da carga ${statusTargetCarga.crt || statusTargetCarga.id} alterado para ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG].label}.`); // REMOVIDO
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Erro ao alterar status.');
      }
    }
    setStatusTargetCarga(null);
    setShowStatusModal(false);
  };
  
  const handleOpenDetailModal = (carga: Carga) => {
    setDetailTargetCarga(carga);
    setShowDetailModal(true);
  };
  
  const handleOpenLinkModal = (carga: Carga, trajetoIndex: number) => {
    // Não fecha o modal de detalhes, apenas abre o modal de link por cima.
    
    setLinkingCarga(carga);
    setLinkingTrajetoIndex(trajetoIndex);
    
    const trajeto = (carga.trajetos || []).find(t => t.index === trajetoIndex);
    
    // Preenche o estado com os vínculos existentes do trajeto
    setSelectedParceiro(trajeto?.parceiroId || '');
    setSelectedMotorista(trajeto?.motoristaId || '');
    setSelectedVeiculo(trajeto?.veiculoId || '');
    setSelectedCarretas(trajeto?.carretasSelecionadas || []);
    
    setShowLinkModal(true);
  };

  const handleSaveLink = () => {
    if (linkingCarga && linkingTrajetoIndex !== undefined) {
      try {
        const veiculoSelecionado = veiculos.find(v => v.id === selectedVeiculo);
        const isCavalo = veiculoSelecionado?.tipo === 'Cavalo';
        const carretasParaSalvar = isCavalo ? selectedCarretas : undefined;
        
        const updatedTrajetos = (linkingCarga.trajetos || []).map(t => {
            if (t.index === linkingTrajetoIndex) {
                return {
                    ...t,
                    parceiroId: selectedParceiro || undefined,
                    motoristaId: selectedMotorista || undefined,
                    veiculoId: selectedVeiculo || undefined,
                    carretasSelecionadas: carretasParaSalvar
                };
            }
            return t;
        });

        updateCarga(linkingCarga.id, {
          trajetos: updatedTrajetos
        });
        // showSuccess(`Vínculos do Trajeto ${linkingTrajetoIndex} da carga ${linkingCarga.crt || linkingCarga.id} salvos com sucesso.`); // REMOVIDO
        handleCloseLinkModal();
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Erro ao salvar vínculos.');
      }
    }
  };

  const handleCloseLinkModal = () => {
    setShowLinkModal(false);
    setLinkingCarga(null);
    setLinkingTrajetoIndex(undefined);
    setSelectedParceiro('');
    setSelectedMotorista('');
    setSelectedVeiculo('');
    setSelectedCarretas([]);
  };

  // Handlers de Integração Financeira
  const handleIntegrateFinanceiro = (carga: Carga) => {
    setIntegratingCarga(carga);
    setIntegrateData({
        ...initialIntegrateData,
        trajetoIndex: (carga.trajetos || []).length > 1 ? undefined : 1 // Seleciona 1 se for trajeto único
    });
    setShowIntegrateModal(true);
  };

  const handleCloseIntegrateModal = () => {
    setShowIntegrateModal(false);
    setIntegratingCarga(null);
    setIntegrateData(initialIntegrateData);
  };


  const handleIntegrateSubmit = () => {
    if (!integratingCarga || integrateData.trajetoIndex === undefined) {
        showError('Selecione um trajeto para integrar.');
        return;
    }
    
    const trajeto = (integratingCarga.trajetos || []).find(t => t.index === integrateData.trajetoIndex);
    if (!trajeto) {
        showError('Trajeto não encontrado.');
        return;
    }

    // --- VALIDAÇÕES DE PRÉ-LANÇAMENTO ---
    const relatedMovs = movimentacoes.filter(m => m.cargaId === integratingCarga.id && m.trajetoIndex === trajeto.index && m.categoria === 'FRETE');
    const hasAdiantamento = relatedMovs.some(m => m.descricao.startsWith('Adto -'));
    const hasSaldo = relatedMovs.some(m => m.descricao.startsWith('Saldo -'));
    const hasFreteUnico = relatedMovs.some(m => m.descricao.startsWith('Frete -'));

    if (hasFreteUnico) {
      showError(`O Trajeto ${trajeto.index} já possui lançamento único de Frete. Exclua a movimentação para reintegrar.`);
      return;
    }
    
    if (integrateData.splitOption === 'ambos' && (hasAdiantamento || hasSaldo)) {
        showError(`Não é possível lançar Adiantamento e Saldo juntos para o Trajeto ${trajeto.index}, pois uma das parcelas já foi lançada. Lance a parcela faltante individualmente.`);
        return;
    }
    
    if (integrateData.splitOption === 'adiantamento' && hasAdiantamento) {
        showError(`O Adiantamento para o Trajeto ${trajeto.index} já foi lançado.`);
        return;
    }
    
    if (integrateData.splitOption === 'saldo' && hasSaldo) {
        showError(`O Saldo para o Trajeto ${trajeto.index} já foi lançado.`);
        return;
    }
    // --- FIM VALIDAÇÕES ---

    try {
      const valorTrajeto = trajeto.valor;
      
      // 1. Cálculo dos Extras
      const calcularValorBRL = () => {
        if (!integrateData.despesasEnabled) return 0;
        const valorARS = parseCurrency(integrateData.valorARS || '');
        const taxa = parseCurrency(integrateData.taxaConversao || '');
        const extraBRL = parseCurrency(integrateData.valorBRLExtra || '');
        return (valorARS * taxa) + extraBRL;
      };
      const despesasAdicionais = calcularValorBRL();
      const diarias = integrateData.diariasEnabled ? parseCurrency(integrateData.valorDiarias || '') : 0;
      
      // Extras que serão consolidados (apenas no modo Adiantamento)
      const extrasConsolidados = (() => {
        let total = 0;
        if (integrateData.adiantamentoEnabled) {
            if (integrateData.despesasEnabled && integrateData.splitExtrasOption !== 'individual') {
                total += despesasAdicionais;
            }
            if (integrateData.diariasEnabled && integrateData.splitDiariasOption !== 'individual') {
                total += diarias;
            }
        }
        return total;
      })();
      
      // Extras que serão lançados individualmente (apenas no modo Adiantamento)
      /*
      const extrasIndividuais = (() => {
        let total = 0;
        if (integrateData.adiantamentoEnabled) {
            if (integrateData.despesasEnabled && integrateData.splitExtrasOption === 'individual') {
                total += despesasAdicionais;
            }
            if (integrateData.diariasEnabled && integrateData.splitDiariasOption === 'individual') {
                total += diarias;
            }
        }
        return total;
      })();
      */

      const movsToUndo: string[] = [];

      const createAndRegisterMov = (data: Omit<MovimentacaoFinanceira, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newMov = createMovimentacao(data);
        movsToUndo.push(newMov.id);
        return newMov;
      };
      
      // 2. Lançamento do Frete (ou parcelas)
      
      // Case 1: Sem Adiantamento (Lançamento Único de Frete)
      if (!integrateData.adiantamentoEnabled) {
        
        // Valor base do Frete (sem diárias)
        const valorFreteBase = valorTrajeto + despesasAdicionais;
        
        // Lógica de split de diárias
        if (integrateData.diariasEnabled && integrateData.calculoFreteOption === 'diarias_separadas') {
            // 2.1. Movimentação de Frete (Base + Despesas Adicionais)
            createAndRegisterMov({
              tipo: 'despesa',
              valor: valorFreteBase,
              descricao: buildMovimentacaoDescription(integratingCarga, 'Frete', trajeto.index),
              categoria: 'FRETE',
              data: createLocalDate(integrateData.dataVencimentoDespesa || format(new Date(), 'yyyy-MM-dd')),
              status: 'pendente',
              cargaId: integratingCarga.id,
              trajetoIndex: trajeto.index,
              observacoes: `Integração Trajeto ${trajeto.index}. Valor Base: ${formatCurrency(valorTrajeto)}${despesasAdicionais > 0 ? `, Despesas Adicionais: ${formatCurrency(despesasAdicionais)}` : ''}. Diárias lançadas separadamente.`
            });
            
            // 2.2. Movimentação de Diárias
            createAndRegisterMov({
              tipo: 'despesa',
              valor: diarias,
              descricao: buildMovimentacaoDescription(integratingCarga, 'Diárias', trajeto.index),
              categoria: 'DIARIA',
              data: createLocalDate(integrateData.dataVencimentoDiarias || format(new Date(), 'yyyy-MM-dd')),
              status: 'pendente',
              cargaId: integratingCarga.id,
              trajetoIndex: trajeto.index,
              observacoes: `Diárias Trajeto ${trajeto.index}.`
            });
            
        } else {
            // 2.1. Movimentação Única (Opção 'Total')
            const valorFinal = valorFreteBase + diarias;
            
            createAndRegisterMov({
              tipo: 'despesa',
              valor: valorFinal,
              descricao: buildMovimentacaoDescription(integratingCarga, 'Frete', trajeto.index),
              categoria: 'FRETE',
              data: createLocalDate(integrateData.dataVencimentoDespesa || format(new Date(), 'yyyy-MM-dd')),
              status: 'pendente',
              cargaId: integratingCarga.id,
              trajetoIndex: trajeto.index,
              observacoes: `Integração Trajeto ${trajeto.index}. Valor Base: ${formatCurrency(valorTrajeto)}${despesasAdicionais > 0 ? `, Despesas Adicionais: ${formatCurrency(despesasAdicionais)}` : ''}${diarias > 0 ? `, Diárias Consolidadas: ${formatCurrency(diarias)}` : ''}`
            });
        }
      } 
      // Case 2: Com Adiantamento (Split)
      else {
        const percentual = parseFloat(integrateData.adiantamentoPercentual || '0') / 100;
        const valorAdiantamento = valorTrajeto * percentual;
        const valorSaldo = valorTrajeto - valorAdiantamento;
        
        const somaOpcao = integrateData.somaOpcao;
        
        // 2.1. Determinar valores finais das parcelas de Frete
        let finalAdiantamento = valorAdiantamento;
        let finalSaldo = valorSaldo;
        
        // Se houver extras CONSOLIDADOS, eles são somados à parcela escolhida
        if (extrasConsolidados > 0) {
            if (integrateData.splitOption === 'ambos') {
                // No modo 'ambos', os extras consolidados são somados ao Saldo
                finalSaldo += extrasConsolidados;
            } else if (integrateData.splitOption === 'adiantamento' && somaOpcao === 'adiantamento') {
                finalAdiantamento += extrasConsolidados;
            } else if (integrateData.splitOption === 'saldo' && somaOpcao === 'saldo') {
                finalSaldo += extrasConsolidados;
            }
        }
        
        // 2.2. Lançar Adiantamento
        if (integrateData.splitOption === 'ambos' || integrateData.splitOption === 'adiantamento') {
          const dataAdiant = integrateData.dataVencimentoAdiantamento ? createLocalDate(integrateData.dataVencimentoAdiantamento) : createLocalDate(format(new Date(), 'yyyy-MM-dd'));
          createAndRegisterMov({
            tipo: 'despesa',
            valor: finalAdiantamento,
            descricao: buildMovimentacaoDescription(integratingCarga, 'Adto', trajeto.index),
            categoria: 'FRETE',
            data: dataAdiant,
            status: 'pendente',
            cargaId: integratingCarga.id,
            trajetoIndex: trajeto.index,
            observacoes: `Adiantamento Trajeto ${trajeto.index} (${integrateData.adiantamentoPercentual}%): ${formatCurrency(valorAdiantamento)}${finalAdiantamento > valorAdiantamento ? `, Extras Consolidados Incluídos: ${formatCurrency(finalAdiantamento - valorAdiantamento)}` : ''}`
          });
        }
        
        // 2.3. Lançar Saldo
        if (integrateData.splitOption === 'ambos' || integrateData.splitOption === 'saldo') {
          const dataSaldo = integrateData.dataVencimentoSaldo ? createLocalDate(integrateData.dataVencimentoSaldo) : createLocalDate(format(new Date(), 'yyyy-MM-dd'));
          createAndRegisterMov({
            tipo: 'despesa',
            valor: finalSaldo,
            descricao: buildMovimentacaoDescription(integratingCarga, 'Saldo', trajeto.index),
            categoria: 'FRETE',
            data: dataSaldo,
            status: 'pendente',
            cargaId: integratingCarga.id,
            trajetoIndex: trajeto.index,
            observacoes: `Saldo Trajeto ${trajeto.index} (${100 - parseFloat(integrateData.adiantamentoPercentual)}%): ${formatCurrency(valorSaldo)}${finalSaldo > valorSaldo ? `, Extras Consolidados Incluídos: ${formatCurrency(finalSaldo - valorSaldo)}` : ''}`
          });
        }
        
        // 2.4. Lançar Despesas Adicionais Individualmente
        if (integrateData.despesasEnabled && integrateData.splitExtrasOption === 'individual' && despesasAdicionais > 0) {
            const dataExtras = createLocalDate(integrateData.dataVencimentoExtras || format(new Date(), 'yyyy-MM-dd'));
            createAndRegisterMov({
                tipo: 'despesa',
                valor: despesasAdicionais,
                descricao: buildMovimentacaoDescription(integratingCarga, 'Despesas Adicionais', trajeto.index),
                categoria: 'OUTRAS DESPESAS',
                data: dataExtras,
                status: 'pendente',
                cargaId: integratingCarga.id,
                trajetoIndex: trajeto.index,
                observacoes: `Despesas Adicionais Trajeto ${trajeto.index} (Lançamento Individual).`
            });
        }
        
        // 2.5. Lançar Diárias Individualmente
        if (integrateData.diariasEnabled && integrateData.splitDiariasOption === 'individual' && diarias > 0) {
            const dataDiarias = createLocalDate(integrateData.dataVencimentoDiariasIndividual || format(new Date(), 'yyyy-MM-dd'));
            createAndRegisterMov({
                tipo: 'despesa',
                valor: diarias,
                descricao: buildMovimentacaoDescription(integratingCarga, 'Diárias', trajeto.index),
                categoria: 'DIARIA',
                data: dataDiarias,
                status: 'pendente',
                cargaId: integratingCarga.id,
                trajetoIndex: trajeto.index,
                observacoes: `Diárias Trajeto ${trajeto.index}.`
            });
        }
      }

      if (movsToUndo.length > 0) {
          undoService.addUndoAction({
              type: 'integrate_financial',
              description: `Integração financeira do Trajeto ${trajeto.index} da carga ${integratingCarga.crt || integratingCarga.id}`,
              data: { movIds: movsToUndo },
              undoFunction: async () => {
                  movsToUndo.forEach(id => deleteMovimentacao(id));
              }
          });
      }
      
      handleCloseIntegrateModal();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao integrar carga ao financeiro.');
    }
  };
  
  // Função para alternar a ordenação
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    } else {
      // Se for uma nova coluna, o padrão é crescente (asc)
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };
  
  // Lógica de Ordenação e Filtragem
  const filteredCargas = useMemo(() => {
    let sortedCargas = [...cargas];
    
    // 1. Filtragem (mantida)
    sortedCargas = sortedCargas.filter(carga => {
      const matchSearch = carga.crt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         carga.origem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         carga.destino?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Lógica de filtro de status
      const matchStatus = filterStatus.length === 0 || filterStatus.includes(carga.status);
      
      // Lógica de filtro de Origem (NOVO)
      let matchesOrigem = true;
      if (filterOrigem) {
        const firstTrajeto = (carga.trajetos || [])[0];
        const ufOrigem = firstTrajeto?.ufOrigem || '';
        
        if (filterOrigem === 'BR') {
          // Filtra por UFs brasileiras (excluindo AR, CL, UY)
          matchesOrigem = !['AR', 'CL', 'UY'].includes(ufOrigem);
        } else {
          // Filtra por UF/País específico (AR, CL, UY)
          matchesOrigem = ufOrigem === filterOrigem;
        }
      }
      
      let matchesColetaRange = true;
      if (filterColetaStartDate) {
        const startDate = createLocalDate(filterColetaStartDate);
        // ALTERADO: Verifica se a data existe antes de formatar
        const d = carga.dataColeta ? createLocalDate(format(carga.dataColeta, 'yyyy-MM-dd')) : null;
        // CORREÇÃO TS: Garante que a comparação só ocorra se d não for null
        matchesColetaRange = matchesColetaRange && (d ? d >= startDate : false);
      }
      if (filterColetaEndDate) {
        const endDate = createLocalDate(filterColetaEndDate);
        // ALTERADO: Verifica se a data existe antes de formatar
        const d = carga.dataColeta ? createLocalDate(format(carga.dataColeta, 'yyyy-MM-dd')) : null;
        // CORREÇÃO TS: Garante que a comparação só ocorra se d não for null
        matchesColetaRange = matchesColetaRange && (d ? d <= endDate : false);
      }

      let matchesEntregaRange = true;
      if (filterEntregaStartDate || filterEntregaEndDate) {
        if (!carga.dataEntrega) {
          matchesEntregaRange = false;
        } else {
          const de = createLocalDate(format(carga.dataEntrega, 'yyyy-MM-dd'));
          if (filterEntregaStartDate) {
            const es = createLocalDate(filterEntregaStartDate);
            matchesEntregaRange = matchesEntregaRange && de >= es;
          }
          if (filterEntregaEndDate) {
            const ee = createLocalDate(filterEntregaEndDate);
            matchesEntregaRange = matchesEntregaRange && de <= ee;
          }
        }
      }
      
      return matchSearch && matchStatus && matchesColetaRange && matchesEntregaRange && matchesOrigem;
    });
    
    // 2. Ordenação (NOVO)
    if (sortConfig.key) {
      sortedCargas.sort((a, b) => {
        let comparison = 0;
        
        // CRITÉRIO 1: Status (sempre ASC, seguindo STATUS_ORDER)
        const orderA = STATUS_ORDER[a.status as Carga['status']] || 99;
        const orderB = STATUS_ORDER[b.status as Carga['status']] || 99;
        
        comparison = orderA - orderB;
        if (comparison !== 0) return comparison;
        
        // CRITÉRIO 2: Coluna selecionada (se for diferente de status)
        if (sortConfig.key !== 'status') {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            
            let secondaryComparison = 0;
            
            if (sortConfig.key === 'dataColeta') {
              // ALTERADO: Trata undefined/null como 0 para ordenação
              const aTime = aValue ? new Date(aValue as Date).getTime() : 0;
              const bTime = bValue ? new Date(bValue as Date).getTime() : 0;
              secondaryComparison = aTime - bTime;
            } else if (sortConfig.key === 'valor') {
              secondaryComparison = (aValue as number) - (bValue as number);
            } else {
              // Ordenação alfabética para strings (CRT, origem, destino)
              const aStr = String(aValue || '').toLowerCase();
              const bStr = String(bValue || '').toLowerCase();
              if (aStr > bStr) secondaryComparison = 1;
              if (aStr < bStr) secondaryComparison = -1;
            }
            
            return sortConfig.direction === 'asc' ? secondaryComparison : -secondaryComparison;
        }
        
        // CRITÉRIO 3: Data de Coleta (Padrão ASC, se a ordenação for por status)
        const aTime = a.dataColeta ? new Date(a.dataColeta).getTime() : 0;
        const bTime = b.dataColeta ? new Date(b.dataColeta).getTime() : 0;
        return aTime - bTime;
      });
    } else {
        // Se não houver ordenação explícita, aplica a ordenação padrão (Status + Data Coleta ASC)
        sortedCargas.sort((a, b) => {
            const orderA = STATUS_ORDER[a.status as Carga['status']] || 99;
            const orderB = STATUS_ORDER[b.status as Carga['status']] || 99;
            
            let comparison = orderA - orderB;
            if (comparison !== 0) return comparison;
            
            const aTime = a.dataColeta ? new Date(a.dataColeta).getTime() : 0;
            const bTime = b.dataColeta ? new Date(b.dataColeta).getTime() : 0;
            return aTime - bTime;
        });
    }

    return sortedCargas;
  }, [cargas, searchTerm, filterStatus, filterColetaStartDate, filterColetaEndDate, filterEntregaStartDate, filterEntregaEndDate, filterOrigem, sortConfig]);

  // Stats calculation (mantida)
  const stats = useMemo(() => {
    const total = cargas.length;
    const aColetar = cargas.filter(c => c.status === 'a_coletar').length;
    const emTransito = cargas.filter(c => c.status === 'em_transito').length;
    const armazenadas = cargas.filter(c => c.status === 'armazenada').length;
    const entregues = cargas.filter(c => c.status === 'entregue').length;
    const valorTotal = cargas.reduce((sum, c) => sum + (c.valor || 0), 0);
    
    return { total, aColetar, emTransito, armazenadas, entregues, valorTotal };
  }, [cargas]);

  // Função para obter a rota simplificada (Origem do 1º trajeto -> Destino do último trajeto)
  const getSimplifiedRoute = (carga: Carga) => {
    if (!carga.trajetos || carga.trajetos.length === 0) return 'N/A';
    
    // CORREÇÃO AQUI: Usar o valor bruto da origem/destino da CARGA, que é o valor consolidado
    
    const origemDisplay = getLocalDisplay(carga.origem);
    const destinoDisplay = getLocalDisplay(carga.destino);
        
    return `${origemDisplay} → ${destinoDisplay}`;
  };
  
  // Função para verificar se a carga está integrada financeiramente
  const isCargaIntegrated = (carga: Carga) => {
    // CORREÇÃO: Garante que carga.trajetos seja um array antes de chamar map
    const trajetos = carga.trajetos || [];
    if (trajetos.length === 0) return false;
    
    // Uma carga é considerada integrada se todos os seus trajetos tiverem pelo menos uma movimentação de FRETE
    const trajetosIntegrados = trajetos.map(trajeto => {
        return movimentacoes.some(m => m.cargaId === carga.id && m.trajetoIndex === trajeto.index && m.categoria === 'FRETE');
    });
    return trajetosIntegrados.every(isIntegrated => isIntegrated);
  };
  
  // Componente auxiliar para o cabeçalho da tabela com ordenação
  const SortableHeader: React.FC<{ columnKey: SortKey, label: string }> = ({ columnKey, label }) => {
    const isSorted = sortConfig.key === columnKey;
    const direction = sortConfig.direction;
    
    const getIcon = () => {
      if (!isSorted) return null;
      return direction === 'asc' 
        ? <ArrowUp className="h-3 w-3 ml-1" /> 
        : <ArrowDown className="h-3 w-3 ml-1" />;
    };
    
    return (
      <th 
        className="table-header cursor-pointer hover:text-blue-500 transition-colors"
        onClick={() => requestSort(columnKey)}
      >
        <div className="flex items-center">
          {label}
          {getIcon()}
        </div>
      </th>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cargas</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestão de cargas e transportes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            <Upload className="h-5 w-5 mr-2" />
            Importar CSV/Excel
          </button>
          <button
            onClick={() => {
              performReset();
              // Garante que o estado inicial do formulário tenha 1 trajeto
              setFormData(initialFormData);
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Carga
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <CargasStats stats={stats} />

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por CRT, origem ou destino..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 h-11 text-sm"
            />
          </div>

          {/* Filtro de Origem (NOVO) */}
          <select
            value={filterOrigem}
            onChange={(e) => setFilterOrigem(e.target.value)}
            className="input-field h-11 text-sm"
          >
            {origemFilterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* ALTERADO: Usando MultiSelectStatus */}
          <MultiSelectStatus
            label="Status"
            options={multiSelectOptions}
            selectedKeys={filterStatus}
            onChange={setFilterStatus}
          />

          {/* Filtro Coleta (intervalo) */}
          <div className="no-uppercase">
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Coleta</label>
            <button
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setColetaCalendarPosition({
                  top: rect.bottom + 5, // CORRIGIDO: Removido window.scrollY
                  left: rect.left
                });
                const s = filterColetaStartDate ? createLocalDate(filterColetaStartDate) : null;
                const ed = filterColetaEndDate ? createLocalDate(filterColetaEndDate) : null;
                setTempColetaStart(s);
                setTempColetaEnd(ed);
                setColetaMonth(s || new Date());
                setShowColetaCalendar(true);
              }}
              className="input-field flex items-center justify-between h-11 text-sm"
            >
              <span className="text-sm whitespace-nowrap">
                {filterColetaStartDate && filterColetaEndDate
                  ? `${format(createLocalDate(filterColetaStartDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(createLocalDate(filterColetaEndDate), 'dd/MM/yyyy', { locale: ptBR })}`
                  : filterColetaStartDate
                    ? `De ${format(createLocalDate(filterColetaStartDate), 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Selecionar período'}
              </span>
              <Calendar className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Filtro Entrega (intervalo) */}
          <div className="no-uppercase">
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Entrega</label>
            <button
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setEntregaCalendarPosition({
                  top: rect.bottom + 5, // CORRIGIDO: Removido window.scrollY
                  left: rect.left
                });
                const s = filterEntregaStartDate ? createLocalDate(filterEntregaStartDate) : null;
                const ed = filterEntregaEndDate ? createLocalDate(filterEntregaEndDate) : null;
                setTempEntregaStart(s);
                setTempEntregaEnd(ed);
                setEntregaMonth(s || new Date());
                setShowEntregaCalendar(true);
              }}
              className="input-field flex items-center justify-between h-11 text-sm"
            >
              <span className="text-sm whitespace-nowrap">
                {filterEntregaStartDate && filterEntregaEndDate
                  ? `${format(createLocalDate(filterEntregaStartDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(createLocalDate(filterEntregaEndDate), 'dd/MM/yyyy', { locale: ptBR })}`
                  : filterEntregaStartDate
                    ? `De ${format(createLocalDate(filterEntregaStartDate), 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Selecionar período'}
              </span>
              <Calendar className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendário de Coleta (overlay ancorado) */}
      {showColetaCalendar && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowColetaCalendar(false)} />
          <div
            className="fixed z-50"
            style={{ top: `${coletaCalendarPosition.top}px`, left: `${coletaCalendarPosition.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <RangeCalendar
              month={coletaMonth}
              start={tempColetaStart}
              end={tempColetaEnd}
              onPrev={() => setColetaMonth(prev => subMonths(prev, 1))}
              onNext={() => setColetaMonth(prev => addMonths(prev, 1))}
              onSelectDate={(d) => {
                if (!tempColetaStart || (tempColetaStart && tempColetaEnd)) {
                  setTempColetaStart(d);
                  setTempColetaEnd(null);
                } else {
                  if (d < tempColetaStart) {
                    setTempColetaEnd(tempColetaStart);
                    setTempColetaStart(d);
                  } else {
                    setTempColetaEnd(d);
                  }
                }
              }}
              onClear={() => {
                setTempColetaStart(null);
                setTempColetaEnd(null);
                setFilterColetaStartDate('');
                setFilterColetaEndDate('');
                setShowColetaCalendar(false);
              }}
              onApply={() => {
                setFilterColetaStartDate(tempColetaStart ? format(tempColetaStart, 'yyyy-MM-dd') : '');
                setFilterColetaEndDate(tempColetaEnd ? format(tempColetaEnd, 'yyyy-MM-dd') : '');
                setShowColetaCalendar(false);
              }}
            />
          </div>
        </>
      )}

      {/* Calendário de Entrega (overlay ancorado) */}
      {showEntregaCalendar && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowEntregaCalendar(false)} />
          <div
            className="fixed z-50"
            style={{ top: `${entregaCalendarPosition.top}px`, left: `${entregaCalendarPosition.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <RangeCalendar
              month={entregaMonth}
              start={tempEntregaStart}
              end={tempEntregaEnd}
              onPrev={() => setEntregaMonth(prev => subMonths(prev, 1))}
              onNext={() => setEntregaMonth(prev => addMonths(prev, 1))}
              onSelectDate={(d) => {
                if (!tempEntregaStart || (tempEntregaStart && tempEntregaEnd)) {
                  setTempEntregaStart(d);
                  setTempEntregaEnd(null);
                } else {
                  if (d < tempEntregaStart) {
                    setTempEntregaEnd(tempEntregaStart);
                    setTempEntregaStart(d);
                  } else {
                    setTempEntregaEnd(d);
                  }
                }
              }}
              onClear={() => {
                setTempEntregaStart(null);
                setTempEntregaEnd(null);
                setFilterEntregaStartDate('');
                setFilterEntregaEndDate('');
                setShowEntregaCalendar(false);
              }}
              onApply={() => {
                setFilterEntregaStartDate(tempEntregaStart ? format(tempEntregaStart, 'yyyy-MM-dd') : '');
                setFilterEntregaEndDate(tempEntregaEnd ? format(tempEntregaEnd, 'yyyy-MM-dd') : '');
                setShowEntregaCalendar(false);
              }}
            />
          </div>
        </>
      )}

      {/* Tabela de Cargas */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <SortableHeader columnKey="crt" label="CRT" />
                <SortableHeader columnKey="origem" label="Rota" />
                <SortableHeader columnKey="dataColeta" label="Data Coleta" />
                <SortableHeader columnKey="valor" label="Valor Total" />
                <SortableHeader columnKey="status" label="Status" />
                <th className="table-header">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="table-card-body">
              {filteredCargas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Nenhuma carga encontrada
                  </td>
                </tr>
              ) : (
                filteredCargas.map((carga) => {
                  const integrated = isCargaIntegrated(carga);
                  
                  // Verifica se algum trajeto está pendente de vinculação
                  // const hasUnlinkedTrajeto = (carga.trajetos || []).some(t => !isTrajetoLinked(t)); // REMOVIDO TS6133
                  
                  return (
                  <tr 
                    key={carga.id} 
                    className="table-card-row cursor-pointer"
                    onClick={() => handleOpenDetailModal(carga)}
                  >
                    <td className="table-cell whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {carga.crt || '-'}
                    </td>
                    <td className="table-cell whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {getSimplifiedRoute(carga)}
                    </td>
                    <td className="table-cell whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {/* ALTERADO: Exibe '-' se a data for undefined */}
                      {carga.dataColeta ? format(new Date(carga.dataColeta), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </td>
                    <td className="table-cell whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(carga.valor || 0)}
                    </td>
                    <td className="table-cell whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_CONFIG[carga.status as keyof typeof STATUS_CONFIG].color}`}>
                        {STATUS_CONFIG[carga.status as keyof typeof STATUS_CONFIG]?.label || 'Desconhecido'}
                      </span>
                    </td>
                    <td className="table-cell whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(carga);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenStatusModal(carga);
                          }}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="Alterar status"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        
                        {/* Botão de Vinculação (Link) - REMOVIDO DA TABELA PRINCIPAL */}
                        
                        {/* Botão de Integração Financeira */}
                        {!integrated && (
                          <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleIntegrateFinanceiro(carga);
                            }}
                            className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 p-1 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                            title="Integrar Financeiro"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(carga.id);
                          }}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modals (mantidos) */}
      {showForm && (
        <CargaFormModal
          isOpen={showForm}
          formData={formData}
          editingCarga={editingCarga}
          clientes={clientes}
          ufsOrdenadas={UFS_ORDENADAS}
          hasUnsavedChanges={hasUnsavedChanges}
          onClose={handleCloseForm}
          onFormChange={handleFormChange}
          onTrajetoChange={handleTrajetoChange}
          onAddTrajeto={handleAddTrajeto}
          onRemoveTrajeto={handleRemoveTrajeto}
          onSubmit={handleSubmit}
          onConfirmCancel={performReset}
          showCancelConfirm={showCancelConfirm}
          setShowCancelConfirm={setShowCancelConfirm}
        />
      )}

      {showLinkModal && (
        <CargaLinkModal
          isOpen={showLinkModal}
          linkingCarga={linkingCarga}
          linkingTrajetoIndex={linkingTrajetoIndex}
          onClose={handleCloseLinkModal}
          onSave={handleSaveLink}
          selectedParceiro={selectedParceiro}
          setSelectedParceiro={setSelectedParceiro}
          selectedMotorista={selectedMotorista}
          setSelectedMotorista={setSelectedMotorista}
          selectedVeiculo={selectedVeiculo}
          setSelectedVeiculo={setSelectedVeiculo}
          selectedCarretas={selectedCarretas}
          setSelectedCarretas={setSelectedCarretas}
        />
      )}

      {showIntegrateModal && (
        <CargaIntegrateModal
          isOpen={showIntegrateModal}
          integratingCarga={integratingCarga}
          movimentacoes={movimentacoes}
          onClose={handleCloseIntegrateModal}
          onIntegrate={handleIntegrateSubmit}
          integrateData={integrateData}
          setIntegrateData={setIntegrateData}
        />
      )}

      {showImportModal && (
        <CargaImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          createCarga={(carga) => createCarga(carga)}
          deleteCarga={deleteCarga}
        />
      )}
      
      {/* Modal de Detalhes da Carga (NOVO) */}
      {showDetailModal && detailTargetCarga && (
        <CargaDetailModal
          isOpen={showDetailModal}
          carga={detailTargetCarga}
          onClose={() => {
              setShowDetailModal(false);
              setDetailTargetCarga(null);
          }}
          onEdit={handleEdit}
          onLinkTrajeto={handleOpenLinkModal}
          parceiros={parceiros}
          motoristas={motoristas}
          veiculos={veiculos}
          clientes={clientes}
          movimentacoes={movimentacoes}
        />
      )}
      
      {/* Modal de Alteração de Status (Cargas) */}
      {showStatusModal && statusTargetCarga && (
        <StatusChangeModal
          isOpen={showStatusModal}
          currentStatus={statusTargetCarga.status}
          statusOptions={cargaStatusOptions}
          entityName={`Carga ${statusTargetCarga.crt || statusTargetCarga.id}`}
          onClose={() => setShowStatusModal(false)}
          onSelectStatus={handleChangeStatus}
        />
      )}

      {/* Modal de confirmação de exclusão (Carga Normal) */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        onConfirm={() => confirmDelete('single')}
        title="Confirmar Exclusão"
        message={
          <>
            Tem certeza que deseja excluir a carga "{deleteTarget?.descricao}"? Esta ação também excluirá todas as movimentações financeiras associadas.
          </>
        }
        confirmText="Excluir Carga"
        variant="danger"
      />
      
      {/* Modal de confirmação de exclusão (Carga Dividida) */}
      <ConfirmationModal
        isOpen={showSplitDeleteConfirm}
        onClose={() => {
          setShowSplitDeleteConfirm(false);
          setSplitDeleteTarget(null);
        }}
        onConfirm={() => confirmDelete('single')} // onConfirm é o fallback, mas usaremos os botões customizados
        title="Excluir Carga Dividida"
        message={
          <>
            A carga "{splitDeleteTarget?.descricao}" faz parte de uma operação de divisão (CRT base: <span className="font-semibold">{splitDeleteTarget?.baseCrt}</span>).
            <p className="mt-3">O que você deseja excluir?</p>
          </>
        }
        variant="warning"
      >
        <div className="flex space-x-3 mt-4">
          <button
            type="button"
            onClick={() => {
              setShowSplitDeleteConfirm(false);
              confirmDelete('all');
            }}
            className="flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium bg-red-600 hover:bg-red-700"
          >
            Excluir TODAS as partes ({splitDeleteTarget?.baseCrt})
          </button>
          <button
            type="button"
            onClick={() => confirmDelete('single')}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Excluir SOMENTE esta parte
          </button>
        </div>
      </ConfirmationModal>
    </div>
  );
};

export default Cargas;