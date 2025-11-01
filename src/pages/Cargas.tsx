import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, parseCurrency } from '../utils/formatters';
import { undoService } from '../services/undoService';
import { Carga } from '../types';
import {
  Plus,
  Search,
  RefreshCw,
  Link,
  Upload,
  CreditCard,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
} from 'lucide-react';

// Importar componentes modulares e constantes
import RangeCalendar from '../components/RangeCalendar';
import CargasStats from '../components/cargas/CargasStats';
import CargaFormModal, { CargaFormData } from '../components/cargas/CargaFormModal';
import CargaLinkModal from '../components/cargas/CargaLinkModal';
import CargaIntegrateModal from '../components/cargas/CargaIntegrateModal';
import CargaImportModal from '../components/cargas/CargaImportModal';
import { UFS_ORDENADAS, STATUS_CONFIG } from '../utils/cargasConstants';

// Define IntegrateData structure locally for Cargas.tsx state
interface IntegrateData {
  adiantamentoEnabled: boolean;
  adiantamentoPercentual: string;
  dataVencimentoAdiantamento: string;
  dataVencimentoSaldo: string;
  dataVencimentoDespesa: string;
  despesasEnabled: boolean;
  valorARS: string;
  taxaConversao: string;
  valorBRL: string;
  valorBRLExtra: string;
  diariasEnabled: boolean;
  valorDiarias: string;
  somaOpcao: 'adiantamento' | 'saldo';
  splitOption: 'ambos' | 'adiantamento' | 'saldo'; // NOVO CAMPO
}

const initialFormData: CargaFormData = {
  crt: '',
  origem: '',
  destino: '',
  clienteId: '',
  ufOrigemSelecionada: '',
  cidadeOrigem: '',
  ufDestinoSelecionada: '',
  cidadeDestino: '',
  dataColeta: format(new Date(), 'yyyy-MM-dd'),
  dataEntrega: format(new Date(), 'yyyy-MM-dd'),
  valor: '',
  peso: '',
  observacoes: '',
  status: 'a_coletar'
};

const initialIntegrateData: IntegrateData = {
  adiantamentoEnabled: false,
  adiantamentoPercentual: '70',
  dataVencimentoAdiantamento: '',
  dataVencimentoSaldo: '',
  dataVencimentoDespesa: format(new Date(), 'yyyy-MM-dd'),
  despesasEnabled: false,
  valorARS: '',
  taxaConversao: '',
  valorBRL: '',
  valorBRLExtra: '',
  diariasEnabled: false,
  valorDiarias: '',
  somaOpcao: 'adiantamento',
  splitOption: 'ambos' // NOVO VALOR INICIAL
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
    createMovimentacao,
    movimentacoes,
    buildMovimentacaoDescription,
    // generateContract, // Removido
    deleteMovimentacao, // Adicionado para o undo
  } = useDatabase();

  const [showForm, setShowForm] = useState(false);
  const [editingCarga, setEditingCarga] = useState<Carga | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Filtros de intervalo: Coleta e Entrega
  const [filterColetaStartDate, setFilterColetaStartDate] = useState('');
  const [filterColetaEndDate, setFilterColetaEndDate] = useState('');
  const [filterEntregaStartDate, setFilterEntregaStartDate] = useState('');
  const [filterEntregaEndDate, setFilterEntregaEndDate] = useState('');
  
  // Calendários ancorados state
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
  
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number} | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<CargaFormData>(initialFormData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<CargaFormData | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Linking State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingCarga, setLinkingCarga] = useState<Carga | null>(null);
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

  // useEffect para aplicar filtro de status vindo da navegação
  useEffect(() => {
    if (location.state?.filterStatus) {
      setFilterStatus(location.state.filterStatus);
    }
  }, [location.state]);

  // Função auxiliar para extrair UF e cidade de uma string (Corrigida)
  const extrairUfECidade = (localCompleto: string) => {
    if (localCompleto.toLowerCase() === 'internacional') {
      return { uf: 'internacional', cidade: '' };
    }
    
    // Tenta encontrar o formato "Cidade - UF"
    const match = localCompleto.match(/(.*)\s-\s([A-Z]{2})$/);
    
    if (match) {
      const cidade = match[1].trim();
      const uf = match[2].trim();
      return { uf, cidade };
    } 
    
    // Se for apenas a UF (ou um nome de cidade sem UF)
    const ufOption = UFS_ORDENADAS.find(u => u.value === localCompleto);
    if (ufOption) {
      return { uf: localCompleto, cidade: '' };
    }

    // Se for um nome de cidade/país internacional que foi salvo como origem/destino
    if (localCompleto.length > 0) {
      return { uf: 'internacional', cidade: localCompleto };
    }

    return { uf: '', cidade: '' };
  };

  // Handlers de Formulário
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };
      
      // Detectar se há mudanças comparando com os dados originais
      if (originalFormData) {
        const hasChanges = Object.keys(newFormData).some(key => 
          (newFormData as any)[key] !== (originalFormData as any)[key]
        );
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
    const origemInfo = extrairUfECidade(carga.origem);
    const destinoInfo = extrairUfECidade(carga.destino);
    
    const formDataToSet: CargaFormData = {
      crt: carga.crt || '', // CRT não obrigatório
      origem: carga.origem,
      destino: carga.destino,
      clienteId: carga.clienteId || '',
      ufOrigemSelecionada: origemInfo.uf,
      cidadeOrigem: origemInfo.cidade,
      ufDestinoSelecionada: destinoInfo.uf,
      cidadeDestino: destinoInfo.cidade,
      dataColeta: format(new Date(carga.dataColeta || new Date()), 'yyyy-MM-dd'),
      dataEntrega: format(new Date(carga.dataEntrega || new Date()), 'yyyy-MM-dd'),
      // CORREÇÃO: Formatar o valor numérico para string monetária
      valor: formatCurrency(carga.valor || 0),
      peso: carga.peso.toString(),
      observacoes: carga.observacoes || '',
      status: carga.status
    };
    
    setFormData(formDataToSet);
    setOriginalFormData(formDataToSet);
    setEditingCarga(carga);
    setShowForm(true);
    setHasUnsavedChanges(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.crt.length > 10) {
      alert('CRT deve ter no máximo 10 caracteres');
      return;
    }
    if (!formData.ufOrigemSelecionada || !formData.ufDestinoSelecionada) {
      alert('Selecione a UF de origem e destino');
      return;
    }
    
    // 1. Construção da Origem Completa
    let origemCompleta: string;
    if (formData.ufOrigemSelecionada.toLowerCase() === 'internacional') {
      // Se for internacional, a origem é a cidade/país digitado, ou 'Internacional' se vazio
      origemCompleta = formData.cidadeOrigem.trim() || 'Internacional';
    } else {
      // Se for nacional, usa Cidade - UF, ou apenas UF se a cidade estiver vazia
      origemCompleta = formData.cidadeOrigem.trim() 
        ? `${formData.cidadeOrigem.trim()} - ${formData.ufOrigemSelecionada}`
        : formData.ufOrigemSelecionada;
    }

    // 2. Construção do Destino Completo
    let destinoCompleta: string;
    if (formData.ufDestinoSelecionada.toLowerCase() === 'internacional') {
      // Se for internacional, o destino é a cidade/país digitado, ou 'Internacional' se vazio
      destinoCompleta = formData.cidadeDestino.trim() || 'Internacional';
    } else {
      // Se for nacional, usa Cidade - UF, ou apenas UF se a cidade estiver vazia
      destinoCompleta = formData.cidadeDestino.trim() 
        ? `${formData.cidadeDestino.trim()} - ${formData.ufDestinoSelecionada}`
        : formData.ufDestinoSelecionada;
    }
    
    const cargaData: Omit<Carga, 'id' | 'createdAt' | 'updatedAt'> = {
      descricao: formData.crt || 'Carga sem descrição',
      origem: origemCompleta,
      destino: destinoCompleta,
      peso: parseFloat(formData.peso),
      valor: parseCurrency(formData.valor),
      dataColeta: new Date(formData.dataColeta),
      dataEntrega: new Date(formData.dataEntrega),
      status: formData.status,
      crt: formData.crt || undefined, // CRT pode ser undefined
      clienteId: formData.clienteId || undefined
    };

    if (editingCarga) {
      updateCarga(editingCarga.id, cargaData);
    } else {
      createCarga(cargaData);
    }

    performReset();
  };

  // Handlers de Ações
  const handleDelete = (id: string) => {
    const carga = cargas.find(c => c.id === id);
    if (carga) {
      setDeleteTarget({
        id: id,
        descricao: carga.descricao || carga.crt || 'Carga sem descrição'
      });
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      const deletedCarga = cargas.find(c => c.id === deleteTarget.id);
      
      if (deletedCarga) {
        // 1. Salvar movimentações associadas para o undo
        const associatedMovs = movimentacoes.filter(m => m.cargaId === deletedCarga.id);
        
        // 2. Deletar a carga (que agora deleta as movimentações em cascata no context)
        deleteCarga(deletedCarga.id);
        
        // 3. Adicionar ação de desfazer
        undoService.addUndoAction({
          type: 'delete_cargo',
          description: `Carga "${deleteTarget.descricao}" excluída`,
          data: { deletedCarga, associatedMovs },
          undoFunction: async () => {
            const restoredCarga = createCarga(deletedCarga);
            // Restaurar movimentações
            associatedMovs.forEach(mov => {
              // Garante que a movimentação restaurada aponte para o novo ID da carga restaurada
              createMovimentacao({ ...mov, cargaId: restoredCarga.id });
            });
          }
        });
      }
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const handleChangeStatus = (id: string, newStatus: Carga['status']) => {
    updateCarga(id, { status: newStatus });
    setShowStatusDropdown(null);
  };

  // Handlers de Vinculação
  const handleLinkParceiro = (carga: Carga) => {
    setLinkingCarga(carga);
    setSelectedParceiro(carga.parceiroId || '');
    setSelectedMotorista(carga.motoristaId || '');
    setSelectedVeiculo(carga.veiculoId || '');
    setSelectedCarretas(carga.carretasSelecionadas || []);
    setShowLinkModal(true);
  };

  const handleSaveLink = () => {
    if (linkingCarga) {
      const veiculoSelecionado = veiculos.find(v => v.id === selectedVeiculo);
      const isCavalo = veiculoSelecionado?.tipo === 'Cavalo';
      
      const carretasParaSalvar = isCavalo ? selectedCarretas : undefined;

      updateCarga(linkingCarga.id, {
        parceiroId: selectedParceiro || undefined,
        motoristaId: selectedMotorista || undefined,
        veiculoId: selectedVeiculo || undefined,
        carretasSelecionadas: carretasParaSalvar
      });
      handleCloseLinkModal();
    }
  };

  const handleCloseLinkModal = () => {
    setShowLinkModal(false);
    setLinkingCarga(null);
    setSelectedParceiro('');
    setSelectedMotorista('');
    setSelectedVeiculo('');
    setSelectedCarretas([]);
  };

  // Handlers de Integração Financeira
  const handleIntegrateFinanceiro = (carga: Carga) => {
    setIntegratingCarga(carga);
    setIntegrateData(initialIntegrateData);
    setShowIntegrateModal(true);
  };

  const handleCloseIntegrateModal = () => {
    setShowIntegrateModal(false);
    setIntegratingCarga(null);
    setIntegrateData(initialIntegrateData);
  };

  const handleIntegrateSubmit = () => {
    if (!integratingCarga) return;

    // A verificação de bloqueio agora é feita dentro da modal, mas fazemos uma checagem final
    const relatedMovs = movimentacoes.filter(m => m.cargaId === integratingCarga.id);
    const hasAdiantamento = relatedMovs.some(m => m.descricao.startsWith('Adto -'));
    const hasSaldo = relatedMovs.some(m => m.descricao.startsWith('Saldo -'));
    const hasFreteUnico = relatedMovs.some(m => m.descricao.startsWith('Frete -'));

    if (hasFreteUnico) {
      alert('Esta carga já possui lançamento único de Frete. Exclua a movimentação para reintegrar.');
      return;
    }
    
    // Se o usuário tentar lançar Ambos, mas já existe um lançamento parcial
    if (integrateData.splitOption === 'ambos' && (hasAdiantamento || hasSaldo)) {
        alert('Não é possível lançar Adiantamento e Saldo juntos, pois uma das parcelas já foi lançada. Lance a parcela faltante individualmente.');
        return;
    }
    
    // Se o usuário tentar lançar Adiantamento, mas já existe
    if (integrateData.splitOption === 'adiantamento' && hasAdiantamento) {
        alert('O Adiantamento já foi lançado.');
        return;
    }
    
    // Se o usuário tentar lançar Saldo, mas já existe
    if (integrateData.splitOption === 'saldo' && hasSaldo) {
        alert('O Saldo já foi lançado.');
        return;
    }


    const valorTotal = parseCurrency(formatCurrency(integratingCarga.valor || 0));
    
    // Extras calculation
    const calcularValorBRL = () => {
      if (!integrateData.despesasEnabled) return 0;
      const valorARS = parseCurrency(integrateData.valorARS || '');
      const taxa = parseCurrency(integrateData.taxaConversao || '');
      const extraBRL = parseCurrency(integrateData.valorBRLExtra || '');
      return (valorARS * taxa) + extraBRL;
    };
    const despesasAdicionais = calcularValorBRL();
    const diarias = integrateData.diariasEnabled ? parseCurrency(integrateData.valorDiarias || '') : 0;
    const extrasTotal = despesasAdicionais + diarias;

    // Array para armazenar as novas movimentações criadas
    const movsToUndo: string[] = []; // IDs das movimentações criadas para o undo

    // Função para criar movimentação e registrar para undo
    const createAndRegisterMov = (data: any) => {
      const newMov = createMovimentacao(data);
      movsToUndo.push(newMov.id);
      return newMov;
    };
    
    // Case 1: No split, no extras (Lançamento Único)
    if (!integrateData.adiantamentoEnabled && !integrateData.despesasEnabled && !integrateData.diariasEnabled) {
      createAndRegisterMov({
        tipo: 'despesa',
        valor: valorTotal,
        descricao: buildMovimentacaoDescription(integratingCarga, 'Frete'), // Usando função do contexto
        categoria: 'FRETE',
        data: new Date(integrateData.dataVencimentoDespesa || new Date()),
        status: 'pendente',
        cargaId: integratingCarga.id,
        observacoes: `Integração sem adiantamento. Valor da carga: ${formatCurrency(valorTotal)}`
      });
    } 
    // Case 2: With split (Adiantamento/Saldo)
    else if (integrateData.adiantamentoEnabled) {
      const percentual = parseFloat(integrateData.adiantamentoPercentual || '0') / 100;
      const valorAdiantamento = valorTotal * percentual;
      const valorSaldo = valorTotal - valorAdiantamento;

      const somaOpcao = integrateData.somaOpcao;
      
      const valorAdiantamentoFinal = (somaOpcao === 'adiantamento' && integrateData.splitOption !== 'saldo') 
        ? (valorAdiantamento + extrasTotal) 
        : valorAdiantamento;
        
      const valorSaldoFinal = (somaOpcao === 'saldo' && integrateData.splitOption !== 'adiantamento') 
        ? (valorSaldo + extrasTotal) 
        : valorSaldo;

      const dataAdiant = integrateData.dataVencimentoAdiantamento ? new Date(integrateData.dataVencimentoAdiantamento) : new Date();
      const dataSaldo = integrateData.dataVencimentoSaldo ? new Date(integrateData.dataVencimentoSaldo) : new Date();

      if (integrateData.splitOption === 'ambos' || integrateData.splitOption === 'adiantamento') {
        createAndRegisterMov({
          tipo: 'despesa',
          valor: valorAdiantamentoFinal,
          descricao: buildMovimentacaoDescription(integratingCarga, 'Adto'), // Usando função do contexto
          categoria: 'FRETE',
          data: dataAdiant,
          status: 'pendente',
          cargaId: integratingCarga.id,
          observacoes: `Adiantamento ${integrateData.adiantamentoPercentual}%: ${formatCurrency(valorAdiantamento)}${extrasTotal > 0 && somaOpcao === 'adiantamento' ? `, Extras somados: ${formatCurrency(extrasTotal)}` : ''}`
        });
      }
      
      if (integrateData.splitOption === 'ambos' || integrateData.splitOption === 'saldo') {
        createAndRegisterMov({
          tipo: 'despesa',
          valor: valorSaldoFinal,
          descricao: buildMovimentacaoDescription(integratingCarga, 'Saldo'), // Usando função do contexto
          categoria: 'FRETE',
          data: dataSaldo,
          status: 'pendente',
          cargaId: integratingCarga.id,
          observacoes: `Saldo ${100 - parseFloat(integrateData.adiantamentoPercentual)}%: ${formatCurrency(valorSaldo)}${extrasTotal > 0 && somaOpcao === 'saldo' ? `, Extras somados: ${formatCurrency(extrasTotal)}` : ''}`
        });
      }
    } 
    // Case 3: No split, but with extras
    else {
      const valorFinal = valorTotal + extrasTotal;
      createAndRegisterMov({
        tipo: 'despesa',
        valor: valorFinal,
        descricao: buildMovimentacaoDescription(integratingCarga, 'Frete'), // Usando função do contexto
        categoria: 'FRETE',
        data: new Date(integrateData.dataVencimentoDespesa || new Date()),
        status: 'pendente',
        cargaId: integratingCarga.id,
        observacoes: `Valor da carga: ${formatCurrency(valorTotal)}${extrasTotal > 0 ? `, Extras: ${formatCurrency(extrasTotal)}` : ''}`
      });
    }

    // Adicionar ação de desfazer para a integração
    if (movsToUndo.length > 0) {
        undoService.addUndoAction({
            type: 'integrate_financial',
            description: `Integração financeira da carga ${integratingCarga.crt || integratingCarga.id}`,
            data: { movIds: movsToUndo },
            undoFunction: async () => {
                movsToUndo.forEach(id => deleteMovimentacao(id));
            }
        });
    }

    handleCloseIntegrateModal();
  };

  // Filtering logic
  const filteredCargas = useMemo(() => {
    return cargas.filter(carga => {
      const matchSearch = carga.crt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         carga.origem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         carga.destino?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = !filterStatus || carga.status === filterStatus;
      
      let matchesColetaRange = true;
      if (filterColetaStartDate) {
        const startDate = new Date(filterColetaStartDate);
        const d = new Date(carga.dataColeta || new Date());
        matchesColetaRange = matchesColetaRange && d >= startDate;
      }
      if (filterColetaEndDate) {
        const endDate = new Date(filterColetaEndDate);
        const d = new Date(carga.dataColeta || new Date());
        matchesColetaRange = matchesColetaRange && d <= endDate;
      }

      let matchesEntregaRange = true;
      if (filterEntregaStartDate || filterEntregaEndDate) {
        if (!carga.dataEntrega) {
          matchesEntregaRange = false;
        } else {
          const de = new Date(carga.dataEntrega);
          if (filterEntregaStartDate) {
            const es = new Date(filterEntregaStartDate);
            matchesEntregaRange = matchesEntregaRange && de >= es;
          }
          if (filterEntregaEndDate) {
            const ee = new Date(filterEntregaEndDate);
            matchesEntregaRange = matchesEntregaRange && de <= ee;
          }
        }
      }
      
      return matchSearch && matchStatus && matchesColetaRange && matchesEntregaRange;
    }).sort((a, b) => new Date(b.dataColeta || new Date()).getTime() - new Date(a.dataColeta || new Date()).getTime());
  }, [cargas, searchTerm, filterStatus, filterColetaStartDate, filterColetaEndDate, filterEntregaStartDate, filterEntregaEndDate]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = cargas.length;
    const aColetar = cargas.filter(c => c.status === 'a_coletar').length;
    const emTransito = cargas.filter(c => c.status === 'em_transito').length;
    const armazenadas = cargas.filter(c => c.status === 'armazenada').length;
    const entregues = cargas.filter(c => c.status === 'entregue').length;
    const valorTotal = cargas.reduce((sum, c) => sum + (c.valor || 0), 0);
    
    return { total, aColetar, emTransito, armazenadas, entregues, valorTotal };
  }, [cargas]);

  // Função para obter o nome da cidade/país para exibição na tabela
  const getLocalDisplay = (localCompleto: string) => {
    const info = extrairUfECidade(localCompleto);
    if (info.uf.toLowerCase() === 'internacional') {
      return info.cidade || 'Internacional';
    }
    return localCompleto;
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
              setShowForm(true);
              setHasUnsavedChanges(false);
              setOriginalFormData(null);
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

          {/* Filtro Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field h-11 text-sm"
          >
            <option value="">Status</option>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>

          {/* Filtro Coleta (intervalo) */}
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Coleta</label>
            <button
              type="button"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                setColetaCalendarPosition({
                  top: rect.bottom + window.scrollY + 5,
                  left: rect.left + window.scrollX
                });
                const s = filterColetaStartDate ? new Date(filterColetaStartDate) : null;
                const ed = filterColetaEndDate ? new Date(filterColetaEndDate) : null;
                setTempColetaStart(s);
                setTempColetaEnd(ed);
                setColetaMonth(s || new Date());
                setShowColetaCalendar(true);
              }}
              className="input-field flex items-center justify-between h-11 text-sm"
            >
              <span className="text-sm">
                {filterColetaStartDate && filterColetaEndDate
                  ? `${format(new Date(filterColetaStartDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(filterColetaEndDate), 'dd/MM/yyyy', { locale: ptBR })}`
                  : filterColetaStartDate
                    ? `De ${format(new Date(filterColetaStartDate), 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Selecionar período'}
              </span>
              <Calendar className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Filtro Entrega (intervalo) */}
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Entrega</label>
            <button
              type="button"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                setEntregaCalendarPosition({
                  top: rect.bottom + window.scrollY + 5,
                  left: rect.left + window.scrollX
                });
                const s = filterEntregaStartDate ? new Date(filterEntregaStartDate) : null;
                const ed = filterEntregaEndDate ? new Date(filterEntregaEndDate) : null;
                setTempEntregaStart(s);
                setTempEntregaEnd(ed);
                setEntregaMonth(s || new Date());
                setShowEntregaCalendar(true);
              }}
              className="input-field flex items-center justify-between h-11 text-sm"
            >
              <span className="text-sm">
                {filterEntregaStartDate && filterEntregaEndDate
                  ? `${format(new Date(filterEntregaStartDate), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(filterEntregaEndDate), 'dd/MM/yyyy', { locale: ptBR })}`
                  : filterEntregaStartDate
                    ? `De ${format(new Date(filterEntregaStartDate), 'dd/MM/yyyy', { locale: ptBR })}`
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  CRT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Origem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Destino
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Data Coleta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Data Entrega
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Veículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCargas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Nenhuma carga encontrada
                  </td>
                </tr>
              ) : (
                filteredCargas.map((carga) => (
                  <tr key={carga.id} className="table-body-row">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {carga.crt || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {getLocalDisplay(carga.origem)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {getLocalDisplay(carga.destino)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {carga.dataColeta ? format(new Date(carga.dataColeta), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {carga.dataEntrega ? format(new Date(carga.dataEntrega), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(carga.valor || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {carga.veiculoId ? 
                        (() => {
                          const veiculo = veiculos.find(v => v.id === carga.veiculoId);
                          if (!veiculo) return 'Veículo não encontrado';
                          
                          let placaPrincipal = veiculo.tipo === 'Truck' 
                            ? veiculo.placa 
                            : (veiculo.placaCavalo || veiculo.placa);
                          
                          if (carga.carretasSelecionadas && carga.carretasSelecionadas.length > 0) {
                            placaPrincipal += ` + ${carga.carretasSelecionadas.length} Carreta(s)`;
                          }
                          
                          return placaPrincipal;
                        })() 
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_CONFIG[carga.status as keyof typeof STATUS_CONFIG].color}`}>
                        {STATUS_CONFIG[carga.status as keyof typeof STATUS_CONFIG]?.label || 'Desconhecido'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 items-center">
                        <button
                          type="button"
                          onClick={() => handleEdit(carga)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDropdownPosition({
                                top: rect.bottom + window.scrollY + 5,
                                left: rect.left + window.scrollX - 150
                              });
                              setShowStatusDropdown(showStatusDropdown === carga.id ? null : carga.id);
                            }}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Alterar status"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLinkParceiro(carga)}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Vincular parceiro/motorista"
                        >
                          <Link className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleIntegrateFinanceiro(carga)}
                          className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 p-1 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                          title="Integrar Financeiro"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(carga.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dropdown de status sobreposto */}
      {showStatusDropdown && dropdownPosition && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setShowStatusDropdown(null);
              setDropdownPosition(null);
            }}
          />
          <div 
            className="fixed z-50 w-48 rounded-lg shadow-xl bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 border border-gray-100 dark:border-gray-600"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <div className="py-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                Alterar Status
              </div>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleChangeStatus(showStatusDropdown, key as Carga['status'])}
                  className={`w-full flex items-center px-4 py-3 text-sm transition-colors ${
                    filteredCargas.find(c => c.id === showStatusDropdown)?.status === key 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {React.createElement(cfg.icon, { 
                    className: `h-4 w-4 mr-3 ${
                      filteredCargas.find(c => c.id === showStatusDropdown)?.status === key ? 'text-blue-600 dark:text-blue-400' : cfg.textColor
                    }` 
                  })}
                  <span className="flex-1 text-left">{cfg.label}</span>
                  {filteredCargas.find(c => c.id === showStatusDropdown)?.status === key && (
                    <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <CargaFormModal
        isOpen={showForm}
        formData={formData}
        editingCarga={editingCarga}
        clientes={clientes}
        ufsOrdenadas={UFS_ORDENADAS}
        hasUnsavedChanges={hasUnsavedChanges}
        onClose={handleCloseForm}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
        onConfirmCancel={performReset}
        showCancelConfirm={showCancelConfirm}
        setShowCancelConfirm={setShowCancelConfirm}
      />

      <CargaLinkModal
        isOpen={showLinkModal}
        linkingCarga={linkingCarga}
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

      <CargaIntegrateModal
        isOpen={showIntegrateModal}
        integratingCarga={integratingCarga}
        movimentacoes={movimentacoes}
        onClose={handleCloseIntegrateModal}
        onIntegrate={handleIntegrateSubmit}
        integrateData={integrateData}
        setIntegrateData={setIntegrateData}
      />

      <CargaImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        createCarga={createCarga}
        deleteCarga={deleteCarga}
      />

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirmar Exclusão
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Tem certeza que deseja excluir a carga "{deleteTarget.descricao}"? Esta ação também excluirá todas as movimentações financeiras associadas.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cargas;