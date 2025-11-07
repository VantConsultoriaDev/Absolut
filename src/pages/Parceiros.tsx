import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { 
  Plus, 
  Search, 
  X, 
  CreditCard,
} from 'lucide-react';
import { 
  formatDocument, 
  parseDocument, 
  formatContact, 
  formatPlaca, 
  formatPixKey, 
  cleanPixKey,
  forceUpperCase,
  createLocalDate,
} from '../utils/formatters';
import { Parceiro, Motorista, Veiculo, PermissoInternacional } from '../types';
import { format, isValid } from 'date-fns';
import ParceiroCard from '../components/parceiros/ParceiroCard';
import ParceiroDetailModal from '../components/parceiros/ParceiroDetailModal';
import MotoristaFormModal, { MotoristaFormData } from '../components/parceiros/MotoristaFormModal';
import VeiculoFormModal from '../components/parceiros/VeiculoFormModal';
import PermissoModal, { PermissoData } from '../components/parceiros/PermissoModal'; // Importando PermissoData
import ConfirmationModal from '../components/ConfirmationModal';
import { showError } from '../utils/toast';
import { CNPJService } from '../services/cnpjService'; // Importando CNPJService
import { VehicleService } from '../services/vehicleService'; // Importando VehicleService
import { PlacaData } from '../services/vehicleService'; // Importando PlacaData

// Tipagem para o formulário de Veículo (corrigida)
interface VeiculoFormData extends Omit<Veiculo, 'id' | 'createdAt' | 'updatedAt' | 'parceiroId' | 'permisso' | 'ano' | 'capacidade'> {
  parceiroId: string;
  ano: string;
  capacidade: string;
}

// Dados iniciais (inferred)
const initialMotoristaFormData: MotoristaFormData = {
  parceiroId: '',
  nome: '',
  cpf: '',
  cnh: '',
  nacionalidade: 'Brasileiro',
  categoriaCnh: '',
  validadeCnh: '',
  telefone: '',
  isActive: true,
};

const initialVeiculoFormData: VeiculoFormData = {
  parceiroId: '',
  placa: '',
  placaCavalo: '',
  placaCarreta: '',
  modelo: '',
  fabricante: '',
  ano: '',
  capacidade: '',
  chassis: '',
  carroceria: '',
  tipo: 'Cavalo', // ALTERADO: Padrão para Cavalo
  motoristaVinculado: '',
  carretasSelecionadas: [],
  isActive: true,
  userId: '',
};

const initialParceiroFormData: Parceiro = {
  id: '',
  tipo: 'PJ',
  nome: '',
  nomeFantasia: '',
  documento: '',
  cnh: '',
  email: '',
  telefone: '',
  pixKeyType: '',
  pixKey: '',
  pixTitular: '',
  endereco: '',
  cidade: '',
  uf: '', // RENOMEADO
  cep: '',
  observacoes: '',
  isMotorista: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};


const Parceiros: React.FC = () => {
  const location = useLocation();
  const { 
    parceiros, 
    motoristas, 
    veiculos, 
    createParceiro, 
    updateParceiro, 
    deleteParceiro,
    createMotorista,
    updateMotorista,
    deleteMotorista,
    createVeiculo,
    updateVeiculo: updateVeiculoContext, // Usar alias para evitar conflito
    deleteVeiculo,
    getMotoristasByParceiro,
    getVeiculosByParceiro,
    createPermisso,
    getPermissoByVeiculoId,
  } = useDatabase();

  // Estados de Modais e Formulários
  const [showParceiroForm, setShowParceiroForm] = useState(false);
  const [editingParceiroId, setEditingParceiroId] = useState<string | null>(null);
  const [parceiroFormData, setParceiroFormData] = useState<Parceiro>(initialParceiroFormData);
  
  const [showMotoristaForm, setShowMotoristaForm] = useState(false);
  const [editingMotoristaId, setEditingMotoristaId] = useState<string | null>(null);
  const [motoristaFormData, setMotoristaFormData] = useState<MotoristaFormData>(initialMotoristaFormData);
  
  const [showVeiculoForm, setShowVeiculoForm] = useState(false);
  const [editingVeiculoId, setEditingVeiculoId] = useState<string | null>(null);
  const [veiculoFormData, setVeiculoFormData] = useState<VeiculoFormData>(initialVeiculoFormData);
  
  const [showPermissoModal, setShowPermissoModal] = useState(false);
  const [permissoTargetVeiculo, setPermissoTargetVeiculo] = useState<Veiculo | null>(null);
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTargetParceiro, setDetailTargetParceiro] = useState<Parceiro | null>(null);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string, type: 'parceiro' | 'motorista' | 'veiculo' } | null>(null);

  // Estados de Consulta de API
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false);
  const [cnpjConsultado, setCnpjConsultado] = useState(false);
  const [consultandoPlaca, setConsultandoPlaca] = useState(false);
  const [placaConsultada, setPlacaConsultada] = useState(false);
  const [placaError, setPlacaError] = useState('');
  
  // NOVO: Estado para consulta de CNPJ do PIX
  const [consultandoPixCnpj, setConsultandoPixCnpj] = useState(false);

  // Filtros
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Reset para tela inicial quando navegado via menu lateral
  useEffect(() => {
    if (location.state?.resetModule) {
      setQuery('');
      setFilterType('');
      setFilterStatus('');
      // Fechar todos os modais
      setShowParceiroForm(false);
      setShowMotoristaForm(false);
      setShowVeiculoForm(false);
      setShowPermissoModal(false);
      setShowDetailModal(false);
      setEditingParceiroId(null);
      setEditingMotoristaId(null);
      setEditingVeiculoId(null);
      setPermissoTargetVeiculo(null);
      setDetailTargetParceiro(null);
      resetParceiroForm();
      resetMotoristaForm();
      resetVeiculoForm();
    }
  }, [location.state]);

  // --- LÓGICA DE FILTRAGEM ---
  const filteredParceiros = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = parceiros;

    if (q) {
      filtered = filtered.filter(p =>
        (p.nome || '').toLowerCase().includes(q) ||
        (p.nomeFantasia || '').toLowerCase().includes(q) ||
        (p.documento || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
      );
    }

    if (filterType) {
      filtered = filtered.filter(p => p.tipo === filterType);
    }

    if (filterStatus) {
      const isActive = filterStatus === 'ativo';
      filtered = filtered.filter(p => (p.isActive ?? true) === isActive);
    }

    return filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [parceiros, query, filterType, filterStatus]);

  // --- RESET FORMS ---
  const resetParceiroForm = () => {
    setParceiroFormData(initialParceiroFormData);
    setEditingParceiroId(null);
    setCnpjConsultado(false);
    setConsultandoCNPJ(false);
  };

  const resetMotoristaForm = () => {
    setMotoristaFormData(initialMotoristaFormData);
    setEditingMotoristaId(null);
  };

  const resetVeiculoForm = () => {
    setVeiculoFormData(initialVeiculoFormData);
    setEditingVeiculoId(null);
    setPlacaConsultada(false);
    setConsultandoPlaca(false);
    setPlacaError('');
  };

  // --- PARCEIRO CRUD ---
  const handleEditParceiro = (parceiro: Parceiro) => {
    setParceiroFormData({
      ...parceiro,
      documento: formatDocument(parceiro.documento || '', parceiro.tipo),
      telefone: formatContact(parceiro.telefone || ''),
      pixKey: parceiro.pixKey ? formatPixKey(parceiro.pixKey, parceiro.pixKeyType || '') : '',
    });
    setEditingParceiroId(parceiro.id);
    setShowParceiroForm(true);
    setShowDetailModal(false);
  };

  const handleSubmitParceiro = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanDocument = parseDocument(parceiroFormData.documento || '');
    const cleanPixKeyVal = cleanPixKey(parceiroFormData.pixKey || '', parceiroFormData.pixKeyType || '');

    if (parceiroFormData.tipo !== 'PF' && cleanDocument.length !== 14) {
        showError('CNPJ inválido.');
        return;
    }
    if (parceiroFormData.tipo === 'PF' && cleanDocument.length !== 11) {
        showError('CPF inválido.');
        return;
    }
    
    const payload: Parceiro = {
      ...parceiroFormData,
      documento: cleanDocument,
      telefone: parseDocument(parceiroFormData.telefone || ''),
      pixKey: cleanPixKeyVal,
      pixTitular: parceiroFormData.pixTitular || parceiroFormData.nome,
      // Garante que o nome fantasia seja null se for PF
      nomeFantasia: parceiroFormData.tipo === 'PF' ? undefined : parceiroFormData.nomeFantasia,
      // Garante que isActive seja true se não estiver definido (ou seja, não bloqueado)
      isActive: parceiroFormData.isActive ?? true,
    };

    try {
      if (editingParceiroId) {
        updateParceiro(editingParceiroId, payload);
      } else {
        createParceiro(payload);
      }
      setShowParceiroForm(false);
      resetParceiroForm();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar parceiro.');
    }
  };

  const handleDeleteParceiro = (id: string) => {
    const parceiro = parceiros.find(p => p.id === id);
    if (parceiro) {
      setDeleteTarget({ id, name: parceiro.nome || 'Parceiro', type: 'parceiro' });
      setShowDeleteConfirm(true);
      setShowDetailModal(false);
    }
  };
  
  // NOVO: Função para bloquear/desbloquear parceiro
  const handleToggleBlock = (parceiro: Parceiro) => {
    const newStatus = !(parceiro.isActive ?? true);
    try {
        updateParceiro(parceiro.id, { isActive: newStatus });
        // showSuccess(`Parceiro ${parceiro.nome} ${newStatus ? 'desbloqueado' : 'bloqueado'} com sucesso.`); // REMOVIDO
    } catch (e) {
        showError(e instanceof Error ? e.message : 'Erro ao alterar status de bloqueio.');
    }
  };

  // --- MOTORISTA CRUD ---
  const handleAddMotorista = (parceiroId: string) => {
    resetMotoristaForm();
    setMotoristaFormData(prev => ({ ...prev, parceiroId }));
    setShowMotoristaForm(true);
    // REMOVIDO: setShowDetailModal(false); // Permite empilhamento
  };

  const handleEditMotorista = (motorista: Motorista) => {
    setMotoristaFormData({
      parceiroId: motorista.parceiroId,
      nome: motorista.nome,
      cpf: formatDocument(motorista.cpf, 'PF'),
      cnh: motorista.cnh,
      nacionalidade: motorista.nacionalidade || 'Brasileiro',
      categoriaCnh: motorista.categoriaCnh || '',
      // FIX: Ensure validadeCnh is a string in YYYY-MM-DD format only if it's a valid Date object
      validadeCnh: motorista.validadeCnh && isValid(motorista.validadeCnh) 
          ? format(motorista.validadeCnh, 'yyyy-MM-dd') 
          : '',
      telefone: formatContact(motorista.telefone || ''),
      isActive: motorista.isActive ?? true,
    });
    setEditingMotoristaId(motorista.id);
    setShowMotoristaForm(true);
    // REMOVIDO: setShowDetailModal(false); // Permite empilhamento
  };

  const handleSubmitMotorista = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCpf = parseDocument(motoristaFormData.cpf);
    const cleanTelefone = parseDocument(motoristaFormData.telefone || '');

    if (cleanCpf.length !== 11) {
        showError('CPF inválido.');
        return;
    }
    
    const payload: Omit<Motorista, 'id' | 'createdAt' | 'updatedAt'> = {
      ...motoristaFormData,
      cpf: cleanCpf,
      telefone: cleanTelefone,
      validadeCnh: motoristaFormData.validadeCnh ? createLocalDate(motoristaFormData.validadeCnh) : undefined,
      isActive: true, // Força como ativo (não há controle de status na UI)
    };

    try {
      if (editingMotoristaId) {
        updateMotorista(editingMotoristaId, payload);
      } else {
        createMotorista(payload);
      }
      setShowMotoristaForm(false);
      resetMotoristaForm();
      // REABRE O MODAL DE DETALHES (se ele foi fechado pelo clique externo no modal secundário)
      const parceiro = parceiros.find(p => p.id === motoristaFormData.parceiroId);
      if (parceiro) {
          setDetailTargetParceiro(parceiro);
          setShowDetailModal(true);
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar motorista.');
    }
  };

  const handleDeleteMotorista = (id: string) => {
    const motorista = motoristas.find(m => m.id === id);
    if (motorista) {
      setDeleteTarget({ id, name: motorista.nome, type: 'motorista' });
      setShowDeleteConfirm(true);
      // REMOVIDO: setShowDetailModal(false); // Permite empilhamento
    }
  };

  // --- VEÍCULO CRUD ---
  const handleAddVeiculo = (parceiroId: string) => {
    resetVeiculoForm();
    setVeiculoFormData(prev => ({ ...prev, parceiroId }));
    setShowVeiculoForm(true);
    // REMOVIDO: setShowDetailModal(false); // Permite empilhamento
  };

  const handleEditVeiculo = (veiculo: Veiculo) => {
    setVeiculoFormData({
      parceiroId: veiculo.parceiroId,
      placa: veiculo.placa || '',
      placaCavalo: veiculo.placaCavalo || '',
      placaCarreta: veiculo.placaCarreta || '',
      modelo: veiculo.modelo || '',
      fabricante: veiculo.fabricante || '',
      ano: veiculo.ano?.toString() || '',
      capacidade: veiculo.capacidade?.toString() || '',
      chassis: veiculo.chassis || '',
      carroceria: veiculo.carroceria || '',
      tipo: veiculo.tipo,
      motoristaVinculado: veiculo.motoristaVinculado || '',
      carretasSelecionadas: veiculo.carretasSelecionadas || [],
      isActive: veiculo.isActive ?? true,
      // Campos removidos do tipo Veiculo, mas mantidos no VeiculoFormData para evitar erros de TS
      // placaCarreta1: '', // REMOVIDO
      // placaCarreta2: '', // REMOVIDO
      // placaDolly: '', // REMOVIDO
      // quantidadeCarretas: 0, // REMOVIDO
      // possuiDolly: false, // REMOVIDO
      userId: veiculo.userId || '',
    });
    setEditingVeiculoId(veiculo.id);
    setShowVeiculoForm(true);
    // REMOVIDO: setShowDetailModal(false); // Permite empilhamento
  };

  const handleSubmitVeiculo = (e: React.FormEvent) => {
    e.preventDefault();
    
    const placaField = veiculoFormData.tipo === 'Cavalo' ? 'placaCavalo' : veiculoFormData.tipo === 'Carreta' ? 'placaCarreta' : 'placa';
    const placaValue = veiculoFormData[placaField];
    
    if (!placaValue || placaValue.replace(/[^A-Z0-9]/gi, '').length < 7) {
        showError('Placa inválida.');
        return;
    }
    
    // 1. Padroniza a placa para XXX-XXXX e força maiúsculas
    const formattedPlaca = forceUpperCase(formatPlaca(placaValue));
    
    // 2. Cria o payload
    const payload: Omit<Veiculo, 'id' | 'createdAt' | 'updatedAt'> = {
      ...veiculoFormData,
      // Aplica a placa formatada e em maiúsculas
      placa: veiculoFormData.tipo === 'Truck' ? formattedPlaca : undefined,
      placaCavalo: veiculoFormData.tipo === 'Cavalo' ? formattedPlaca : undefined,
      placaCarreta: veiculoFormData.tipo === 'Carreta' ? formattedPlaca : undefined,
      
      // Campos numéricos e de texto
      ano: parseInt(veiculoFormData.ano) || undefined,
      capacidade: parseFloat(veiculoFormData.capacidade) || undefined,
      chassis: forceUpperCase(veiculoFormData.chassis || ''),
      isActive: true, // Força como ativo (não há controle de status na UI)
    };

    try {
      if (editingVeiculoId) {
        updateVeiculoContext(editingVeiculoId, payload);
      } else {
        // Usando createVeiculo do contexto
        createVeiculo(payload);
      }
      setShowVeiculoForm(false);
      resetVeiculoForm();
      // Reabre o modal de detalhes do parceiro
      const parceiro = parceiros.find(p => p.id === veiculoFormData.parceiroId);
      if (parceiro) {
          setDetailTargetParceiro(parceiro);
          setShowDetailModal(true);
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar veículo.');
    }
  };

  const handleDeleteVeiculo = (id: string) => {
    const veiculo = veiculos.find(v => v.id === id);
    if (veiculo) {
      setDeleteTarget({ id, name: veiculo.placa || veiculo.placaCavalo || 'Veículo', type: 'veiculo' });
      setShowDeleteConfirm(true);
      // REMOVIDO: setShowDetailModal(false); // Permite empilhamento
    }
  };
  
  // --- PERMISSO ---
  const handleOpenPermissoModal = (veiculo: Veiculo) => {
    setPermissoTargetVeiculo(veiculo);
    setShowPermissoModal(true);
    // REMOVIDO: setShowDetailModal(false); // Permite empilhamento
  };
  
  const handleSavePermisso = (veiculoId: string, data: PermissoData, newChassi?: string) => {
    // 1. Cria/Atualiza o Permisso no contexto
    const existing = getPermissoByVeiculoId(veiculoId);
    
    // Mapeia PermissoData para PermissoInternacional (apenas os campos relevantes)
    const permissoPayload: Partial<PermissoInternacional> = {
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        cnpj: parseDocument(data.cnpj), // Garante que o CNPJ seja limpo
        enderecoCompleto: data.enderecoCompleto,
        simulado: data.simulado,
    };
    
    if (existing) {
        // Se existir, atualiza o Permisso
        updateVeiculoContext(veiculoId, { permisso: { ...existing, ...permissoPayload } });
    } else {
        // Se não existir, cria um novo Permisso
        // CORREÇÃO: Adicionando veiculoId ao payload de criação
        createPermisso({ ...permissoPayload, veiculoId } as Omit<PermissoInternacional, 'id' | 'createdAt' | 'updatedAt' | 'dataConsulta'> & { veiculoId: string }, veiculoId);
    }
    
    // 2. Atualiza o CHASSI do veículo se um novo foi encontrado
    if (newChassi) {
        updateVeiculoContext(veiculoId, { chassis: newChassi });
    }
    
    // 3. Reabre o modal de detalhes
    const parceiro = parceiros.find(p => p.id === veiculos.find(v => v.id === veiculoId)?.parceiroId);
    if (parceiro) {
        setDetailTargetParceiro(parceiro);
        setShowDetailModal(true);
    }
  };

  // --- CONSULTA API CNPJ (Geral) ---
  const handleCNPJConsultation = async (cnpj: string) => {
    if (parceiroFormData.tipo !== 'PJ') return;
    const cnpjLimpo = parseDocument(cnpj);
    if (cnpjLimpo.length !== 14) return;
    if (consultandoCNPJ) return;

    setConsultandoCNPJ(true);
    try {
      const dados = await CNPJService.consultarCNPJ(cnpj);
      if (dados) {
        setParceiroFormData(prev => ({
          ...prev,
          nome: dados.razaoSocial || prev.nome,
          nomeFantasia: dados.nomeFantasia || prev.nomeFantasia,
          // CORRIGIDO: Garantindo que o telefone seja string antes de formatar
          telefone: formatContact(dados.telefone || prev.telefone || ''),
          endereco: dados.endereco || prev.endereco,
          cidade: dados.cidade || prev.cidade,
          uf: dados.uf || prev.uf, // RENOMEADO
          cep: dados.cep || prev.cep,
        }));
        setCnpjConsultado(true);
        if (dados.simulado) {
          showError('Não foi possível conectar com a API de CNPJ. Usando dados simulados como fallback.');
        }
      } else {
        showError('CNPJ não encontrado na base de dados externa.');
      }
    } catch (err) {
      console.error('Erro ao consultar CNPJ:', err);
      showError(err instanceof Error ? err.message : 'Erro ao consultar CNPJ. Verifique o número e tente novamente.');
    } finally {
      setConsultandoCNPJ(false);
    }
  };
  
  // --- CONSULTA API CNPJ (PIX) ---
  const handlePixCnpjConsultation = async (cnpj: string) => {
    const cleanCnpj = parseDocument(cnpj);
    if (cleanCnpj.length !== 14) return;
    if (consultandoPixCnpj) return;

    setConsultandoPixCnpj(true);
    try {
      const dados = await CNPJService.consultarCNPJ(cnpj);
      if (dados) {
        // Preenche o titular com a Razão Social
        const razaoSocial = dados.razaoSocial || dados.nomeFantasia || '';
        if (razaoSocial) {
            setParceiroFormData(prev => ({
                ...prev,
                pixTitular: razaoSocial,
            }));
        } else {
            showError('Razão Social não encontrada para este CNPJ.');
        }
      } else {
        showError('CNPJ não encontrado para a chave PIX.');
      }
    } catch (err) {
      console.error('Erro ao consultar CNPJ do PIX:', err);
      showError('Falha ao consultar CNPJ do PIX. Tente novamente.');
    } finally {
      setConsultandoPixCnpj(false);
    }
  };
  
  // --- CONSULTA API PLACA ---
  const handlePlacaConsultation = async (placa: string, _tipo: string) => {
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
    if (placaLimpa.length !== 7) {
      setPlacaError('Placa deve ter 7 caracteres.');
      return;
    }
    
    setConsultandoPlaca(true);
    setPlacaError('');
    setPlacaConsultada(false);

    try {
      const data: PlacaData | null = await VehicleService.consultarPlaca(placaLimpa);
      
      if (data) {
        setVeiculoFormData(prev => ({
          ...prev,
          fabricante: data.marca || prev.fabricante,
          modelo: data.modelo || prev.modelo,
          ano: data.ano?.toString() || prev.ano,
          chassis: data.chassi ? forceUpperCase(data.chassi) : prev.chassis,
          carroceria: (data as any).carroceria || prev.carroceria, // CORRIGIDO: Acessando carroceria via any
          // Capacidade não vem da API base, mantemos o valor existente
        }));
        setPlacaConsultada(true);
      } else {
        setPlacaError('Placa não encontrada na base de dados externa.');
      }
    } catch (err) {
      console.error('Erro ao consultar placa:', err);
      setPlacaError(err instanceof Error ? err.message : 'Falha ao consultar placa. Verifique a conexão ou o token da API.');
    } finally {
      setConsultandoPlaca(false);
    }
  };


  // --- CONFIRMAÇÃO DE EXCLUSÃO ---
  const confirmDelete = () => {
    if (!deleteTarget) return;
    
    try {
      if (deleteTarget.type === 'parceiro') {
        deleteParceiro(deleteTarget.id);
      } else if (deleteTarget.type === 'motorista') {
        deleteMotorista(deleteTarget.id);
      } else if (deleteTarget.type === 'veiculo') {
        deleteVeiculo(deleteTarget.id);
      }
      // showSuccess(`${deleteTarget.name} excluído com sucesso.`); // REMOVIDO
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir.');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      // Tenta reabrir o modal de detalhes se a exclusão foi de um sub-item
      if (deleteTarget.type !== 'parceiro' && detailTargetParceiro) {
          setShowDetailModal(true);
      }
    }
  };

  // --- RENDERIZAÇÃO ---
  return (
    <div className="space-y-6">
      {/* Header e Botão Novo Parceiro */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Parceiros</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestão de transportadoras, motoristas e veículos</p>
        </div>
        <button
          onClick={() => { resetParceiroForm(); setShowParceiroForm(true); }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Parceiro
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, documento ou nome fantasia"
              className="input-field pl-9"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field"
          >
            <option value="">Todos Tipos</option>
            <option value="PJ">Pessoa Jurídica</option>
            <option value="PF">Pessoa Física</option>
          </select>
          
          {/* Filtro de Status (Removido) */}
        </div>
      </div>

      {/* Lista de Parceiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredParceiros.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Nenhum parceiro encontrado.</p>
          </div>
        ) : (
          filteredParceiros.map(p => (
            <ParceiroCard
              key={p.id}
              parceiro={p}
              veiculosCount={getVeiculosByParceiro(p.id).length}
              motoristasCount={getMotoristasByParceiro(p.id).length}
              onClick={(parceiro) => {
                setDetailTargetParceiro(parceiro);
                setShowDetailModal(true);
              }}
              onToggleBlock={handleToggleBlock} // NOVO: Passando o handler
            />
          ))
        )}
      </div>

      {/* Modal de Detalhes do Parceiro */}
      {showDetailModal && detailTargetParceiro && (
        <ParceiroDetailModal
          isOpen={showDetailModal}
          parceiro={detailTargetParceiro}
          motoristas={motoristas}
          veiculos={veiculos}
          getPermissoByVeiculoId={getPermissoByVeiculoId}
          onClose={() => {
            setShowDetailModal(false);
            setDetailTargetParceiro(null);
          }}
          onEdit={handleEditParceiro}
          onDelete={handleDeleteParceiro}
          onAddMotorista={handleAddMotorista}
          onAddVeiculo={handleAddVeiculo}
          onEditMotorista={handleEditMotorista}
          onEditVeiculo={handleEditVeiculo}
          onDeleteMotorista={handleDeleteMotorista}
          onDeleteVeiculo={handleDeleteVeiculo}
          onOpenPermissoModal={handleOpenPermissoModal}
        />
      )}

      {/* Modal de Formulário de Parceiro */}
      {showParceiroForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingParceiroId ? 'Editar Parceiro' : 'Novo Parceiro'}</h3>
                <button onClick={() => { setShowParceiroForm(false); resetParceiroForm(); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmitParceiro} className="space-y-4">
                
                {/* Tipo e Documento */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                    <select
                      value={parceiroFormData.tipo}
                      onChange={(e) => {
                        const novoTipo = e.target.value as 'PF' | 'PJ';
                        setParceiroFormData(prev => ({ 
                          ...prev, 
                          tipo: novoTipo, 
                          documento: '', 
                          nome: '', 
                          nomeFantasia: '',
                          isMotorista: novoTipo === 'PF' ? prev.isMotorista : false,
                          cnh: novoTipo === 'PF' ? prev.cnh : '',
                        }));
                        setCnpjConsultado(false);
                        setConsultandoCNPJ(false);
                      }}
                      className="input-field"
                      disabled={!!editingParceiroId}
                    >
                      <option value="PJ">Pessoa Jurídica</option>
                      <option value="PF">Pessoa Física</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {parceiroFormData.tipo === 'PJ' ? 'CNPJ *' : 'CPF *'}
                      {consultandoCNPJ && <span className="ml-2 text-blue-500 text-xs">Consultando...</span>}
                    </label>
                    <input
                      type="text"
                      value={parceiroFormData.documento}
                      onChange={(e) => {
                        const formatted = formatDocument(e.target.value, parceiroFormData.tipo);
                        const limpo = formatted.replace(/\D/g, '');
                        setParceiroFormData(prev => ({ ...prev, documento: formatted }));
                        if (parceiroFormData.tipo === 'PJ' && limpo.length === 14 && !cnpjConsultado) {
                          handleCNPJConsultation(formatted);
                        }
                        if (cnpjConsultado && limpo.length < 14) setCnpjConsultado(false);
                      }}
                      className={`input-field ${consultandoCNPJ ? 'opacity-50' : ''}`}
                      placeholder={parceiroFormData.tipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                      disabled={consultandoCNPJ}
                      required
                    />
                    {parceiroFormData.tipo === 'PJ' && cnpjConsultado && (
                      <p className="text-green-600 text-xs mt-1">✓ Dados consultados automaticamente</p>
                    )}
                  </div>
                </div>

                {/* Nomes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {parceiroFormData.tipo === 'PJ' ? 'Razão Social *' : 'Nome *'}
                    </label>
                    <input
                      type="text"
                      value={parceiroFormData.nome}
                      onChange={(e) => setParceiroFormData(prev => ({ ...prev, nome: e.target.value }))}
                      className="input-field"
                      required
                    />
                  </div>
                  
                  {parceiroFormData.tipo === 'PJ' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome Fantasia
                      </label>
                      <input
                        type="text"
                        value={parceiroFormData.nomeFantasia}
                        onChange={(e) => setParceiroFormData(prev => ({ ...prev, nomeFantasia: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  )}
                </div>
                
                {/* Contato */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={parceiroFormData.email}
                      onChange={(e) => setParceiroFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={parceiroFormData.telefone}
                      onChange={(e) => setParceiroFormData(prev => ({ ...prev, telefone: formatContact(e.target.value) }))}
                      className="input-field"
                      placeholder="Ex: (11) 98765-4321"
                    />
                  </div>
                </div>
                
                {/* Endereço */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={parceiroFormData.endereco}
                      onChange={(e) => setParceiroFormData(prev => ({ ...prev, endereco: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP</label>
                    <input
                      type="text"
                      value={parceiroFormData.cep}
                      onChange={(e) => setParceiroFormData(prev => ({ ...prev, cep: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={parceiroFormData.cidade}
                      onChange={(e) => setParceiroFormData(prev => ({ ...prev, cidade: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UF</label>
                    <input
                      type="text"
                      value={parceiroFormData.uf}
                      onChange={(e) => setParceiroFormData(prev => ({ ...prev, uf: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                </div>
                
                {/* PIX */}
                <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg space-y-3">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-purple-600" /> Dados PIX (Opcional)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Chave</label>
                            <select
                                value={parceiroFormData.pixKeyType}
                                onChange={(e) => setParceiroFormData(prev => ({ ...prev, pixKeyType: e.target.value as Parceiro['pixKeyType'], pixKey: '' }))}
                                className="input-field"
                            >
                                <option value="">Não Informado</option>
                                <option value="CPF">CPF</option>
                                <option value="CNPJ">CNPJ</option>
                                <option value="Celular">Celular</option>
                                <option value="E-mail">E-mail</option>
                                <option value="Chave aleatória">Chave aleatória</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Chave PIX
                                {parceiroFormData.pixKeyType === 'CNPJ' && consultandoPixCnpj && (
                                    <span className="ml-2 text-blue-500 text-xs">Consultando...</span>
                                )}
                            </label>
                            <input
                                type="text"
                                value={parceiroFormData.pixKey}
                                onChange={(e) => {
                                    const formatted = formatPixKey(e.target.value, parceiroFormData.pixKeyType || '');
                                    setParceiroFormData(prev => ({ ...prev, pixKey: formatted }));
                                    
                                    // Lógica de consulta de CNPJ para PIX
                                    if (parceiroFormData.pixKeyType === 'CNPJ') {
                                        const cleanCnpj = parseDocument(formatted);
                                        if (cleanCnpj.length === 14) {
                                            handlePixCnpjConsultation(formatted);
                                        }
                                    }
                                }}
                                className={`input-field font-mono ${parceiroFormData.pixKeyType === 'CNPJ' && consultandoPixCnpj ? 'opacity-50' : ''}`}
                                disabled={!parceiroFormData.pixKeyType || consultandoPixCnpj}
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titular da Chave (Padrão: Nome/Razão Social)</label>
                            <input
                                type="text"
                                value={parceiroFormData.pixTitular}
                                onChange={(e) => setParceiroFormData(prev => ({ ...prev, pixTitular: e.target.value }))}
                                className="input-field"
                            />
                        </div>
                    </div>
                </div>
                
                {/* Motorista Próprio (Apenas para PF) */}
                {parceiroFormData.tipo === 'PF' && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">É Motorista Próprio?</label>
                        <button
                            type="button"
                            onClick={() => setParceiroFormData(prev => ({ ...prev, isMotorista: !prev.isMotorista }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                                parceiroFormData.isMotorista
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    parceiroFormData.isMotorista ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                )}
                
                {/* CNH (Apenas se for Motorista Próprio) */}
                {parceiroFormData.tipo === 'PF' && parceiroFormData.isMotorista && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNH</label>
                        <input
                            type="text"
                            value={parceiroFormData.cnh}
                            onChange={(e) => setParceiroFormData(prev => ({ ...prev, cnh: e.target.value }))}
                            className="input-field"
                        />
                    </div>
                )}

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                  <textarea
                    value={parceiroFormData.observacoes}
                    onChange={(e) => setParceiroFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                    className="input-field"
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" className="btn-secondary" onClick={() => { setShowParceiroForm(false); resetParceiroForm(); }}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={consultandoCNPJ || consultandoPixCnpj}>
                    {editingParceiroId ? 'Salvar alterações' : 'Adicionar Parceiro'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulário de Motorista */}
      {showMotoristaForm && (
        <MotoristaFormModal
          isOpen={showMotoristaForm}
          parceiroId={motoristaFormData.parceiroId}
          parceiros={parceiros}
          formData={motoristaFormData}
          setFormData={setMotoristaFormData}
          editingId={editingMotoristaId}
          onClose={() => { 
            setShowMotoristaForm(false); 
            resetMotoristaForm(); 
            // Reabre o modal de detalhes se ele foi fechado
            if (detailTargetParceiro) setShowDetailModal(true);
          }}
          onSubmit={handleSubmitMotorista}
        />
      )}

      {/* Modal de Formulário de Veículo */}
      {showVeiculoForm && (
        <VeiculoFormModal
          isOpen={showVeiculoForm}
          parceiroId={veiculoFormData.parceiroId}
          parceiros={parceiros}
          formData={veiculoFormData}
          setFormData={setVeiculoFormData}
          editingId={editingVeiculoId}
          onClose={() => { 
            setShowVeiculoForm(false); 
            resetVeiculoForm(); 
            // Reabre o modal de detalhes se ele foi fechado
            if (detailTargetParceiro) setShowDetailModal(true);
          }}
          onSubmit={handleSubmitVeiculo}
          consultandoPlaca={consultandoPlaca}
          placaConsultada={placaConsultada}
          placaError={placaError}
          handlePlacaConsultation={handlePlacaConsultation}
        />
      )}
      
      {/* Modal de Permisso Internacional */}
      {showPermissoModal && permissoTargetVeiculo && (
        <PermissoModal
          isOpen={showPermissoModal}
          veiculo={permissoTargetVeiculo}
          onClose={() => { 
            setShowPermissoModal(false); 
            setPermissoTargetVeiculo(null);
            // Reabre o modal de detalhes
            if (detailTargetParceiro) setShowDetailModal(true);
          }}
          onSave={handleSavePermisso}
          existingPermisso={getPermissoByVeiculoId(permissoTargetVeiculo.id)}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && deleteTarget && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => { 
            setShowDeleteConfirm(false); 
            setDeleteTarget(null); 
            // Reabre o modal de detalhes se ele foi fechado
            if (detailTargetParceiro) setShowDetailModal(true);
          }}
          onConfirm={confirmDelete}
          title={`Excluir ${deleteTarget.type === 'parceiro' ? 'Parceiro' : deleteTarget.type === 'motorista' ? 'Motorista' : 'Veículo'}`}
          message={
            <>
              Tem certeza que deseja excluir {deleteTarget.type === 'parceiro' ? 'o parceiro' : deleteTarget.type === 'motorista' ? 'o motorista' : 'o veículo'} 
              <span className="font-semibold"> {deleteTarget.name}</span>?
              {deleteTarget.type === 'parceiro' && (
                <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                  Isso também excluirá todos os motoristas e veículos vinculados.
                </span>
              )}
            </>
          }
          confirmText="Excluir"
          variant="danger"
        />
      )}
    </div>
  );
};

export default Parceiros;