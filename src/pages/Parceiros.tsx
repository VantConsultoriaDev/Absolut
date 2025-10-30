import React, { useState, useMemo } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useModal } from '../hooks/useModal';
import { XCircle, CheckCircle, AlertTriangle, X, Plus, Edit, Trash2, User, Truck, Briefcase, Mail, Phone, MapPin, Calendar, ChevronRight, FileText } from 'lucide-react';
import { 
  formatDocument, 
  formatPlaca,
  formatContact,
  formatCUIT // Importado para formatação de documentos estrangeiros (ex: CUIT)
} from '../utils/formatters';
import StandardCheckbox from '../components/StandardCheckbox';
import { CNPJService } from '../services/cnpjService';
import { VehicleService } from '../services/vehicleService';
import { undoService } from '../services/undoService'; 
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PermissoModal from '../components/parceiros/PermissoModal'; // Importando o novo modal
import { PermissoInternacional } from '../types';

// Define PermissoData localmente para tipagem do estado
interface PermissoData {
  razaoSocial: string;
  cnpj: string;
  enderecoCompleto: string;
  simulado?: boolean;
}

export default function Parceiros() {
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
    updateVeiculo,
    deleteVeiculo,
    createPermisso, // NOVO
    updatePermisso, // NOVO
    getPermissoByVeiculoId, // NOVO
  } = useDatabase();
  
  const [selectedParceiro, setSelectedParceiro] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'motoristas' | 'veiculos'>('motoristas'); // Estado para abas
  const [showParceiroForm, setShowParceiroForm] = useState(false);
  const [showMotoristaForm, setShowMotoristaForm] = useState(false);
  const [showVeiculoForm, setShowVeiculoForm] = useState(false);
  const [showPermissoModal, setShowPermissoModal] = useState(false); // NOVO
  
  const [editingParceiro, setEditingParceiro] = useState<any>(null);
  const [editingMotorista, setEditingMotorista] = useState<any>(null);
  const [editingVeiculo, setEditingVeiculo] = useState<any>(null);
  const [permissoTargetVeiculo, setPermissoTargetVeiculo] = useState<any>(null); // NOVO
  const [existingPermisso, setExistingPermisso] = useState<PermissoData | null>(null); // NOVO
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Estados para modais de confirmação de exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: 'veiculo' | 'motorista' | 'parceiro', id: string, name: string} | null>(null);

  // Estados para consulta de CNPJ
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false);
  const [cnpjConsultado, setCnpjConsultado] = useState(false);
  
  // Estados para consulta de placa
  const [consultandoPlaca, setConsultandoPlaca] = useState(false);
  const [placaConsultada, setPlacaConsultada] = useState('');

  // Forms
  const [parceiroForm, setParceiroForm] = useState({
    nome: '',
    tipo: 'PF',
    documento: '',
    cnh: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    observacoes: '',
    isMotorista: false
  });

  const [motoristaForm, setMotoristaForm] = useState({
    nome: '',
    cpf: '',
    cnh: '',
    nacionalidade: 'Brasileiro' as 'Brasileiro' | 'Estrangeiro', // NOVO CAMPO
    telefone: '', // NOVO CAMPO
    parceiroId: '',
    veiculoVinculado: ''
  });

  const [veiculoForm, setVeiculoForm] = useState({
    tipo: 'Truck',
    placa: '',
    placaCavalo: '',
    fabricante: '',
    modelo: '',
    ano: '',
    chassis: '',
    carroceria: '',
    quantidadeCarretas: 1,
    possuiDolly: false,
    placaCarreta: '',
    placaCarreta1: '',
    placaCarreta2: '',
    placaDolly: '',
    parceiroId: '',
    motoristaVinculado: ''
  });

  // Hooks para gerenciar fechamento dos modais
  const resetParceiroForm = () => {
    setParceiroForm({
      nome: '',
      tipo: 'PF',
      documento: '',
      cnh: '',
      telefone: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      observacoes: '',
      isMotorista: false
    });
    setEditingParceiro(null);
    setShowParceiroForm(false);
    setCnpjConsultado(false);
  };
  
  const resetMotoristaForm = () => {
    setMotoristaForm({
      nome: '',
      cpf: '',
      cnh: '',
      nacionalidade: 'Brasileiro', // Reset para padrão
      telefone: '',
      parceiroId: '',
      veiculoVinculado: ''
    });
    setEditingMotorista(null);
    setShowMotoristaForm(false);
  };
  
  const resetVeiculoForm = () => {
    setVeiculoForm({
      tipo: 'Truck',
      placa: '',
      placaCavalo: '',
      fabricante: '',
      modelo: '',
      ano: '',
      chassis: '',
      carroceria: '',
      quantidadeCarretas: 1,
      possuiDolly: false,
      placaCarreta: '',
      placaCarreta1: '',
      placaCarreta2: '',
      placaDolly: '',
      parceiroId: '',
      motoristaVinculado: ''
    });
    setEditingVeiculo(null);
    setShowVeiculoForm(false);
    setPlacaConsultada('');
  };

  const { modalRef: parceiroModalRef } = useModal({
    isOpen: showParceiroForm,
    onClose: resetParceiroForm
  });

  const { modalRef: motoristaModalRef } = useModal({
    isOpen: showMotoristaForm,
    onClose: resetMotoristaForm
  });

  const { modalRef: veiculoModalRef } = useModal({
    isOpen: showVeiculoForm,
    onClose: resetVeiculoForm
  });

  // Filtrar parceiros
  const filteredParceiros = useMemo(() => {
    return parceiros.filter(parceiro => {
      const matchSearch = parceiro.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         parceiro.documento?.includes(searchTerm) ||
                         parceiro.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchTipo = !filterTipo || parceiro.tipo === filterTipo;
      const matchStatus = !filterStatus || 
                         (filterStatus === 'active' && parceiro.isActive) ||
                         (filterStatus === 'inactive' && !parceiro.isActive);
      
      return matchSearch && matchTipo && matchStatus;
    }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [parceiros, searchTerm, filterTipo, filterStatus]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalParceiros = parceiros.length;
    const parceirosAtivos = parceiros.filter(p => p.isActive).length;
    const totalMotoristas = motoristas.length;
    const totalVeiculos = veiculos.length;
    const parceirosPF = parceiros.filter(p => p.tipo === 'PF').length;
    const parceirosPJ = parceiros.filter(p => p.tipo === 'PJ').length;
    
    return { 
      totalParceiros, 
      parceirosAtivos, 
      totalMotoristas, 
      totalVeiculos,
      parceirosPF,
      parceirosPJ
    };
  }, [parceiros, motoristas, veiculos]);

  // Handlers para parceiros
  const handleParceiroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se o tipo é válido
    if (parceiroForm.tipo !== 'PF' && parceiroForm.tipo !== 'PJ') {
      alert('Tipo deve ser PF ou PJ');
      return;
    }
    
    const parceiroData = {
      ...parceiroForm,
      tipo: parceiroForm.tipo as 'PF' | 'PJ',
      isActive: true // Sempre ativo por padrão
    };

    if (editingParceiro) {
      updateParceiro(editingParceiro.id, parceiroData);
    } else {
      createParceiro(parceiroData);
    }

    resetParceiroForm();
  };

  // Função para consultar CNPJ automaticamente
  const handleCNPJConsultation = async (cnpj: string) => {
    // Só consulta se for PJ
    if (parceiroForm.tipo !== 'PJ') {
      return;
    }

    // Verifica se o CNPJ tem 14 dígitos (validação básica)
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      return;
    }

    // Evita consultas repetidas apenas se estiver consultando no momento
    if (consultandoCNPJ) {
      return;
    }

    setConsultandoCNPJ(true);
    
    try {
      const dadosCNPJ = await CNPJService.consultarCNPJ(cnpj);
      
      if (dadosCNPJ) {
        // Preenche automaticamente os campos com os dados da consulta
        setParceiroForm(prevForm => ({
            ...prevForm,
            nome: dadosCNPJ.razaoSocial || prevForm.nome,
            telefone: dadosCNPJ.telefone || prevForm.telefone,
            endereco: dadosCNPJ.endereco || prevForm.endereco,
            cidade: dadosCNPJ.cidade || prevForm.cidade,
            estado: dadosCNPJ.uf || prevForm.estado,
            cep: dadosCNPJ.cep || prevForm.cep
        }));
        
        setCnpjConsultado(true);
        
        // Verifica se os dados são simulados e informa o usuário
        if (dadosCNPJ.simulado) {
          alert('Não foi possível conectar com a API de CNPJ (erro de conectividade). Usando dados simulados para demonstração.');
        }
      }
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      alert('Erro ao consultar CNPJ. Verifique o número e tente novamente.');
    } finally {
      setConsultandoCNPJ(false);
    }
  };

  // Função para consultar placa automaticamente
  const handlePlacaConsultation = async (placa: string) => {
    // Remove formatação para validação
    const placaLimpa = placa.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    // Só consulta se a placa for válida (7 caracteres)
    if (!VehicleService.validarPlaca(placaLimpa)) {
      return;
    }

    // Evita consultas repetidas
    if (placaConsultada === placaLimpa) {
      return;
    }

    setConsultandoPlaca(true);
    
    try {
      const dadosPlaca = await VehicleService.consultarPlaca(placaLimpa);
      
      if (dadosPlaca) {
        // Preenche automaticamente os campos com os dados da consulta
        setVeiculoForm(prev => ({
          ...prev,
          fabricante: dadosPlaca.marca || prev.fabricante,
          modelo: dadosPlaca.modelo || prev.modelo,
          ano: dadosPlaca.ano || prev.ano
        }));
        
        setPlacaConsultada(placaLimpa);
      }
    } catch (error) {
      console.error('Erro ao consultar placa:', error);
      // Não mostra erro para o usuário, pois a API pode não ter dados
      console.log('Placa não encontrada na base de dados.');
    } finally {
      setConsultandoPlaca(false);
    }
  };

  const handleEditParceiro = (parceiro: any) => {
    setParceiroForm({
      nome: parceiro.nome || '',
      tipo: parceiro.tipo || 'PF',
      documento: parceiro.documento || '',
      cnh: parceiro.cnh || '',
      telefone: parceiro.telefone || '',
      endereco: parceiro.endereco || '',
      cidade: parceiro.cidade || '',
      estado: parceiro.estado || '',
      cep: parceiro.cep || '',
      observacoes: parceiro.observacoes || '',
      isMotorista: parceiro.isMotorista || false
    });
    setEditingParceiro(parceiro);
    setShowParceiroForm(true);
  };
  
  const handleEditMotorista = (motorista: any) => {
    setMotoristaForm({
      nome: motorista.nome || '',
      cpf: motorista.cpf || '',
      cnh: motorista.cnh || '',
      nacionalidade: motorista.nacionalidade || 'Brasileiro', // Carrega nacionalidade
      telefone: motorista.telefone || '', // Carrega telefone
      parceiroId: motorista.parceiroId || '',
      veiculoVinculado: motorista.veiculoVinculado || ''
    });
    setEditingMotorista(motorista);
    setShowMotoristaForm(true);
  };
  
  const handleEditVeiculo = (veiculo: any) => {
    setVeiculoForm({
      tipo: veiculo.tipo || 'Truck',
      placa: veiculo.placa || '',
      placaCavalo: veiculo.placaCavalo || '',
      fabricante: veiculo.fabricante || '',
      modelo: veiculo.modelo || '',
      ano: veiculo.ano?.toString() || '',
      chassis: veiculo.chassis || '',
      carroceria: veiculo.carroceria || '',
      quantidadeCarretas: veiculo.quantidadeCarretas || 1,
      possuiDolly: veiculo.possuiDolly || false,
      placaCarreta: veiculo.placaCarreta || '',
      placaCarreta1: veiculo.placaCarreta1 || '',
      placaCarreta2: veiculo.placaCarreta2 || '',
      placaDolly: veiculo.placaDolly || '',
      parceiroId: veiculo.parceiroId || '',
      motoristaVinculado: veiculo.motoristaVinculado || ''
    });
    setEditingVeiculo(veiculo);
    setShowVeiculoForm(true);
  };

  const handleDeleteParceiro = (id: string) => {
    const parceiro = parceiros.find(p => p.id === id);
    if (parceiro) {
      setDeleteTarget({
        type: 'parceiro',
        id: id,
        name: parceiro.nome || 'Parceiro sem nome'
      });
      setShowDeleteConfirm(true);
    }
  };
  
  const handleDeleteVeiculo = (veiculo: any) => {
    setDeleteTarget({
      type: 'veiculo',
      id: veiculo.id,
      name: veiculo.placa || veiculo.placaCavalo || veiculo.placaCarreta || 'Veículo'
    });
    setShowDeleteConfirm(true);
  };

  const handleBlockParceiro = (parceiro: any) => {
    const updatedParceiro = {
      ...parceiro,
      status: 'Bloqueado',
      isActive: false
    };
    
    updateParceiro(parceiro.id, updatedParceiro);
    
    if (selectedParceiro?.id === parceiro.id) {
      setSelectedParceiro(null);
    }
  };

  const handleUnblockParceiro = (parceiro: any) => {
    const updatedParceiro = {
      ...parceiro,
      status: 'Ativo',
      isActive: true
    };
    updateParceiro(parceiro.id, updatedParceiro);
    if (selectedParceiro?.id === parceiro.id) {
      setSelectedParceiro(updatedParceiro);
    }
  };

  // Handlers para motoristas
  const handleMotoristaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const motoristaData = {
      ...motoristaForm,
      parceiroId: selectedParceiro.id
    };

    if (editingMotorista) {
      updateMotorista(editingMotorista.id, motoristaData);
    } else {
      createMotorista(motoristaData);
    }

    resetMotoristaForm();
  };

  // Handlers para veículos
  const handleVeiculoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let veiculoData: any = {
      ...veiculoForm,
      parceiroId: selectedParceiro.id,
      ano: veiculoForm.ano ? parseInt(veiculoForm.ano) : undefined
    };

    // Sanitizar campos conforme o tipo
    if (veiculoForm.tipo === 'Cavalo') {
      veiculoData = {
        ...veiculoData,
        placa: veiculoForm.placaCavalo, // Usa placaCavalo como placa principal
        placaCavalo: veiculoForm.placaCavalo,
        quantidadeCarretas: undefined,
        possuiDolly: false,
        placaCarreta: '',
        placaCarreta1: '',
        placaCarreta2: '',
        placaDolly: ''
      };
    } else if (veiculoForm.tipo === 'Carreta') {
      veiculoData = {
        ...veiculoData,
        placa: veiculoForm.placaCarreta, // Usa placaCarreta como placa principal
        placaCavalo: '',
        quantidadeCarretas: undefined,
        possuiDolly: false,
        placaCarreta: veiculoForm.placaCarreta,
        placaCarreta1: '',
        placaCarreta2: '',
        placaDolly: ''
      };
    } else if (veiculoForm.tipo === 'Truck') {
      veiculoData = {
        ...veiculoData,
        placa: veiculoForm.placa, // Usa placa como placa principal
        placaCavalo: '',
        quantidadeCarretas: undefined,
        possuiDolly: false,
        placaCarreta: '',
        placaCarreta1: '',
        placaCarreta2: '',
        placaDolly: ''
      };
    }

    if (editingVeiculo) {
      updateVeiculo(editingVeiculo.id, veiculoData);
    } else {
      createVeiculo(veiculoData);
    }

    resetVeiculoForm();
  };
  
  // Handlers para Permisso (NOVO)
  const handleOpenPermissoModal = (veiculo: any) => {
    setPermissoTargetVeiculo(veiculo);
    const existing = getPermissoByVeiculoId(veiculo.id);
    
    if (existing) {
        setExistingPermisso({
            razaoSocial: existing.razaoSocial,
            cnpj: formatDocument(existing.cnpj, 'PJ'), // Formata CNPJ para exibição
            enderecoCompleto: existing.enderecoCompleto || '',
            simulado: existing.simulado
        });
    } else {
        setExistingPermisso(null);
    }
    setShowPermissoModal(true);
  };

  const handleSavePermisso = (veiculoId: string, data: PermissoData) => {
    const permissoData: Omit<PermissoInternacional, 'id' | 'createdAt' | 'updatedAt' | 'dataConsulta'> = {
        veiculoId: veiculoId,
        razaoSocial: data.razaoSocial,
        cnpj: parseDocument(data.cnpj), // Salva limpo
        enderecoCompleto: data.enderecoCompleto,
        simulado: data.simulado
    };
    
    const existing = getPermissoByVeiculoId(veiculoId);
    
    if (existing) {
        updatePermisso(existing.id, permissoData);
    } else {
        createPermisso(permissoData, veiculoId);
    }
    
    // Atualiza o estado do veículo para refletir o novo permisso
    const updatedPermisso = getPermissoByVeiculoId(veiculoId);
    if (updatedPermisso) {
        updateVeiculo(veiculoId, { permisso: updatedPermisso });
    }
  };

  // Handler para confirmar exclusão
  const confirmDelete = () => {
    if (deleteTarget) {
      // Salvar dados para desfazer
      let deletedData: any = null;
      let relatedData: any = {};

      if (deleteTarget.type === 'veiculo') {
        deletedData = veiculos.find(v => v.id === deleteTarget.id);
        deleteVeiculo(deleteTarget.id);
      } else if (deleteTarget.type === 'motorista') {
        deletedData = motoristas.find(m => m.id === deleteTarget.id);
        deleteMotorista(deleteTarget.id);
      } else if (deleteTarget.type === 'parceiro') {
        deletedData = parceiros.find(p => p.id === deleteTarget.id);
        // Salvar motoristas e veículos relacionados
        relatedData.motoristas = motoristas.filter(m => m.parceiroId === deleteTarget.id);
        relatedData.veiculos = veiculos.filter(v => v.parceiroId === deleteTarget.id);
        
        deleteParceiro(deleteTarget.id);
        if (selectedParceiro?.id === deleteTarget.id) {
          setSelectedParceiro(null);
        }
      }

      // Adicionar ação de desfazer
      if (deletedData) {
        undoService.addUndoAction({
          type: deleteTarget.type === 'veiculo' ? 'delete_cargo' : 
                deleteTarget.type === 'motorista' ? 'delete_financial' : 'delete_partner',
          description: `${deleteTarget.type === 'veiculo' ? 'Veículo' : 
                       deleteTarget.type === 'motorista' ? 'Motorista' : 'Parceiro'} "${deleteTarget.name}" excluído`,
          data: { deletedData, relatedData, type: deleteTarget.type },
          undoFunction: async () => {
            if (deleteTarget.type === 'veiculo') {
              createVeiculo(deletedData);
            } else if (deleteTarget.type === 'motorista') {
              createMotorista(deletedData);
            } else if (deleteTarget.type === 'parceiro') {
              createParceiro(deletedData);
              // Recriar motoristas e veículos relacionados
              relatedData.motoristas?.forEach((motorista: any) => {
                createMotorista(motorista);
              });
              relatedData.veiculos?.forEach((veiculo: any) => {
                createVeiculo(veiculo);
              });
            }
          }
        });
      }

      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  // --- RENDERIZAÇÃO PRINCIPAL ---

  let mainContent;

  if (!selectedParceiro) {
    // --- LIST VIEW ---
    mainContent = (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Parceiros</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Gestão de parceiros, motoristas e veículos</p>
          </div>
          <button
            onClick={() => setShowParceiroForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Parceiro</span>
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalParceiros}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ativos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.parceirosAtivos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Pessoa Física</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.parceirosPF}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Pessoa Jurídica</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.parceirosPJ}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Motoristas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMotoristas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Veículos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalVeiculos}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center mb-4">
            <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, documento ou email..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo
              </label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos os tipos</option>
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Bloqueados</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterTipo('');
                  setFilterStatus('');
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Parceiros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Documento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contato</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredParceiros.map((parceiro) => (
                  <tr key={parceiro.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{parceiro.nome}</div>
                        {parceiro.isMotorista && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mt-1">
                            Motorista
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        parceiro.tipo === 'PF' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      }`}>
                        {parceiro.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDocument(parceiro.documento || '', parceiro.tipo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{parceiro.email}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{parceiro.telefone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        parceiro.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {parceiro.isActive ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setSelectedParceiro(parceiro)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Abrir Painel"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditParceiro(parceiro)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {!parceiro.isActive ? (
                          <button
                            onClick={() => handleUnblockParceiro(parceiro)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                            title="Desbloquear"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockParceiro(parceiro)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Bloquear"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteParceiro(parceiro.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Excluir"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredParceiros.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Nenhum parceiro encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } else {
    // --- DETAIL VIEW ---
    const parceiroMotoristas = motoristas.filter(m => m.parceiroId === selectedParceiro.id);
    const parceiroVeiculos = veiculos.filter(v => v.parceiroId === selectedParceiro.id);

    mainContent = (
      <div className="space-y-6">
        {/* Header e Botão Voltar */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedParceiro.nome}</h1>
          <button onClick={() => setSelectedParceiro(null)} className="btn-secondary">
            Voltar à Lista
          </button>
        </div>

        {/* Informações Principais do Parceiro (Card Estilizado) */}
        <div className="card p-6 bg-white dark:bg-slate-900/50 border-l-4 border-blue-600 dark:border-blue-400 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              Detalhes do Parceiro
            </h2>
            <button
              onClick={() => handleEditParceiro(selectedParceiro)}
              className="btn-ghost p-2 text-gray-500 hover:text-blue-600"
              title="Editar Parceiro"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo / Documento</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedParceiro.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </p>
              <p className="text-gray-700 dark:text-gray-300 font-mono">{formatDocument(selectedParceiro.documento || '', selectedParceiro.tipo)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Contato</p>
              <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Mail className="h-4 w-4 text-blue-500" /> {selectedParceiro.email || 'N/A'}
              </p>
              <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Phone className="h-4 w-4 text-blue-500" /> {selectedParceiro.telefone || 'N/A'}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Localização</p>
              <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <MapPin className="h-4 w-4 text-blue-500" /> {selectedParceiro.cidade || 'N/A'} - {selectedParceiro.estado || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {selectedParceiro.endereco || 'Endereço não cadastrado'}
              </p>
            </div>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('motoristas')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'motoristas'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            } flex items-center gap-2`}
          >
            <User className="h-5 w-5" />
            Motoristas ({parceiroMotoristas.length})
          </button>
          <button
            onClick={() => setActiveTab('veiculos')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'veiculos'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            } flex items-center gap-2`}
          >
            <Truck className="h-5 w-5" />
            Veículos ({parceiroVeiculos.length})
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="pt-4">
          {activeTab === 'motoristas' && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  resetMotoristaForm();
                  setShowMotoristaForm(true);
                }}
                className="btn-primary"
              >
                <Plus className="h-5 w-5" />
                Novo Motorista
              </button>
              
              {parceiroMotoristas.length === 0 ? (
                <div className="p-6 card text-center text-gray-500 dark:text-gray-400">
                  Nenhum motorista vinculado a este parceiro.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parceiroMotoristas.map(m => (
                    <div key={m.id} className="card p-4 flex justify-between items-start hover:shadow-md transition-shadow">
                      <div className="flex-1 space-y-1">
                        <p className="font-bold text-gray-900 dark:text-white">{m.nome}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {m.nacionalidade === 'Brasileiro' ? 'CPF' : 'Documento'}: {formatDocument(m.cpf, 'PF')} | CNH: {m.cnh || 'N/A'}
                        </p>
                        {m.telefone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {m.telefone}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Nacionalidade: {m.nacionalidade}
                        </p>
                        {m.validadeCnh && (
                          <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Validade CNH: {format(new Date(m.validadeCnh), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleEditMotorista(m)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Editar Motorista"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'motorista', id: m.id, name: m.nome })}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Excluir Motorista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'veiculos' && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  resetVeiculoForm();
                  setShowVeiculoForm(true);
                }}
                className="btn-primary"
              >
                <Plus className="h-5 w-5" />
                Novo Veículo
              </button>
              
              {parceiroVeiculos.length === 0 ? (
                <div className="p-6 card text-center text-gray-500 dark:text-gray-400">
                  Nenhum veículo vinculado a este parceiro.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parceiroVeiculos.map(v => (
                    <div key={v.id} className="card p-4 flex justify-between items-start hover:shadow-md transition-shadow">
                      <div className="flex-1 space-y-1">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {v.tipo} - {v.placa || v.placaCavalo || v.placaCarreta}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {v.fabricante} / {v.modelo} ({v.ano})
                        </p>
                        {v.permisso && (
                            <p className={`text-xs font-medium flex items-center gap-1 ${v.permisso.simulado ? 'text-yellow-600' : 'text-green-600'}`}>
                                <FileText className="h-3 w-3" /> Permisso: {v.permisso.razaoSocial}
                            </p>
                        )}
                        {v.chassis && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Chassi: {v.chassis}
                          </p>
                        )}
                        {v.carroceria && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Carroceria: {v.carroceria}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2 flex-shrink-0">
                        {/* Botão Permisso - Apenas para Truck e Cavalo */}
                        {(v.tipo === 'Truck' || v.tipo === 'Cavalo') && (
                            <button
                                onClick={() => handleOpenPermissoModal(v)}
                                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                title="Gerenciar Permisso Internacional"
                            >
                                <FileText className="w-4 h-4" />
                            </button>
                        )}
                        <button
                          onClick={() => handleEditVeiculo(v)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Editar Veículo"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVeiculo(v)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Excluir Veículo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO FINAL (Conteúdo Principal + Modais) ---
  return (
    <>
      {mainContent}
      
      {/* Modal de Parceiro */}
      {showParceiroForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div ref={parceiroModalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingParceiro ? 'Editar Parceiro' : 'Novo Parceiro'}
                  </h3>
                  <button
                    onClick={resetParceiroForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleParceiroSubmit} className="space-y-4">
                  {/* Tipo - Primeiro campo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo *
                    </label>
                    <select
                      value={parceiroForm.tipo}
                      onChange={(e) => setParceiroForm({ ...parceiroForm, tipo: e.target.value as 'PF' | 'PJ' })}
                      className="input-field"
                      required
                    >
                      <option value="PF">Pessoa Física</option>
                      <option value="PJ">Pessoa Jurídica</option>
                    </select>
                  </div>

                  {/* Switch "É Motorista" apenas para Pessoa Física - logo após o campo Tipo */}
                  {parceiroForm.tipo === 'PF' && (
                    <StandardCheckbox
                      label="É Motorista"
                      checked={parceiroForm.isMotorista}
                      onChange={(checked) => setParceiroForm({ ...parceiroForm, isMotorista: checked })}
                      description="Marque se esta pessoa física atua como motorista"
                    />
                  )}

                  {/* Campos específicos por tipo */}
                  {parceiroForm.tipo === 'PF' ? (
                    <>
                      {/* Pessoa Física: Nome, CPF, CNH (se motorista), Contato, Endereço, Cidade, Estado, CEP, Observações */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nome *
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.nome}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, nome: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {parceiroForm.tipo === 'PF' ? 'CPF *' : 'CNPJ *'}
                          {consultandoCNPJ && (
                            <span className="ml-2 text-blue-500 text-xs">
                              Consultando...
                            </span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.documento}
                          onChange={(e) => {
                            const formatted = formatDocument(e.target.value, parceiroForm.tipo as 'PF' | 'PJ');
                            setParceiroForm({ ...parceiroForm, documento: formatted });
                            
                            // Reset flag de consulta quando o documento muda
                            if (cnpjConsultado) {
                              setCnpjConsultado(false);
                            }
                            
                            // Consulta CNPJ automaticamente se for PJ e tiver 14 dígitos
                            if (parceiroForm.tipo === 'PJ' && formatted.replace(/\D/g, '').length === 14) {
                              handleCNPJConsultation(formatted);
                            }
                          }}
                          className={`input-field ${consultandoCNPJ ? 'opacity-50' : ''}`}
                          placeholder={parceiroForm.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                          disabled={consultandoCNPJ}
                          required
                        />
                        {cnpjConsultado && (
                          <p className="text-green-600 text-xs mt-1">
                            ✓ Dados consultados automaticamente
                          </p>
                        )}
                      </div>

                      {/* CNH - apenas se for motorista */}
                      {parceiroForm.isMotorista && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            CNH *
                          </label>
                          <input
                            type="text"
                            value={parceiroForm.cnh}
                            onChange={(e) => setParceiroForm({ ...parceiroForm, cnh: e.target.value })}
                            className="input-field"
                            placeholder="00000000000"
                            required={parceiroForm.isMotorista}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Contato
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.telefone}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, telefone: e.target.value })}
                          className="input-field"
                          placeholder="(00) 00000-0000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Endereço
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.endereco}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, endereco: e.target.value })}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.cidade}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, cidade: e.target.value })}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Estado
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.estado}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, estado: e.target.value })}
                          className="input-field"
                          placeholder="SP"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          CEP
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.cep}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, cep: e.target.value })}
                          className="input-field"
                          placeholder="00000-000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Observações
                        </label>
                        <textarea
                          value={parceiroForm.observacoes}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, observacoes: e.target.value })}
                          className="input-field"
                          rows={3}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Pessoa Jurídica: CNPJ, Razão Social, Contato, Endereço, Cidade, Estado, CEP, Observações */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          CNPJ *
                          {consultandoCNPJ && (
                            <span className="ml-2 text-blue-500 text-xs">
                              Consultando...
                            </span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.documento}
                          onChange={(e) => {
                            const formatted = formatDocument(e.target.value, parceiroForm.tipo as 'PF' | 'PJ');
                            const cnpjLimpo = formatted.replace(/\D/g, '');
                            
                            setParceiroForm({ ...parceiroForm, documento: formatted });
                            
                            // Reset flag de consulta apenas se o CNPJ mudou significativamente
                            if (cnpjConsultado) {
                              setCnpjConsultado(false);
                            }
                            
                            // Consulta CNPJ automaticamente se tiver 14 dígitos
                            if (cnpjLimpo.length === 14) {
                              handleCNPJConsultation(formatted);
                            }
                          }}
                          className={`input-field ${consultandoCNPJ ? 'opacity-50' : ''}`}
                          placeholder="00.000.000/0000-00"
                          disabled={consultandoCNPJ}
                          required
                        />
                        {cnpjConsultado && (
                          <p className="text-green-600 text-xs mt-1">
                            ✓ Dados consultados automaticamente
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Razão Social *
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.nome}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, nome: e.target.value })}
                          className="input-field"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Contato
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.telefone}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, telefone: e.target.value })}
                          className="input-field"
                          placeholder="(00) 00000-0000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Endereço
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.endereco}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, endereco: e.target.value })}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.cidade}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, cidade: e.target.value })}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Estado
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.estado}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, estado: e.target.value })}
                          className="input-field"
                          placeholder="SP"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          CEP
                        </label>
                        <input
                          type="text"
                          value={parceiroForm.cep}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, cep: e.target.value })}
                          className="input-field"
                          placeholder="00000-000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Observações
                        </label>
                        <textarea
                          value={parceiroForm.observacoes}
                          onChange={(e) => setParceiroForm({ ...parceiroForm, observacoes: e.target.value })}
                          className="input-field"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={resetParceiroForm}
                      className="btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-1"
                    >
                      {editingParceiro ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Motorista */}
        {showMotoristaForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div ref={motoristaModalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingMotorista ? 'Editar Motorista' : 'Novo Motorista'}
                  </h3>
                  <button
                    onClick={resetMotoristaForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleMotoristaSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={motoristaForm.nome}
                      onChange={(e) => setMotoristaForm({ ...motoristaForm, nome: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nacionalidade *
                    </label>
                    <select
                      value={motoristaForm.nacionalidade}
                      onChange={(e) => {
                        // Limpa o campo de documento ao mudar a nacionalidade
                        setMotoristaForm({ 
                          ...motoristaForm, 
                          nacionalidade: e.target.value as 'Brasileiro' | 'Estrangeiro',
                          cpf: '', // CPF é o campo que armazena o documento
                          cnh: '' // CNH é opcional para estrangeiros, melhor limpar
                        });
                      }}
                      className="input-field"
                      required
                    >
                      <option value="Brasileiro">Brasileiro</option>
                      <option value="Estrangeiro">Estrangeiro</option>
                    </select>
                  </div>

                  {/* Campo de Documento (CPF ou Documento Estrangeiro) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {motoristaForm.nacionalidade === 'Brasileiro' ? 'CPF *' : 'Documento *'}
                    </label>
                    <input
                      type="text"
                      value={motoristaForm.cpf}
                      onChange={(e) => {
                        let formatted = e.target.value;
                        if (motoristaForm.nacionalidade === 'Brasileiro') {
                          formatted = formatDocument(e.target.value, 'PF');
                        } else {
                          // Para estrangeiro, usa formatação de CUIT como exemplo, mas permite qualquer texto
                          formatted = formatCUIT(e.target.value);
                        }
                        setMotoristaForm({ ...motoristaForm, cpf: formatted });
                      }}
                      className="input-field"
                      placeholder={motoristaForm.nacionalidade === 'Brasileiro' ? '000.000.000-00' : 'Ex: Passaporte, CUIT, etc.'}
                      required
                    />
                  </div>

                  {/* CNH (Obrigatório para Brasileiro) */}
                  {motoristaForm.nacionalidade === 'Brasileiro' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CNH *
                      </label>
                      <input
                        type="text"
                        value={motoristaForm.cnh}
                        onChange={(e) => setMotoristaForm({ ...motoristaForm, cnh: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                  )}
                  
                  {/* Telefone/Contato */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Telefone/Contato (Opcional)
                    </label>
                    <input
                      type="text"
                      value={motoristaForm.telefone}
                      onChange={(e) => {
                        const formatted = formatContact(e.target.value);
                        setMotoristaForm({ ...motoristaForm, telefone: formatted });
                      }}
                      className="input-field"
                      placeholder="Ex: (11) 99999-9999 ou +55 11 9 9999-9999"
                    />
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={resetMotoristaForm}
                      className="btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-1"
                    >
                      {editingMotorista ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Veículo */}
        {showVeiculoForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div ref={veiculoModalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingVeiculo ? 'Editar Veículo' : 'Novo Veículo'}
                  </h3>
                  <button
                    onClick={resetVeiculoForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleVeiculoSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo de Veículo
                      </label>
                      <select
                        value={veiculoForm.tipo}
                        onChange={(e) => setVeiculoForm({ ...veiculoForm, tipo: e.target.value })}
                        className="input-field"
                      >
                        <option value="Truck">Truck</option>
                        <option value="Cavalo">Cavalo</option>
                        <option value="Carreta">Carreta</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {veiculoForm.tipo === 'Truck' 
                          ? 'Placa *' 
                          : veiculoForm.tipo === 'Carreta' 
                            ? 'Placa da Carreta *' 
                            : 'Placa do Cavalo *'}
                        {consultandoPlaca && (
                          <span className="ml-2 text-blue-500 text-xs">
                            Consultando...
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={veiculoForm.tipo === 'Truck' 
                          ? veiculoForm.placa 
                          : veiculoForm.tipo === 'Carreta' 
                            ? veiculoForm.placaCarreta 
                            : veiculoForm.placaCavalo}
                        onChange={(e) => {
                          const formatted = formatPlaca(e.target.value);
                          
                          if (veiculoForm.tipo === 'Truck') {
                            setVeiculoForm({ ...veiculoForm, placa: formatted });
                          } else if (veiculoForm.tipo === 'Carreta') {
                            setVeiculoForm({ ...veiculoForm, placaCarreta: formatted });
                          } else {
                            setVeiculoForm({ ...veiculoForm, placaCavalo: formatted });
                          }
                          
                          // Remove formatação para validação
                          const placaLimpa = formatted.replace(/[^A-Z0-9]/g, '').toUpperCase();

                          // Reset flag de consulta quando a placa muda
                          if (placaConsultada && placaConsultada !== placaLimpa) {
                            setPlacaConsultada('');
                          }
                          
                          // Consulta placa automaticamente se for válida
                          if (VehicleService.validarPlaca(placaLimpa)) {
                            handlePlacaConsultation(placaLimpa);
                          }
                        }}
                        className={`input-field ${consultandoPlaca ? 'opacity-50' : ''}`}
                        placeholder="ABC1234 ou ABC1D23"
                        disabled={consultandoPlaca}
                        required
                      />
                      {placaConsultada && (
                        <p className="text-green-600 text-xs mt-1">
                          ✓ Dados da placa consultados automaticamente
                        </p>
                          )}
                        </div>
                      </div>

                      {/* Removido: quantidade de carretas para Conjunto. Cavalo não possui campos de carreta. */}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Fabricante
                          </label>
                          <input
                            type="text"
                            value={veiculoForm.fabricante}
                            onChange={(e) => setVeiculoForm({ ...veiculoForm, fabricante: e.target.value })}
                            className="input-field"
                          />
                        </div>

                        {veiculoForm.tipo !== 'Carreta' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Modelo
                            </label>
                            <input
                              type="text"
                              value={veiculoForm.modelo}
                              onChange={(e) => setVeiculoForm({ ...veiculoForm, modelo: e.target.value })}
                              className="input-field"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Ano
                          </label>
                          <input
                            type="text"
                            value={veiculoForm.ano}
                            onChange={(e) => setVeiculoForm({ ...veiculoForm, ano: e.target.value })}
                            className="input-field"
                            placeholder="2023"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Chassi
                          </label>
                          <input
                            type="text"
                            value={veiculoForm.chassis}
                            onChange={(e) => setVeiculoForm({ ...veiculoForm, chassis: e.target.value })}
                            className="input-field"
                          />
                        </div>
                      </div>

                      {veiculoForm.tipo === 'Truck' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Carroceria
                          </label>
                          <input
                            type="text"
                            value={veiculoForm.carroceria}
                            onChange={(e) => setVeiculoForm({ ...veiculoForm, carroceria: e.target.value })}
                            className="input-field"
                          />
                        </div>
                      )}
                      
                      {/* Botão Permisso - Apenas para edição e tipos Truck/Cavalo */}
                      {editingVeiculo && (editingVeiculo.tipo === 'Truck' || editingVeiculo.tipo === 'Cavalo') && (
                        <div className="md:col-span-2">
                            <button
                                type="button"
                                onClick={() => handleOpenPermissoModal(editingVeiculo)}
                                className="btn-secondary w-full justify-center text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                            >
                                <FileText className="h-5 w-5" />
                                Gerenciar Permisso Internacional
                            </button>
                        </div>
                      )}

                      <div className="flex space-x-4 pt-4">
                        <button
                          type="button"
                          onClick={resetVeiculoForm}
                          className="btn-secondary flex-1"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="btn-primary flex-1"
                        >
                          {editingVeiculo ? 'Atualizar' : 'Criar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

          {/* Modal de Permisso Internacional (NOVO) */}
          {showPermissoModal && permissoTargetVeiculo && (
            <PermissoModal
                isOpen={showPermissoModal}
                veiculo={permissoTargetVeiculo}
                onClose={() => setShowPermissoModal(false)}
                onSave={handleSavePermisso}
                existingPermisso={existingPermisso}
            />
          )}

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
                  Tem certeza que deseja excluir {
                    deleteTarget.type === 'veiculo' ? 'o veículo' : 
                    deleteTarget.type === 'motorista' ? 'o motorista' : 
                    'o parceiro'
                  }{' '}
                  <span className="font-semibold">{deleteTarget?.name}</span>?
                  {deleteTarget.type === 'veiculo' && (
                    <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                      Esta ação também removerá qualquer vinculação com motoristas.
                    </span>
                  )}
                  {deleteTarget.type === 'motorista' && (
                    <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                      Esta ação também removerá qualquer vinculação com veículos.
                    </span >
                  )}
                  {deleteTarget.type === 'parceiro' && (
                    <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                      Esta ação removerá o parceiro e todos os seus motoristas e veículos associados.
                    </span>
                  )}
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteTarget(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )}
    </>
  );
}