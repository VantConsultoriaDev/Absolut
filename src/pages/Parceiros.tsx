import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { 
  Plus, 
  Search, 
  X, 
  CreditCard,
  AlertTriangle, // NOVO
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
  isValidCPF, // NOVO: Importando isValidCPF
} from '../utils/formatters';
import { Parceiro, Motorista, Veiculo, PermissoInternacional } from '../types';
import { format, isValid } from 'date-fns';
import ParceiroCard from '../components/parceiros/ParceiroCard';
import ParceiroDetailModal from '../components/parceiros/ParceiroDetailModal';
import MotoristaFormModal, { MotoristaFormData } from '../components/parceiros/MotoristaFormModal';
import VeiculoFormModal, { VeiculoFormData } from '../components/parceiros/VeiculoFormModal'; // Importando VeiculoFormData
import ConfirmationModal from '../components/ConfirmationModal';
import { showError } from '../utils/toast';
import { CNPJService } from '../services/cnpjService'; // Importando CNPJService
import { VehicleService } from '../services/vehicleService'; // Importando VehicleService
import { PlacaData } from '../services/vehicleService'; // Importando PlacaData
import { CPFService } from '../services/cpfService'; // NOVO: Importando CPFService
import { PermissoService, PermissoApiData } from '../services/permissoService'; // Importando PermissoService

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
  
  // Permisso fields (NOVO)
  permissoRazaoSocial: '',
  permissoNomeFantasia: '',
  permissoCnpj: '',
  permissoEnderecoCompleto: '',
  permissoSimulado: false,
  permissoDataConsulta: undefined,
  permissoChassiAtualizado: undefined,
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
  responsavel: '', // NOVO CAMPO
  pixKeyType: '',
  pixKey: '',
  pixTitular: '',
  
  // NOVOS CAMPOS DE IDENTIFICAÇÃO PESSOAL
  dataNascimento: undefined,
  rg: undefined,
  orgaoEmissor: undefined,
  
  endereco: '',
  numero: '', // NOVO CAMPO
  complemento: '', // NOVO CAMPO
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
    getPermissoByVeiculoId,
  } = useDatabase();

  // Estados de Modais e Formulários
  const [showParceiroForm, setShowParceiroForm] = useState(false);
  const [editingParceiroId, setEditingParceiroId] = useState<string | null>(null);
  // Usamos um estado que reflete a interface Parceiro, mas com dataNascimentoStr para o input
  const [parceiroFormData, setParceiroFormData] = useState<Parceiro & { dataNascimentoStr?: string }>(initialParceiroFormData);
  
  const [showMotoristaForm, setShowMotoristaForm] = useState(false);
  const [editingMotoristaId, setEditingMotoristaId] = useState<string | null>(null);
  const [motoristaFormData, setMotoristaFormData] = useState<MotoristaFormData>(initialMotoristaFormData);
  
  const [showVeiculoForm, setShowVeiculoForm] = useState(false);
  const [editingVeiculoId, setEditingVeiculoId] = useState<string | null>(null);
  const [veiculoFormData, setVeiculoFormData] = useState<VeiculoFormData>(initialVeiculoFormData);
  
  // REMOVIDO: Permisso Modal State
  // const [showPermissoModal, setShowPermissoModal] = useState(false);
  // const [permissoTargetVeiculo, setPermissoTargetVeiculo] = useState<Veiculo | null>(null);
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTargetParceiro, setDetailTargetParceiro] = useState<Parceiro | null>(null);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string, type: 'parceiro' | 'motorista' | 'veiculo' } | null>(null);

  // Estados de Consulta de API
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false);
  const [cnpjConsultado, setCnpjConsultado] = useState(false);
  const [cnpjError, setCnpjError] = useState('');
  
  // NOVO: Estados para consulta de CPF
  const [consultandoCPF, setConsultandoCPF] = useState(false);
  const [cpfConsultado, setCpfConsultado] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [lastConsultedCpf, setLastConsultedCpf] = useState('');
  
  const [consultandoPlaca, setConsultandoPlaca] = useState(false);
  const [placaConsultada, setPlacaConsultada] = useState(false);
  const [placaError, setPlacaError] = useState('');
  
  // NOVO: Estado para consulta de CNPJ do PIX
  const [consultandoPixCnpj, setConsultandoPixCnpj] = useState(false);
  const [pixCnpjError, setPixCnpjError] = useState('');
  
  // NOVO: Rastreamento do último valor consultado (limpo)
  const [lastConsultedCnpj, setLastConsultedCnpj] = useState('');
  const [lastConsultedPlaca, setLastConsultedPlaca] = useState('');
  
  // NOVO: Estado de consulta de Permisso
  const [consultandoPermisso, setConsultandoPermisso] = useState(false);
  const [permissoError, setPermissoError] = useState('');

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
      // REMOVIDO: setShowPermissoModal(false);
      setShowDetailModal(false);
      setEditingParceiroId(null);
      setEditingMotoristaId(null);
      setEditingVeiculoId(null);
      // REMOVIDO: setPermissoTargetVeiculo(null);
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
    setCnpjError('');
    setPixCnpjError('');
    setLastConsultedCnpj('');
    
    // NOVO: Reset de estados de CPF
    setCpfConsultado(false);
    setConsultandoCPF(false);
    setCpfError('');
    setLastConsultedCpf('');
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
    setLastConsultedPlaca('');
    
    // NOVO: Reset de estados de Permisso
    setConsultandoPermisso(false);
    setPermissoError('');
  };

  // --- PARCEIRO CRUD ---
  const handleEditParceiro = (parceiro: Parceiro) => {
    const cleanCnpj = parseDocument(parceiro.documento || '');
    const cleanCpf = parseDocument(parceiro.documento || '');
    
    setParceiroFormData({
      ...parceiro,
      documento: formatDocument(parceiro.documento || '', parceiro.tipo),
      telefone: formatContact(parceiro.telefone || ''),
      responsavel: (parceiro as any).responsavel || '',
      pixKey: parceiro.pixKey ? formatPixKey(parceiro.pixKey, parceiro.pixKeyType || '') : '',
      numero: (parceiro as any).numero || '',
      complemento: (parceiro as any).complemento || '',
      
      // NOVOS CAMPOS DE IDENTIFICAÇÃO PESSOAL
      rg: parceiro.rg || undefined,
      orgaoEmissor: parceiro.orgaoEmissor || undefined,
      dataNascimento: parceiro.dataNascimento,
      dataNascimentoStr: parceiro.dataNascimento && isValid(parceiro.dataNascimento) 
          ? format(parceiro.dataNascimento, 'yyyy-MM-dd') 
          : undefined,
    });
    setEditingParceiroId(parceiro.id);
    setShowDetailModal(false);
    setShowParceiroForm(true);
    setCnpjError('');
    setPixCnpjError('');
    
    // Lógica de rastreamento CNPJ
    if (parceiro.tipo === 'PJ' && cleanCnpj.length === 14) {
        setCnpjConsultado(true);
        setLastConsultedCnpj(cleanCnpj);
    } else {
        setCnpjConsultado(false);
        setLastConsultedCnpj('');
    }
    
    // Lógica de rastreamento CPF (NOVO)
    if (parceiro.tipo === 'PF' && cleanCpf.length === 11) {
        setCpfConsultado(true);
        setLastConsultedCpf(cleanCpf);
    } else {
        setCpfConsultado(false);
        setLastConsultedCpf('');
    }
  };

  const handleSubmitParceiro = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanDocument = parseDocument(parceiroFormData.documento || '');
    const cleanPixKeyVal = cleanPixKey(parceiroFormData.pixKey || '', parceiroFormData.pixKeyType || '');

    // Validação de CNPJ/CPF
    if (parceiroFormData.tipo === 'PJ') {
        if (!CNPJService.validarCNPJ(cleanDocument)) {
            setCnpjError('CNPJ inválido. Verifique os dígitos.');
            return;
        }
    } else if (parceiroFormData.tipo === 'PF') {
        if (!isValidCPF(cleanDocument)) {
            setCpfError('CPF inválido. Verifique os dígitos.');
            return;
        }
    }
    
    // Validação de PIX CNPJ (se for o caso)
    if (parceiroFormData.pixKeyType === 'CNPJ' && !CNPJService.validarCNPJ(cleanPixKeyVal)) {
        setPixCnpjError('CNPJ da chave PIX inválido.');
        return;
    }
    
    // 1. Converte data de nascimento de volta para Date
    const dataNascimentoDate = parceiroFormData.dataNascimentoStr 
        ? createLocalDate(parceiroFormData.dataNascimentoStr) 
        : undefined;
        
    // 2. Prepara o payload base
    const payloadBase: Parceiro = {
      ...parceiroFormData,
      documento: cleanDocument,
      telefone: parseDocument(parceiroFormData.telefone || ''),
      responsavel: parceiroFormData.responsavel,
      pixKey: cleanPixKeyVal,
      pixTitular: parceiroFormData.pixTitular || parceiroFormData.nome,
      nomeFantasia: parceiroFormData.tipo === 'PF' ? undefined : parceiroFormData.nomeFantasia,
      isActive: parceiroFormData.isActive ?? true,
      
      // Campos de identificação PF
      dataNascimento: dataNascimentoDate,
      rg: parceiroFormData.rg,
      orgaoEmissor: parceiroFormData.orgaoEmissor,
    };
    
    // 3. Lógica para limpar campos de endereço se for PF
    let finalPayload: Parceiro;
    if (parceiroFormData.tipo === 'PF') {
        finalPayload = {
            ...payloadBase,
            endereco: undefined,
            numero: undefined,
            complemento: undefined,
            cidade: undefined,
            uf: undefined,
            cep: undefined,
        };
    } else {
        finalPayload = payloadBase;
    }

    try {
      if (editingParceiroId) {
        updateParceiro(editingParceiroId, finalPayload);
      } else {
        createParceiro(finalPayload);
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
  
  const handleToggleBlock = (parceiro: Parceiro) => {
    const newStatus = !(parceiro.isActive ?? true);
    try {
        updateParceiro(parceiro.id, { isActive: newStatus });
    } catch (e) {
        showError(e instanceof Error ? e.message : 'Erro ao alterar status de bloqueio.');
    }
  };

  // --- MOTORISTA CRUD ---
  const handleAddMotorista = (parceiroId: string) => {
    resetMotoristaForm();
    setMotoristaFormData(prev => ({ ...prev, parceiroId }));
    setShowMotoristaForm(true);
  };

  const handleEditMotorista = (motorista: Motorista) => {
    setMotoristaFormData({
      parceiroId: motorista.parceiroId,
      nome: motorista.nome,
      cpf: formatDocument(motorista.cpf, motorista.nacionalidade === 'Brasileiro' ? 'PF' : 'INTERNACIONAL'), // Usa INTERNACIONAL para não formatar
      cnh: motorista.cnh,
      nacionalidade: motorista.nacionalidade || 'Brasileiro',
      categoriaCnh: motorista.categoriaCnh || '',
      // FIX: Ensure validadeCnh is a string in YYYY-MM-DD format only if it's a valid Date object
      validadeCnh: motorista.validadeCnh && isValid(motorista.validadeCnh) 
          ? format(motorista.validadeCnh, 'yyyy-MM-dd') 
          : '',
      telefone: formatContact(motorista.telefone || ''),
      isActive: motorista.isActive ?? true,
      
      // NOVOS CAMPOS DE IDENTIFICAÇÃO PESSOAL
      dataNascimentoStr: motorista.dataNascimento && isValid(motorista.dataNascimento) 
          ? format(motorista.dataNascimento, 'yyyy-MM-dd') 
          : undefined,
      rg: motorista.rg,
      orgaoEmissor: motorista.orgaoEmissor,
    });
    setEditingMotoristaId(motorista.id);
    setShowMotoristaForm(true);
  };

  const handleSubmitMotorista = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isBrasileiro = motoristaFormData.nacionalidade === 'Brasileiro';
    let finalDocument = motoristaFormData.cpf.trim();
    
    if (isBrasileiro) {
        // Para brasileiro, limpamos e validamos o CPF
        finalDocument = parseDocument(finalDocument);
        
        if (finalDocument.length !== 11 || !isValidCPF(finalDocument)) {
            showError('CPF inválido. Verifique o número e os dígitos.');
            return;
        }
    } else {
        // Estrangeiro: Apenas verifica se o campo Documento está preenchido
        if (!finalDocument) {
            showError('Documento é obrigatório para motoristas estrangeiros.');
            return;
        }
        // Para estrangeiro, o documento é mantido como está (pode conter letras/símbolos)
    }
    
    const cleanTelefone = parseDocument(motoristaFormData.telefone || '');

    // 1. Converte data de nascimento de volta para Date
    const dataNascimentoDate = motoristaFormData.dataNascimentoStr 
        ? createLocalDate(motoristaFormData.dataNascimentoStr) 
        : undefined;
        
    const payload: Omit<Motorista, 'id' | 'createdAt' | 'updatedAt'> = {
      ...motoristaFormData,
      cpf: finalDocument, // Usa o documento final (limpo para BR, bruto para Estrangeiro)
      telefone: cleanTelefone,
      validadeCnh: motoristaFormData.validadeCnh ? createLocalDate(motoristaFormData.validadeCnh) : undefined,
      isActive: true, // Força como ativo (não há controle de status na UI)
      
      // NOVOS CAMPOS DE IDENTIFICAÇÃO PESSOAL
      dataNascimento: dataNascimentoDate,
      rg: motoristaFormData.rg,
      orgaoEmissor: motoristaFormData.orgaoEmissor,
    };

    try {
      if (editingMotoristaId) {
        updateMotorista(editingMotoristaId, payload);
      } else {
        createMotorista(payload);
      }
      setShowMotoristaForm(false);
      resetMotoristaForm();
      // Reabre o modal de detalhes (se ele foi fechado pelo clique externo no modal secundário)
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
    }
  };

  // --- VEÍCULO CRUD ---
  const handleAddVeiculo = (parceiroId: string) => {
    resetVeiculoForm();
    setVeiculoFormData(prev => ({ ...prev, parceiroId }));
    setShowVeiculoForm(true);
  };

  const handleEditVeiculo = (veiculo: Veiculo) => {
    const placa = veiculo.placa || veiculo.placaCavalo || veiculo.placaCarreta || '';
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
    
    // Mapeia os dados do Permisso existente para o estado do formulário
    const permisso = getPermissoByVeiculoId(veiculo.id);
    
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
      userId: veiculo.userId || '',
      
      // Dados do Permisso
      permissoRazaoSocial: permisso?.razaoSocial || '',
      permissoNomeFantasia: permisso?.nomeFantasia || '',
      permissoCnpj: permisso?.cnpj || '',
      permissoEnderecoCompleto: permisso?.enderecoCompleto || '',
      permissoSimulado: permisso?.simulado || false,
      permissoDataConsulta: permisso?.dataConsulta,
      permissoChassiAtualizado: undefined, // Limpa o chassi atualizado
    });
    setEditingVeiculoId(veiculo.id);
    setShowVeiculoForm(true);
    
    // Se tiver placa completa, marca como consultada e rastreia
    if (placaLimpa.length === 7) {
        setPlacaConsultada(true);
        setLastConsultedPlaca(placaLimpa);
    } else {
        setPlacaConsultada(false);
        setLastConsultedPlaca('');
    }
  };

  const handleSubmitVeiculo = (e: React.FormEvent) => {
    e.preventDefault();
    
    const placaField = veiculoFormData.tipo === 'Cavalo' ? 'placaCavalo' : veiculoFormData.tipo === 'Carreta' ? 'placaCarreta' : 'placa';
    const placaValue = veiculoFormData[placaField];
    
    if (!placaValue || placaValue.replace(/[^A-Z0-9]/gi, '').length < 7) {
        showError('Placa inválida.');
        return;
    }
    
    // 1. Padroniza a placa para 7 caracteres e força maiúsculas
    const formattedPlaca = forceUpperCase(formatPlaca(placaValue));
    
    // 2. Prepara o payload do Permisso (se aplicável)
    let permissoPayload: PermissoInternacional | undefined = undefined;
    const isPermissoRequired = veiculoFormData.tipo === 'Cavalo' || veiculoFormData.tipo === 'Truck';
    
    // NOVO: Verifica se algum campo de Permisso foi preenchido
    const isPermissoFilled = !!veiculoFormData.permissoRazaoSocial || !!veiculoFormData.permissoCnpj || !!veiculoFormData.permissoEnderecoCompleto;
    
    if (isPermissoRequired && isPermissoFilled) {
        // Se for Cavalo/Truck E o usuário preencheu algum campo, criamos o payload
        
        // Validação mínima se o usuário tentou preencher
        if (!veiculoFormData.permissoRazaoSocial || !veiculoFormData.permissoCnpj) {
            showError('Se você preencher o Permisso, Razão Social e CNPJ são obrigatórios.');
            return;
        }
        
        permissoPayload = {
            id: editingVeiculoId ? getPermissoByVeiculoId(editingVeiculoId)?.id || '' : '', // ID é opcional na criação
            veiculoId: editingVeiculoId || '', // Será preenchido no contexto se for criação
            razaoSocial: veiculoFormData.permissoRazaoSocial,
            nomeFantasia: veiculoFormData.permissoNomeFantasia,
            cnpj: parseDocument(veiculoFormData.permissoCnpj),
            enderecoCompleto: veiculoFormData.permissoEnderecoCompleto,
            dataConsulta: veiculoFormData.permissoDataConsulta || new Date(),
            simulado: veiculoFormData.permissoSimulado,
            createdAt: new Date(), // Placeholder
            updatedAt: new Date(), // Placeholder
        } as PermissoInternacional;
    }
    
    // 3. Cria o payload do Veículo
    const payload: Omit<Veiculo, 'id' | 'createdAt' | 'updatedAt'> = {
      ...veiculoFormData,
      // Aplica a placa formatada e em maiúsculas
      placa: veiculoFormData.tipo === 'Truck' ? formattedPlaca : undefined,
      placaCavalo: veiculoFormData.tipo === 'Cavalo' ? formattedPlaca : undefined,
      placaCarreta: veiculoFormData.tipo === 'Carreta' ? formattedPlaca : undefined,
      
      // Campos numéricos e de texto
      ano: parseInt(veiculoFormData.ano) || undefined,
      capacidade: parseFloat(veiculoFormData.capacidade) || undefined,
      // CORREÇÃO: O chassi deve ser o valor do formulário, que foi atualizado pela consulta Permisso
      chassis: forceUpperCase(veiculoFormData.chassis || ''), 
      carroceria: veiculoFormData.carroceria,
      isActive: true,
      
      // Adiciona o Permisso ao payload do Veículo (undefined se não for Cavalo/Truck ou se não foi preenchido)
      permisso: permissoPayload,
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
    }
  };
  
  // --- CONSULTA API PERMISSO/ANTT ---
  const handlePermissoConsultation = async (placa: string) => {
    setConsultandoPermisso(true);
    setPermissoError('');
    
    // NOVO: Limpa a placa removendo o hífen e outros caracteres não alfanuméricos
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    try {
        // 1. Consulta Permisso (que agora retorna dados consolidados)
        const permissoData: PermissoApiData | null = await PermissoService.consultarPermisso(placaLimpa);
        
        if (!permissoData) {
            setPermissoError('Nenhum dado de Permisso encontrado para esta placa.');
            return;
        }
        
        // 2. Consolida e atualiza o formulário
        setVeiculoFormData(prev => {
            const newChassis = permissoData?.chassi || prev.chassis;
            
            return {
                ...prev,
                // Dados do Permisso
                permissoRazaoSocial: permissoData?.razaoSocial || prev.permissoRazaoSocial,
                permissoNomeFantasia: permissoData?.nomeFantasia || prev.permissoNomeFantasia,
                permissoCnpj: parseDocument(permissoData?.cnpj || prev.permissoCnpj),
                permissoEnderecoCompleto: permissoData?.enderecoCompleto || prev.permissoEnderecoCompleto,
                permissoSimulado: permissoData?.simulado || false,
                permissoDataConsulta: new Date(),
                permissoChassiAtualizado: newChassis, // Atualiza o chassi auxiliar
                
                // ATUALIZAÇÃO CRÍTICA: Atualiza o campo CHASSIS do formulário
                chassis: newChassis ? forceUpperCase(newChassis) : prev.chassis,
            };
        });
        
        setPermissoError('');
        showError('Dados de Permisso sincronizados com sucesso.');
        
    } catch (err) {
        console.error('Erro na consulta Permisso:', err);
        const errorMessage = err instanceof Error ? err.message : 'Falha na sincronização. Verifique a placa e tente novamente.';
        setPermissoError(errorMessage);
        
        // Fallback para dados simulados se a API falhar completamente
        setVeiculoFormData(prev => ({
            ...prev,
            permissoSimulado: true,
            permissoDataConsulta: new Date(),
        }));
    } finally {
        setConsultandoPermisso(false);
    }
  };
  
  // --- CONSULTA API CNPJ (Geral) ---
  const handleCNPJConsultation = async (cnpj: string) => {
    if (parceiroFormData.tipo !== 'PJ') return;
    const cnpjLimpo = parseDocument(cnpj);
    setCnpjError('');
    
    if (cnpjLimpo.length !== 14) return;
    
    if (!CNPJService.validarCNPJ(cnpjLimpo)) {
        setCnpjError('CNPJ inválido. Verifique os dígitos.');
        return;
    }
    
    if (cnpjLimpo === lastConsultedCnpj && cnpjConsultado && !consultandoCNPJ) {
        return;
    }
    
    if (consultandoCNPJ) return;

    setConsultandoCNPJ(true);
    setCnpjConsultado(false);
    
    try {
      const dados = await CNPJService.consultarCNPJ(cnpj);
      
      if (dados) {
        setParceiroFormData(prev => ({
          ...prev,
          nome: dados.razaoSocial || prev.nome,
          nomeFantasia: dados.nomeFantasia || prev.nomeFantasia,
          telefone: formatContact(dados.telefone || prev.telefone || ''),
          endereco: dados.endereco || prev.endereco,
          numero: dados.numero || prev.numero,
          complemento: dados.complemento || prev.complemento,
          cidade: dados.cidade || prev.cidade,
          uf: dados.uf || prev.uf,
          cep: dados.cep || prev.cep,
        }));
        setCnpjConsultado(true);
        setLastConsultedCnpj(cnpjLimpo);
        setCnpjError('');
        if (dados.simulado) {
          showError('Não foi possível conectar com a API de CNPJ. Usando dados simulados como fallback.')
        }
      } else {
        setCnpjError('CNPJ válido, mas não encontrado na base de dados externa.');
        setLastConsultedCnpj('');
      }
    } catch (err) {
      console.error('Erro ao consultar CNPJ:', err);
      setCnpjError(err instanceof Error ? err.message : 'Erro ao consultar CNPJ. Verifique o número e tente novamente.');
      setLastConsultedCnpj('');
    } finally {
      setConsultandoCNPJ(false);
    }
  };
  
  // --- CONSULTA API CPF (NOVO) ---
  const handleCPFConsultation = async (cpf: string) => {
    if (parceiroFormData.tipo !== 'PF') return;
    const cpfLimpo = parseDocument(cpf);
    setCpfError('');
    
    if (cpfLimpo.length !== 11) return;
    
    // 1. Validação de Dígitos
    if (!isValidCPF(cpfLimpo)) {
        setCpfError('CPF inválido. Verifique os dígitos.');
        return;
    }
    
    // 2. Verifica se o CPF já foi consultado e não foi alterado
    if (cpfLimpo === lastConsultedCpf && cpfConsultado && !consultandoCPF) {
        return;
    }
    
    if (consultandoCPF) return;

    setConsultandoCPF(true);
    setCpfConsultado(false);
    
    try {
      const dados = await CPFService.consultarCPF(cpf); 
      
      if (dados) {
        setParceiroFormData(prev => ({
          ...prev,
          nome: dados.nome || prev.nome,
          // Mapeamento de data de nascimento (string YYYY-MM-DD)
          dataNascimentoStr: dados.dataNascimento || prev.dataNascimentoStr,
          rg: dados.rg || prev.rg,
          orgaoEmissor: dados.orgaoEmissor || prev.orgaoEmissor,
          email: dados.email || prev.email,
          telefone: dados.telefone || prev.telefone,
        }));
        setCpfConsultado(true);
        setLastConsultedCpf(cpfLimpo);
        setCpfError('');
        if (dados.simulado) {
          showError('Não foi possível conectar com a API de CPF. Usando dados simulados como fallback.');
        }
      } else {
        setCpfError('CPF válido, mas não encontrado na base de dados externa.');
        setLastConsultedCpf('');
      }
    } catch (err) {
      console.error('Erro ao consultar CPF:', err);
      setCpfError(err instanceof Error ? err.message : 'Erro ao consultar CPF. Verifique o número e tente novamente.');
      setLastConsultedCpf('');
    } finally {
      setConsultandoCPF(false);
    }
  };
  
  // --- CONSULTA API CNPJ (PIX) ---
  const handlePixCnpjConsultation = async (cnpj: string) => {
    const cleanCnpj = parseDocument(cnpj);
    setPixCnpjError('');
    
    if (cleanCnpj.length !== 14) return;
    
    // 1. Validação de Dígitos
    if (!CNPJService.validarCNPJ(cleanCnpj)) {
        setPixCnpjError('CNPJ inválido. Verifique os dígitos.');
        return;
    }
    
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
            setPixCnpjError('');
        } else {
            setPixCnpjError('Razão Social não encontrada para este CNPJ.');
        }
      } else {
        setPixCnpjError('CNPJ não encontrado para a chave PIX.');
      }
    } catch (err) {
      console.error('Erro ao consultar CNPJ do PIX:', err);
      setPixCnpjError('Falha ao consultar CNPJ do PIX. Tente novamente.');
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
    
    // 1. Verifica se a Placa já foi consultada e não foi alterada
    if (placaLimpa === lastConsultedPlaca && placaConsultada && !consultandoPlaca) {
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
          carroceria: (data as any).carroceria || prev.carroceria,
        }));
        setPlacaConsultada(true);
        setLastConsultedPlaca(placaLimpa);
      } else {
        setPlacaError('Placa não encontrada na base de dados externa.');
        setLastConsultedPlaca('');
      }
    } catch (err) {
      console.error('Erro ao consultar placa:', err);
      setPlacaError(err instanceof Error ? err.message : 'Falha ao consultar placa. Verifique a conexão ou o token da API.');
      setLastConsultedPlaca('');
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
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Tente ajustar sua busca ou adicione um novo parceiro.</p>
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
              onToggleBlock={handleToggleBlock}
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
                          responsavel: '',
                          isMotorista: novoTipo === 'PF' ? prev.isMotorista : false,
                          cnh: novoTipo === 'PF' ? prev.cnh : '',
                          dataNascimento: novoTipo === 'PJ' ? undefined : prev.dataNascimento,
                          dataNascimentoStr: novoTipo === 'PJ' ? undefined : prev.dataNascimentoStr,
                          rg: novoTipo === 'PJ' ? undefined : prev.rg,
                          orgaoEmissor: novoTipo === 'PJ' ? undefined : prev.orgaoEmissor,
                        }));
                        setCnpjConsultado(false);
                        setConsultandoCNPJ(false);
                        setCnpjError('');
                        setLastConsultedCnpj('');
                        setCpfConsultado(false);
                        setConsultandoCPF(false);
                        setCpfError('');
                        setLastConsultedCpf('');
                      }}
                      className="input-field"
                      disabled={!!editingParceiroId}
                    >
                      <option value="PJ">Pessoa Jurídica</option>
                      <option value="PF">Pessoa Física</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    {parceiroFormData.tipo === 'PJ' ? (
                      <>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          CNPJ *
                          {consultandoCNPJ && (
                            <span className="ml-2 text-blue-500 text-xs">Consultando...</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={parceiroFormData.documento}
                          onChange={(e) => {
                            const formatted = formatDocument(e.target.value, 'PJ');
                            const limpo = parseDocument(formatted);
                            
                            if (limpo !== parseDocument(parceiroFormData.documento || '')) {
                                setCnpjConsultado(false);
                            }
                            
                            setParceiroFormData(prev => ({ ...prev, documento: formatted }));
                            setCnpjError('');
                            
                            if (limpo.length === 14) {
                              handleCNPJConsultation(formatted);
                            }
                          }}
                          className={`input-field ${consultandoCNPJ ? 'opacity-50' : ''}`}
                          placeholder={'00.000.000/0000-00'}
                          disabled={consultandoCNPJ}
                          required
                        />
                        {cnpjError && (
                            <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
                                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                                <p className="text-xs text-red-700 dark:text-red-400">{cnpjError}</p>
                            </div>
                        )}
                        {parceiroFormData.tipo === 'PJ' && cnpjConsultado && !cnpjError && (
                          <p className="text-green-600 text-xs mt-1">✓ Dados consultados automaticamente</p>
                        )}
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          CPF *
                          {consultandoCPF && (
                            <span className="ml-2 text-blue-500 text-xs">Consultando...</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={parceiroFormData.documento}
                          onChange={(e) => {
                            const formatted = formatDocument(e.target.value, 'PF');
                            const limpo = parseDocument(formatted);
                            
                            // Se o documento for alterado, reseta o estado de consulta
                            if (limpo !== parseDocument(parceiroFormData.documento || '')) {
                                setCpfConsultado(false);
                            }
                            
                            setParceiroFormData(prev => ({ ...prev, documento: formatted }));
                            setCpfError(''); // Limpa erro ao digitar
                            
                            if (limpo.length === 11) {
                              handleCPFConsultation(formatted); // NOVO: Chama consulta CPF
                            }
                          }}
                          className={`input-field ${consultandoCPF ? 'opacity-50' : ''}`}
                          placeholder={'000.000.000-00'}
                          disabled={consultandoCPF}
                          required
                        />
                        {cpfError && (
                            <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
                                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                                <p className="text-xs text-red-700 dark:text-red-400">{cpfError}</p>
                            </div>
                        )}
                        {parceiroFormData.tipo === 'PF' && cpfConsultado && !cpfError && (
                          <p className="text-green-600 text-xs mt-1">✓ Dados consultados automaticamente</p>
                        )}
                      </>
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
                
                {/* NOVOS CAMPOS DE IDENTIFICAÇÃO PESSOAL (PF) - ATUALIZADO */}
                {parceiroFormData.tipo === 'PF' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                        <div className="md:col-span-3">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Identificação Pessoal</h4>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Nasc.</label>
                            <input
                                type="date"
                                value={parceiroFormData.dataNascimentoStr || ''}
                                onChange={(e) => setParceiroFormData(prev => ({ ...prev, dataNascimentoStr: e.target.value, dataNascimento: undefined }))} // dataNascimento é atualizado no submit
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RG</label>
                            <input
                                type="text"
                                value={parceiroFormData.rg || ''}
                                onChange={(e) => setParceiroFormData(prev => ({ ...prev, rg: e.target.value }))}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Órgão Emissor</label>
                            <input
                                type="text"
                                value={parceiroFormData.orgaoEmissor || ''}
                                onChange={(e) => setParceiroFormData(prev => ({ ...prev, orgaoEmissor: e.target.value }))}
                                className="input-field"
                            />
                        </div>
                    </div>
                )}
                
                {/* Contato e Responsável */}
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
                  
                  {parceiroFormData.tipo === 'PJ' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contato</label>
                        <input
                          type="text"
                          value={parceiroFormData.telefone}
                          onChange={(e) => setParceiroFormData(prev => ({ ...prev, telefone: formatContact(e.target.value) }))}
                          className="input-field"
                          placeholder="Ex: (11) 98765-4321"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsável</label>
                        <input
                          type="text"
                          value={parceiroFormData.responsavel}
                          onChange={(e) => setParceiroFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                          className="input-field"
                          placeholder="Nome do responsável"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contato</label>
                      <input
                        type="text"
                        value={parceiroFormData.telefone}
                        onChange={(e) => setParceiroFormData(prev => ({ ...prev, telefone: formatContact(e.target.value) }))}
                        className="input-field"
                        placeholder="Ex: (11) 98765-4321"
                      />
                    </div>
                  )}
                </div>

                {/* Endereço, Número e Complemento (Apenas para PJ) */}
                {parceiroFormData.tipo === 'PJ' && (
                    <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
                          <input
                            type="text"
                            value={parceiroFormData.endereco}
                            onChange={(e) => setParceiroFormData(prev => ({ ...prev, endereco: e.target.value }))}
                            className="input-field"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número</label>
                            <input
                              type="text"
                              value={parceiroFormData.numero}
                              onChange={(e) => setParceiroFormData(prev => ({ ...prev, numero: e.target.value }))}
                              className="input-field"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Complemento</label>
                            <input
                              type="text"
                              value={parceiroFormData.complemento}
                              onChange={(e) => setParceiroFormData(prev => ({ ...prev, complemento: e.target.value }))}
                              className="input-field"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP</label>
                            <input
                              type="text"
                              value={parceiroFormData.cep}
                              onChange={(e) => setParceiroFormData(prev => ({ ...prev, cep: e.target.value }))}
                              className="input-field"
                            />
                          </div>
                        </div>
                    </>
                )}
                
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
                                    setPixCnpjError('');
                                    
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
                            {pixCnpjError && (
                                <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
                                    <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                                    <p className="text-xs text-red-700 dark:text-red-400">{pixCnpjError}</p>
                                </div>
                            )}
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
                  <button type="submit" className="btn-primary" disabled={consultandoCNPJ || consultandoCPF || consultandoPixCnpj || !!cnpjError || !!cpfError || !!pixCnpjError}>
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
          
          // NOVO: Permisso Props
          consultandoPermisso={consultandoPermisso}
          permissoError={permissoError}
          handlePermissoConsultation={handlePermissoConsultation}
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