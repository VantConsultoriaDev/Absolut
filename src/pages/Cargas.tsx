import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { format } from 'date-fns';
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
  Edit,
  Trash2,
  ArrowUp, // Ícone de ordenação
  ArrowDown, // Ícone de ordenação
} from 'lucide-react';
import { showError } from '../utils/toast';

// Importar componentes modulares e constantes
import CargasStats from '../components/cargas/CargasStats';
import CargaFormModal, { CargaFormData, TrajetoForm } from '../components/cargas/CargaFormModal';
import CargaLinkModal from '../components/cargas/CargaLinkModal';
import CargaIntegrateModal from '../components/cargas/CargaIntegrateModal';
import CargaImportModal from '../components/cargas/CargaImportModal';
import StatusChangeModal from '../components/StatusChangeModal';
import CargaDetailModal from '../components/cargas/CargaDetailModal';
import MultiSelectStatus from '../components/MultiSelectStatus'; // NOVO: Importando MultiSelectStatus
import ConfirmationModal from '../components/ConfirmationModal'; // Importando ConfirmationModal
import DateRangeFilter from '../components/DateRangeFilter'; // NOVO: Importando o componente unificado
import { UFS_ORDENADAS, STATUS_CONFIG, extrairUfECidade, getBaseCrt } from '../utils/cargasConstants'; // IMPORTANDO getBaseCrt

// Tipagem para a configuração de ordenação
type SortKey = 'crt' | 'origem' | 'destino' | 'dataColeta' | 'valor' | 'status';
type SortDirection = 'asc' | 'desc';

// NOVO: Definição da ordem de status para ordenação
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
    cargas: rawCargas, // Renomeado para evitar conflito
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
  
  // Garantindo que cargas seja sempre um array
  const cargas = rawCargas || [];

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
    dataColeta: '', // Global dates are kept for compatibility but not used in logic
    dataEntrega: '', // Global dates are kept for compatibility but not used in logic
    peso: '',
    observacoes: '',
    status: 'a_coletar',
    transbordo: 'sem_transbordo',
    trajetos: [{ ...initialTrajeto }],
    tipoOperacao: 'exportacao', // NOVO: Padrão para exportação
  };

  const [showForm, setShowForm] = useState(false);
  const [editingCarga, setEditingCarga] = useState<Carga | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string[]>([]); // ALTERADO: Array de strings
  const [filterOrigem, setFilterOrigem] = useState(''); // NOVO: Filtro de Origem
  
  // Filtros de intervalo (mantidos)
  const [filterColetaStartDate, setFilterColetaStartDate] = useState('');
  const [filterColetaEndDate, setFilterColetaEndDate] = useState('');
  const [filterEntregaStartDate, setFilterEntregaStartDate] = useState('');
  const [filterEntregaEndDate, setFilterEntregaEndDate] = useState('');
  
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
  
  // --- FUNÇÕES AUSENTES ---
  
  // 1. Cálculo de Estatísticas (stats)
  const stats = useMemo(() => {
    const aColetar = cargas.filter(carga => carga.status === 'a_coletar').length
    const emTransito = cargas.filter(carga => carga.status === 'em_transito').length
    const armazenadas = cargas.filter(carga => carga.status === 'armazenada').length
    const entregues = cargas.filter(carga => carga.status === 'entregue').length
    
    const total = cargas.length
    const valorTotal = cargas.reduce((sum, carga) => sum + (carga.valor || 0), 0)
    
    return { 
      aColetar, 
      emTransito, 
      armazenadas, 
      entregues, 
      total,
      valorTotal
    }
  }, [cargas]);
  
  // 2. Lógica de Filtro e Ordenação (filteredCargas)
  const filteredCargas = useMemo(() => {
    let sortedMovs = cargas.filter(carga => {
      const matchSearch = (carga.crt || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (carga.origem || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (carga.destino || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = filterStatus.length === 0 || filterStatus.includes(carga.status);
      
      // Filtro de Origem (UF/País)
      const origemInfo = extrairUfECidade(carga.origem || '');
      const matchOrigem = !filterOrigem || 
                          (filterOrigem === 'BR' && UFS_ORDENADAS.some(u => u.value === origemInfo.uf && u.label.includes('Brasil'))) ||
                          (filterOrigem !== 'BR' && origemInfo.uf === filterOrigem);
      
      // Filtro por Data de Coleta
      let matchesColetaRange = true;
      if (filterColetaStartDate && carga.dataColeta) {
        const startDate = createLocalDate(filterColetaStartDate);
        const d = createLocalDate(format(new Date(carga.dataColeta), 'yyyy-MM-dd'));
        matchesColetaRange = matchesColetaRange && d >= startDate;
      }
      if (filterColetaEndDate && carga.dataColeta) {
        const endDate = createLocalDate(filterColetaEndDate);
        const d = createLocalDate(format(new Date(carga.dataColeta), 'yyyy-MM-dd'));
        matchesColetaRange = matchesColetaRange && d <= endDate;
      }

      // Filtro por Data de Entrega
      let matchesEntregaRange = true;
      if (filterEntregaStartDate && carga.dataEntrega) {
        const startDate = createLocalDate(filterEntregaStartDate);
        const d = createLocalDate(format(new Date(carga.dataEntrega), 'yyyy-MM-dd'));
        matchesEntregaRange = matchesEntregaRange && d >= startDate;
      }
      if (filterEntregaEndDate && carga.dataEntrega) {
        const endDate = createLocalDate(filterEntregaEndDate);
        const d = createLocalDate(format(new Date(carga.dataEntrega), 'yyyy-MM-dd'));
        matchesEntregaRange = matchesEntregaRange && d <= endDate;
      }
      
      return matchSearch && matchStatus && matchOrigem && matchesColetaRange && matchesEntregaRange;
    });
    
    // 2. Ordenação
    if (sortConfig.key) {
      sortedMovs.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        let comparison = 0;
        
        if (sortConfig.key === 'dataColeta') {
          const aTime = aValue ? new Date(aValue as Date).getTime() : 0;
          const bTime = bValue ? new Date(bValue as Date).getTime() : 0;
          comparison = aTime - bTime;
        } else if (sortConfig.key === 'valor') {
          comparison = (aValue as number) - (bValue as number);
        } else if (sortConfig.key === 'status') {
          comparison = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        } else {
          const aStr = String(aValue || '').toLowerCase();
          const bStr = String(bValue || '').toLowerCase();
          if (aStr > bStr) comparison = 1;
          if (aStr < bStr) comparison = -1;
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return sortedMovs;
  }, [cargas, searchTerm, filterStatus, filterOrigem, filterColetaStartDate, filterColetaEndDate, filterEntregaStartDate, filterEntregaEndDate, sortConfig]);
  
  // 3. Função para verificar se a carga está integrada (isCargaIntegrated)
  const isCargaIntegrated = useCallback((carga: Carga): boolean => {
    // Uma carga é considerada integrada se TODOS os seus trajetos tiverem movimentações de FRETE associadas
    if (!carga.trajetos || carga.trajetos.length === 0) return false;
    
    return carga.trajetos.every(trajeto => {
        const relatedMovs = movimentacoes.filter(m => 
            m.cargaId === carga.id && 
            m.trajetoIndex === trajeto.index && 
            m.categoria === 'FRETE'
        );
        
        // Considera integrado se houver pelo menos um lançamento de Frete (Frete Único, Adto ou Saldo)
        return relatedMovs.length > 0;
    });
  }, [movimentacoes]);
  
  // 4. Função para rota simplificada (getSimplifiedRoute)
  const getSimplifiedRoute = useCallback((carga: Carga): string => {
    if (!carga.trajetos || carga.trajetos.length === 0) {
        return `${getLocalDisplay(carga.origem)} → ${getLocalDisplay(carga.destino)}`;
    }
    
    const primeiro = carga.trajetos[0];
    const ultimo = carga.trajetos[carga.trajetos.length - 1];
    
    const origemDisplay = primeiro.cidadeOrigem.trim() ? `${primeiro.cidadeOrigem} - ${primeiro.ufOrigem}` : primeiro.ufOrigem;
    const destinoDisplay = ultimo.cidadeDestino.trim() ? `${ultimo.cidadeDestino} - ${ultimo.ufDestino}` : ultimo.ufDestino;
    
    if (carga.trajetos.length > 1) {
        return `${origemDisplay} → ... → ${destinoDisplay}`;
    }
    
    return `${origemDisplay} → ${destinoDisplay}`;
  }, []);
  
  // 5. Função auxiliar para obter o nome da cidade/país para exibição na tabela (getLocalDisplay)
  const getLocalDisplay = (localCompleto: string) => {
    const info = extrairUfECidade(localCompleto);
    if (['AR', 'CL', 'UY'].includes(info.uf) && info.cidade) {
        return `${info.cidade} - ${info.uf}`;
    }
    if (info.uf && info.cidade) {
        return `${info.cidade} - ${info.uf}`;
    }
    return localCompleto;
  };
  
  // --- FIM FUNÇÕES AUSENTES ---

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
      // ALTERADO: Resetar ordenação para dataColeta crescente
      setSortConfig({ key: 'dataColeta', direction: 'asc' }); 
    }
  }, [location.state]);

  // Handlers de Formulário (mantidos)
  const handleFormChange = (field: keyof CargaFormData, value: any) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };
      
      // Lógica de transbordo: se mudar para sem_transbordo, garante 1 trajeto
      if (field === 'transbordo' && value === 'sem_transbordo' && newFormData.trajetos.length > 1) {
        // A lógica de consolidação é feita no modal, mas garantimos o estado mínimo aqui
        newFormData.trajetos = [newFormData.trajetos[0]];
      }
      
      // Lógica de tipoOperacao: se mudar, limpa a UF de origem do primeiro trajeto
      if (field === 'tipoOperacao') {
          newFormData.trajetos[0].ufOrigem = '';
          newFormData.trajetos[0].cidadeOrigem = '';
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
      
      // NOVO: Lógica de transferência de destino para destino e limpeza do destino anterior
      const newIndex = prev.trajetos.length + 1;
      
      // 1. Cria o novo trajeto
      const newTrajeto: TrajetoForm = {
        index: newIndex,
        // A origem do novo trajeto é o destino do trajeto anterior (antes de ser limpo)
        ufOrigem: lastTrajeto.ufDestino, 
        cidadeOrigem: lastTrajeto.cidadeDestino, 
        // O destino do novo trajeto é o destino do trajeto anterior (antes de ser limpo)
        ufDestino: lastTrajeto.ufDestino, 
        cidadeDestino: lastTrajeto.cidadeDestino, 
        valor: formatCurrency(0),
        dataColeta: '', 
        dataEntrega: '', 
      };
      
      // 2. Limpa o destino do trajeto anterior
      const updatedLastTrajeto = {
          ...lastTrajeto,
          ufDestino: '', // Limpa o destino anterior
          cidadeDestino: '', // Limpa a cidade destino anterior
      };
      
      // 3. Atualiza o array de trajetos
      const newTrajetos = [...prev.trajetos.slice(0, -1), updatedLastTrajeto, newTrajeto];
      
      const newFormData = { ...prev, trajetos: newTrajetos };
      
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
      
      // Se o trajeto removido era o último, e o penúltimo agora é o último,
      // precisamos garantir que o destino do novo último trajeto seja o destino final da carga.
      if (newTrajetos.length > 0 && index === prev.trajetos.length - 1) {
          // Se o destino final da carga original era o destino do trajeto removido,
          // precisamos restaurar o destino final no novo último trajeto.
          // Como a lógica de remoção não limpa o destino do penúltimo, isso deve funcionar.
      }
      
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
      tipoOperacao: carga.tipoOperacao || 'exportacao', // NOVO: Carrega tipoOperacao
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
    
    // 1. Validação de CRT (REMOVIDA A VALIDAÇÃO DE 10 CARACTERES AQUI)
    
    if (formData.trajetos.length === 0) {
        showError('A carga deve ter pelo menos um trajeto.');
        return;
    }
    
    // 2. Validação dos Trajetos
    for (const trajeto of formData.trajetos) {
        if (!trajeto.ufOrigem || parseCurrency(trajeto.valor) <= 0) {
            showError(`Trajeto ${trajeto.index} incompleto. Preencha UF Origem e Valor.`);
            return;
        }
    }
    
    // 3. Cálculo do Valor Total e Definição de Origem/Destino da Carga
    const valorTotal = formData.trajetos.reduce((sum, t) => sum + parseCurrency(t.valor), 0);
    const origemCarga = formData.trajetos[0];
    const destinoCarga = formData.trajetos[formData.trajetos.length - 1];
    
    // 4. Construção da Carga
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
      
      // NOVO CAMPO
      tipoOperacao: formData.tipoOperacao,
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
        // NOVO: Se for Cavalo, usa as carretas selecionadas no modal. Se for Truck, usa undefined.
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
  
  // --- Configuração do Filtro de Data Unificado ---
  const dateFilterOptions = useMemo(() => [
    {
      key: 'coleta',
      label: 'Data Coleta',
      startState: filterColetaStartDate,
      endState: filterColetaEndDate,
      setStart: setFilterColetaStartDate,
      setEnd: setFilterColetaEndDate,
    },
    {
      key: 'entrega',
      label: 'Data Entrega',
      startState: filterEntregaStartDate,
      endState: filterEntregaEndDate,
      setStart: setFilterEntregaStartDate,
      setEnd: setFilterEntregaEndDate,
    },
  ], [filterColetaStartDate, filterColetaEndDate, filterEntregaStartDate, filterEntregaEndDate]);


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

          {/* Filtro de Data Unificado (2 colunas) */}
          <div className="md:col-span-2">
            <DateRangeFilter
              options={dateFilterOptions}
            />
          </div>
        </div>
      </div>

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
                filteredCargas.map((carga: Carga) => {
                  const integrated = isCargaIntegrated(carga);
                  
                  // Verifica se algum trajeto está pendente de vinculação
                  
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