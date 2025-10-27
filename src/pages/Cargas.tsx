import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useModal } from '../hooks/useModal';
import { format, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, parseCurrency } from '../utils/formatters';
import StandardCheckbox from '../components/StandardCheckbox';
import { ImportService } from '../services/importService';
import { undoService } from '../services/undoService';
import {
  Plus,
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Edit,
  Trash2,
  RefreshCw,
  Link,
  Upload,
  CreditCard
} from 'lucide-react';

const Cargas: React.FC = () => {
  const location = useLocation();
  const { 
    cargas, 
    createCarga, 
    updateCarga, 
    deleteCarga,
    parceiros,
    motoristas,
    veiculos,
    createMovimentacaoFinanceira
  } = useDatabase();

  // Lista de UFs ordenada conforme especificação
  const ufsOrdenadas = [
    { value: 'internacional', label: 'Internacional' },
    { value: 'RS', label: 'Rio Grande do Sul (RS)' },
    { value: 'SP', label: 'São Paulo (SP)' },
    { value: 'AC', label: 'Acre (AC)' },
    { value: 'AL', label: 'Alagoas (AL)' },
    { value: 'AP', label: 'Amapá (AP)' },
    { value: 'AM', label: 'Amazonas (AM)' },
    { value: 'BA', label: 'Bahia (BA)' },
    { value: 'CE', label: 'Ceará (CE)' },
    { value: 'DF', label: 'Distrito Federal (DF)' },
    { value: 'ES', label: 'Espírito Santo (ES)' },
    { value: 'GO', label: 'Goiás (GO)' },
    { value: 'MA', label: 'Maranhão (MA)' },
    { value: 'MT', label: 'Mato Grosso (MT)' },
    { value: 'MS', label: 'Mato Grosso do Sul (MS)' },
    { value: 'MG', label: 'Minas Gerais (MG)' },
    { value: 'PA', label: 'Pará (PA)' },
    { value: 'PB', label: 'Paraíba (PB)' },
    { value: 'PR', label: 'Paraná (PR)' },
    { value: 'PE', label: 'Pernambuco (PE)' },
    { value: 'PI', label: 'Piauí (PI)' },
    { value: 'RJ', label: 'Rio de Janeiro (RJ)' },
    { value: 'RN', label: 'Rio Grande do Norte (RN)' },
    { value: 'RO', label: 'Rondônia (RO)' },
    { value: 'RR', label: 'Roraima (RR)' },
    { value: 'SC', label: 'Santa Catarina (SC)' },
    { value: 'SE', label: 'Sergipe (SE)' },
    { value: 'TO', label: 'Tocantins (TO)' }
  ];

  const [showForm, setShowForm] = useState(false);
  const [editingCarga, setEditingCarga] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number} | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<any>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingCarga, setLinkingCarga] = useState<any>(null);
  const [selectedParceiro, setSelectedParceiro] = useState('');
  const [selectedMotorista, setSelectedMotorista] = useState('');
  const [selectedVeiculo, setSelectedVeiculo] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [showIntegrateModal, setShowIntegrateModal] = useState(false);
  const [integratingCarga, setIntegratingCarga] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{id: string, descricao: string} | null>(null);
  const [integrateData, setIntegrateData] = useState({
    // A. Adiantamento
    adiantamentoEnabled: false,
    adiantamentoPercentual: '70',
    dataVencimentoAdiantamento: '',
    dataVencimentoSaldo: '',
    
    // B. Despesas Adicionais
    despesasEnabled: false,
    valorARS: '',
    taxaConversao: '',
    valorBRL: '',
    
    // C. Diárias
    diariasEnabled: false,
    valorDiarias: '',
    
    // D. Opção de Soma
    somaOpcao: 'adiantamento' as 'adiantamento' | 'saldo'
  });

  // useEffect para aplicar filtro de status vindo da navegação
  useEffect(() => {
    if (location.state?.filterStatus) {
      setFilterStatus(location.state.filterStatus);
    }
  }, [location.state]);

  const [formData, setFormData] = useState<{
    crt: string;
    origem: string;
    destino: string;
    ufOrigemSelecionada: string;
    cidadeOrigem: string;
    ufDestinoSelecionada: string;
    cidadeDestino: string;
    dataColeta: string;
    dataEntrega: string;
    valor: string;
    peso: string;
    observacoes: string;
    status: 'entregue' | 'em_transito' | 'a_coletar' | 'armazenada' | 'cancelada';
  }>({
    crt: '',
    origem: '',
    destino: '',
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
  });

  // Hook para gerenciar fechamento do modal
  const { modalRef } = useModal({
    isOpen: showForm,
    onClose: () => {
      setShowForm(false);
      setEditingCarga(null);
      setFormData({
        crt: '',
        origem: '',
        destino: '',
        dataColeta: format(new Date(), 'yyyy-MM-dd'),
        dataEntrega: format(new Date(), 'yyyy-MM-dd'),
        valor: '',
        peso: '',
        observacoes: '',
        status: 'a_coletar'
      });
    }
  });

  // Status com cores e ícones atualizados
  const statusConfig = {
    a_coletar: { 
      label: 'À coletar', 
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
      icon: Clock
    },
    em_transito: { 
      label: 'Em trânsito', 
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      icon: Truck
    },
    armazenada: { 
      label: 'Armazenada', 
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
      icon: Package
    },
    entregue: { 
      label: 'Entregue', 
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      icon: CheckCircle
    },
    cancelada: { 
      label: 'Cancelada', 
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      bgColor: 'bg-red-100',
      textColor: 'text-red-600',
      icon: AlertTriangle
    }
  };

  // Filtrar cargas
  const filteredCargas = useMemo(() => {
    return cargas.filter(carga => {
      const matchSearch = carga.crt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         carga.origem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         carga.destino?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = !filterStatus || carga.status === filterStatus;
      
      // Filtro por intervalo de datas (usando dataColeta como referência)
      let matchesDateRange = true;
      if (filterStartDate && filterEndDate) {
        const cargaDate = new Date(carga.dataColeta || new Date());
        const startDate = new Date(filterStartDate);
        const endDate = new Date(filterEndDate);
        matchesDateRange = isWithinInterval(cargaDate, { start: startDate, end: endDate });
      } else if (filterStartDate) {
        const cargaDate = new Date(carga.dataColeta || new Date());
        const startDate = new Date(filterStartDate);
        matchesDateRange = cargaDate >= startDate;
      } else if (filterEndDate) {
        const cargaDate = new Date(carga.dataColeta || new Date());
        const endDate = new Date(filterEndDate);
        matchesDateRange = cargaDate <= endDate;
      }
      
      return matchSearch && matchStatus && matchesDateRange;
    }).sort((a, b) => new Date(b.dataColeta || new Date()).getTime() - new Date(a.dataColeta || new Date()).getTime());
  }, [cargas, searchTerm, filterStatus, filterStartDate, filterEndDate]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = cargas.length;
    const aColetar = cargas.filter(c => c.status === 'a_coletar').length;
    const emTransito = cargas.filter(c => c.status === 'em_transito').length;
    const armazenadas = cargas.filter(c => c.status === 'armazenada').length;
    const entregues = cargas.filter(c => c.status === 'entregue').length;
    const valorTotal = cargas.reduce((sum, c) => sum + (c.valor || 0), 0);
    
    return { total, aColetar, emTransito, armazenadas, entregues, valorTotal };
  }, [cargas]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar CRT (máximo 10 caracteres)
    if (formData.crt.length > 10) {
      alert('CRT deve ter no máximo 10 caracteres');
      return;
    }

    // Validar se UF de origem foi selecionada
    if (!formData.ufOrigemSelecionada) {
      alert('Selecione a UF de origem');
      return;
    }

    // Validar se UF de destino foi selecionada
    if (!formData.ufDestinoSelecionada) {
      alert('Selecione a UF de destino');
      return;
    }

    // Construir origem baseada na UF e cidade
    const origemCompleta = formData.ufOrigemSelecionada === 'internacional' 
      ? 'Internacional'
      : formData.cidadeOrigem 
        ? `${formData.cidadeOrigem} - ${formData.ufOrigemSelecionada}`
        : formData.ufOrigemSelecionada;

    // Construir destino baseado na UF e cidade
    const destinoCompleto = formData.ufDestinoSelecionada === 'internacional' 
      ? 'Internacional'
      : formData.cidadeDestino 
        ? `${formData.cidadeDestino} - ${formData.ufDestinoSelecionada}`
        : formData.ufDestinoSelecionada;
    
    const cargaData = {
      descricao: formData.crt || 'Carga sem descrição',
      origem: origemCompleta,
      destino: destinoCompleto,
      peso: parseFloat(formData.peso),
      valor: parseCurrency(formData.valor),
      dataColeta: new Date(formData.dataColeta),
      dataEntrega: new Date(formData.dataEntrega),
      status: formData.status,
      crt: formData.crt
    };

    if (editingCarga) {
      updateCarga(editingCarga.id, cargaData);
    } else {
      createCarga(cargaData);
    }

    resetForm();
  };

  const resetForm = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
      return;
    }
    
    performReset();
  };

  const handleFormChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Detectar se há mudanças comparando com os dados originais
    if (originalFormData) {
      const hasChanges = Object.keys(newFormData).some(key => 
        (newFormData as any)[key] !== (originalFormData as any)[key]
      );
      setHasUnsavedChanges(hasChanges);
    }
  };

  const performReset = () => {
    setFormData({
      crt: '',
      origem: '',
      destino: '',
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
    });
    setEditingCarga(null);
    setShowForm(false);
    setHasUnsavedChanges(false);
    setOriginalFormData(null);
    setShowCancelConfirm(false);
  };

  // Função auxiliar para extrair UF e cidade de uma string
  const extrairUfECidade = (localCompleto: string) => {
    if (localCompleto === 'Internacional') {
      return { uf: 'internacional', cidade: '' };
    }
    
    // Padrão: "Cidade - UF" ou apenas "UF"
    const partes = localCompleto.split(' - ');
    if (partes.length === 2) {
      return { uf: partes[1], cidade: partes[0] };
    } else {
      // Apenas UF
      return { uf: localCompleto, cidade: '' };
    }
  };

  const handleEdit = (carga: any) => {
    const origemInfo = extrairUfECidade(carga.origem);
    const destinoInfo = extrairUfECidade(carga.destino);
    
    const formDataToSet = {
      crt: carga.crt || carga.descricao || '',
      origem: carga.origem,
      destino: carga.destino,
      ufOrigemSelecionada: origemInfo.uf,
      cidadeOrigem: origemInfo.cidade,
      ufDestinoSelecionada: destinoInfo.uf,
      cidadeDestino: destinoInfo.cidade,
      dataColeta: format(new Date(carga.dataColeta), 'yyyy-MM-dd'),
      dataEntrega: format(new Date(carga.dataEntrega), 'yyyy-MM-dd'),
      valor: formatCurrency(carga.valor.toString()),
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
      // Salvar dados para desfazer
      const deletedCarga = cargas.find(c => c.id === deleteTarget.id);
      
      if (deletedCarga) {
        // Executar exclusão
        deleteCarga(deleteTarget.id);

        // Adicionar ação de desfazer
        undoService.addUndoAction({
          type: 'delete_cargo',
          description: `Carga "${deleteTarget.descricao}" excluída`,
          data: deletedCarga,
          undoFunction: async () => {
            createCarga(deletedCarga);
          }
        });
      }

      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const handleChangeStatus = (id: string, newStatus: 'entregue' | 'em_transito' | 'a_coletar' | 'armazenada' | 'cancelada') => {
    updateCarga(id, { status: newStatus });
    setShowStatusDropdown(null);
  };

  const handleLinkParceiro = (carga: any) => {
    setLinkingCarga(carga);
    setSelectedParceiro(carga.parceiroId || '');
    setSelectedMotorista(carga.motoristaId || '');
    setSelectedVeiculo(carga.veiculoId || '');
    setShowLinkModal(true);
  };

  const handleSaveLink = () => {
    if (linkingCarga) {
      updateCarga(linkingCarga.id, {
        parceiroId: selectedParceiro || undefined,
        motoristaId: selectedMotorista || undefined,
        veiculoId: selectedVeiculo || undefined
      });
      setShowLinkModal(false);
      setLinkingCarga(null);
      setSelectedParceiro('');
      setSelectedMotorista('');
      setSelectedVeiculo('');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setImportFile(file);
        setImportStatus('idle');
        setImportMessage('');
      } else {
        setImportMessage('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls)');
        setImportStatus('error');
      }
    }
  };

  const processImport = async () => {
    if (!importFile) return;

    setImportStatus('processing');
    setImportMessage('Processando arquivo...');

    try {
      const result = await ImportService.processFile(importFile);
      
      if (!result.success && result.data!.length === 0) {
        setImportStatus('error');
        setImportMessage(result.errors.join('\n'));
        return;
      }

      // Importar dados válidos
      const importedCargas: any[] = [];
      for (const cargaData of result.data!) {
        try {
          const newCarga = await createCarga(cargaData);
          importedCargas.push(newCarga || cargaData);
        } catch (error) {
          result.errorCount++;
          result.successCount--;
          result.errors.push(`Erro ao salvar carga: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // Adicionar ação de desfazer se cargas foram importadas com sucesso
      if (importedCargas.length > 0) {
        undoService.addUndoAction({
          type: 'import_csv',
          description: `Importação de ${importedCargas.length} cargas do arquivo "${importFile.name}"`,
          data: importedCargas,
          undoFunction: async () => {
            // Excluir todas as cargas importadas
            for (const carga of importedCargas) {
              try {
                await deleteCarga(carga.id);
              } catch (error) {
                console.error('Erro ao desfazer importação:', error);
              }
            }
          }
        });
      }
      
      // Determinar status final
      if (result.successCount > 0) {
        setImportStatus('success');
        let message = `Importação concluída! ${result.successCount} cargas importadas com sucesso`;
        
        if (result.errorCount > 0) {
          message += `, ${result.errorCount} erros encontrados`;
        }
        
        if (result.errors.length > 0) {
          message += `\n\nDetalhes dos erros:\n${result.errors.slice(0, 5).join('\n')}`;
          if (result.errors.length > 5) {
            message += `\n... e mais ${result.errors.length - 5} erros`;
          }
        }
        
        setImportMessage(message);
      } else {
        setImportStatus('error');
        setImportMessage(`Nenhuma carga foi importada.\n\nErros encontrados:\n${result.errors.slice(0, 10).join('\n')}`);
      }
      
      // Limpar após 5 segundos para dar tempo de ler os erros
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
        setImportStatus('idle');
        setImportMessage('');
      }, 5000);
      
    } catch (error) {
       setImportStatus('error');
       setImportMessage(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
     }
   };

   const handleIntegrateFinanceiro = (carga: any) => {
    setIntegratingCarga(carga);
    setIntegrateData({
      // A. Adiantamento
      adiantamentoEnabled: false,
      adiantamentoPercentual: '70',
      dataVencimentoAdiantamento: '',
      dataVencimentoSaldo: '',
      
      // B. Despesas Adicionais
      despesasEnabled: false,
      valorARS: '',
      taxaConversao: '',
      valorBRL: '',
      
      // C. Diárias
      diariasEnabled: false,
      valorDiarias: '',
      
      // D. Opção de Soma
      somaOpcao: 'adiantamento'
    });
    setShowIntegrateModal(true);
  };

   // Funções auxiliares para cálculos automáticos
  const calcularValorBRL = () => {
    if (!integrateData.despesasEnabled) return 0;
    const valorARS = parseFloat(integrateData.valorARS.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const taxa = parseFloat(integrateData.taxaConversao.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    return valorARS * taxa;
  };

  const calcularAdiantamento = () => {
    if (!integrateData.adiantamentoEnabled || !integratingCarga) return 0;
    const valorTotal = parseFloat(integratingCarga.valorTotal?.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const percentual = parseFloat(integrateData.adiantamentoPercentual) / 100;
    return valorTotal * percentual;
  };

  const calcularSaldo = () => {
    if (!integrateData.adiantamentoEnabled || !integratingCarga) return 0;
    const valorTotal = parseFloat(integratingCarga.valorTotal?.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    return valorTotal - calcularAdiantamento();
  };

  const calcularTotalFinal = () => {
    const valorBRL = calcularValorBRL();
    const diarias = integrateData.diariasEnabled ? 
      parseFloat(integrateData.valorDiarias.replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
    const valorTotal = integratingCarga ? 
      parseFloat(integratingCarga.valorTotal?.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
    
    if (integrateData.adiantamentoEnabled) {
      if (integrateData.somaOpcao === 'adiantamento') {
        return calcularAdiantamento() + valorBRL + diarias;
      } else {
        return calcularSaldo() + valorBRL + diarias;
      }
    } else {
      return valorTotal + valorBRL + diarias;
    }
  };

  const handleIntegrateSubmit = () => {
    if (!integratingCarga) return;

    const valorTotal = parseFloat(integratingCarga.valorTotal?.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    
    // Calcular adiantamento e saldo se habilitado
    let valorAdiantamento = 0;
    let valorSaldo = 0;
    
    if (integrateData.adiantamentoEnabled) {
      const percentual = parseFloat(integrateData.adiantamentoPercentual) / 100;
      valorAdiantamento = valorTotal * percentual;
      valorSaldo = valorTotal - valorAdiantamento;
    }
    
    // Calcular despesas adicionais se habilitado
    let despesasAdicionais = 0;
    if (integrateData.despesasEnabled) {
      const valorARS = parseFloat(integrateData.valorARS.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      const taxa = parseFloat(integrateData.taxaConversao.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      despesasAdicionais = valorARS * taxa;
    }
    
    // Calcular diárias se habilitado
    const diarias = integrateData.diariasEnabled ? 
      parseFloat(integrateData.valorDiarias.replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
    
    // Calcular valor final baseado na opção de soma
    let valorFinal = 0;
    let descricaoDetalhada = '';
    
    if (integrateData.adiantamentoEnabled) {
      if (integrateData.somaOpcao === 'adiantamento') {
        valorFinal = valorAdiantamento + despesasAdicionais + diarias;
        descricaoDetalhada = `Adiantamento (${integrateData.adiantamentoPercentual}%): R$ ${valorAdiantamento.toFixed(2)}`;
      } else {
        valorFinal = valorSaldo + despesasAdicionais + diarias;
        descricaoDetalhada = `Saldo (${100 - parseFloat(integrateData.adiantamentoPercentual)}%): R$ ${valorSaldo.toFixed(2)}`;
      }
    } else {
      valorFinal = despesasAdicionais + diarias;
      descricaoDetalhada = 'Valores adicionais';
    }
    
    if (despesasAdicionais > 0) {
      descricaoDetalhada += `, Despesas Adicionais: R$ ${despesasAdicionais.toFixed(2)}`;
    }
    if (diarias > 0) {
      descricaoDetalhada += `, Diárias: R$ ${diarias.toFixed(2)}`;
    }
    
    if (valorFinal > 0) {
      const movimentacao = {
        tipo: 'receita' as const,
        valor: valorFinal,
        descricao: `Integração financeira - Carga ${integratingCarga.crt || integratingCarga.id}`,
        categoria: 'Frete',
        data: new Date().toISOString(),
        status: 'pendente' as const,
        cargaId: integratingCarga.id,
        observacoes: descricaoDetalhada
      };
      
      createMovimentacaoFinanceira(movimentacao);
    }
    
    setShowIntegrateModal(false);
    setIntegratingCarga(null);
    setIntegrateData({
      // A. Adiantamento
      adiantamentoEnabled: false,
      adiantamentoPercentual: '70',
      dataVencimentoAdiantamento: '',
      dataVencimentoSaldo: '',
      
      // B. Despesas Adicionais
      despesasEnabled: false,
      valorARS: '',
      taxaConversao: '',
      valorBRL: '',
      
      // C. Diárias
      diariasEnabled: false,
      valorDiarias: '',
      
      // D. Opção de Soma
      somaOpcao: 'adiantamento'
    });
   };

  const filteredMotoristas = useMemo(() => {
    if (!selectedParceiro) {
      // Retorna motoristas + parceiros PF que são motoristas
      const parceiroMotoristas = parceiros
        .filter(p => p.tipo === 'PF' && p.isMotorista)
        .map(p => ({
          id: p.id,
          parceiroId: p.id,
          nome: p.nome || '',
          cpf: p.documento || '',
          cnh: p.cnh || '',
          categoriaCnh: '',
          validadeCnh: new Date(),
          telefone: p.telefone || '',
          isActive: p.isActive,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        }));
      return [...motoristas, ...parceiroMotoristas];
    }
    
    // Se um parceiro específico foi selecionado
    const motoristasDoParceiro = motoristas.filter(m => m.parceiroId === selectedParceiro);
    
    // Verifica se o próprio parceiro é motorista
    const parceiro = parceiros.find(p => p.id === selectedParceiro);
    if (parceiro && parceiro.tipo === 'PF' && parceiro.isMotorista) {
      const parceiroComoMotorista = {
        id: parceiro.id,
        parceiroId: parceiro.id,
        nome: parceiro.nome || '',
        cpf: parceiro.documento || '',
        cnh: parceiro.cnh || '',
        categoriaCnh: '',
        validadeCnh: new Date(),
        telefone: parceiro.telefone || '',
        isActive: parceiro.isActive,
        createdAt: parceiro.createdAt,
        updatedAt: parceiro.updatedAt
      };
      return [...motoristasDoParceiro, parceiroComoMotorista];
    }
    
    return motoristasDoParceiro;
  }, [selectedParceiro, motoristas, parceiros]);

  const filteredVeiculos = useMemo(() => {
    if (!selectedParceiro) return veiculos;
    return veiculos.filter(v => v.parceiroId === selectedParceiro);
  }, [selectedParceiro, veiculos]);

  // Seleção automática de veículo quando motorista é selecionado
  React.useEffect(() => {
    if (selectedMotorista) {
      // Verifica se o motorista selecionado é um parceiro-motorista
      const motoristaData = filteredMotoristas.find(m => m.id === selectedMotorista);
      if (motoristaData) {
        // Se for um parceiro-motorista (id do motorista = id do parceiro)
        if (motoristaData.id === motoristaData.parceiroId) {
          // Busca veículo vinculado ao parceiro
          const veiculoDoParceiro = veiculos.find(v => v.parceiroId === motoristaData.parceiroId);
          if (veiculoDoParceiro) {
            setSelectedVeiculo(veiculoDoParceiro.id);
          }
        } else {
          // Para motoristas tradicionais, busca por veiculoVinculado
          const motoristaCompleto = motoristas.find(m => m.id === selectedMotorista);
          if (motoristaCompleto?.veiculoVinculado) {
            setSelectedVeiculo(motoristaCompleto.veiculoVinculado);
          }
        }
      }
    }
  }, [selectedMotorista, filteredMotoristas, veiculos, motoristas]);



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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        {/* À Coletar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">À Coletar</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.aColetar}</p>
            </div>
          </div>
        </div>

        {/* Em Trânsito */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Em Trânsito</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.emTransito}</p>
            </div>
          </div>
        </div>

        {/* Armazenadas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Armazenadas</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.armazenadas}</p>
            </div>
          </div>
        </div>

        {/* Entregues */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Entregues</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.entregues}</p>
            </div>
          </div>
        </div>

        {/* Valor Total */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Valor Total</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(stats.valorTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por CRT, origem ou destino..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filtro Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos os status</option>
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>

          {/* Data Início */}
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Data início"
          />

          {/* Data Fim */}
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Data fim"
          />
        </div>
      </div>

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
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Nenhuma carga encontrada
                  </td>
                </tr>
              ) : (
                filteredCargas.map((carga) => (
                  <tr key={carga.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {carga.crt || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {carga.origem}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {carga.destino}
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
                          return veiculo ? veiculo.placa : 'Veículo não encontrado';
                        })() 
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[carga.status as keyof typeof statusConfig].color}`}>
                        {statusConfig[carga.status as keyof typeof statusConfig].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 items-center">
                        <button
                          onClick={() => handleEdit(carga)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => {
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
                          onClick={() => handleLinkParceiro(carga)}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Vincular parceiro/motorista"
                        >
                          <Link className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleIntegrateFinanceiro(carga)}
                          className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 p-1 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                          title="Integrar Financeiro"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                        <button
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

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingCarga ? 'Editar Carga' : 'Nova Carga'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CRT
                    </label>
                    <input
                      type="text"
                      value={formData.crt}
                      onChange={(e) => handleFormChange('crt', e.target.value.slice(0, 10))}
                      placeholder="Ex: BR722"
                      className="input-field"
                      maxLength={10}
                    />
                    <p className="text-xs text-gray-500 mt-1">Máximo 10 caracteres</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'entregue' | 'em_transito' | 'a_coletar' | 'armazenada' | 'cancelada' })}
                      className="input-field"
                      required
                    >
                      <option value="a_coletar">À coletar</option>
                      <option value="em_transito">Em trânsito</option>
                      <option value="armazenada">Armazenada</option>
                      <option value="entregue">Entregue</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ORIGEM */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        UF Origem *
                      </label>
                      <select
                        value={formData.ufOrigemSelecionada}
                        onChange={(e) => {
                          handleFormChange('ufOrigemSelecionada', e.target.value);
                          // Limpar cidade quando mudar UF
                          if (formData.cidadeOrigem) {
                            handleFormChange('cidadeOrigem', '');
                          }
                        }}
                        className="input-field"
                        required
                      >
                        <option value="">Selecione a UF de origem</option>
                        {ufsOrdenadas.map((uf) => (
                          <option key={uf.value} value={uf.value}>
                            {uf.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {formData.ufOrigemSelecionada && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Cidade Origem
                        </label>
                        <input
                          type="text"
                          value={formData.cidadeOrigem}
                          onChange={(e) => handleFormChange('cidadeOrigem', e.target.value)}
                          placeholder={formData.ufOrigemSelecionada === 'internacional' ? "Digite a cidade/país de origem" : "Digite a cidade de origem"}
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>

                  {/* DESTINO */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        UF Destino *
                      </label>
                      <select
                        value={formData.ufDestinoSelecionada}
                        onChange={(e) => {
                          handleFormChange('ufDestinoSelecionada', e.target.value);
                          // Limpar cidade quando mudar UF
                          if (formData.cidadeDestino) {
                            handleFormChange('cidadeDestino', '');
                          }
                        }}
                        className="input-field"
                        required
                      >
                        <option value="">Selecione a UF de destino</option>
                        {ufsOrdenadas.map((uf) => (
                          <option key={uf.value} value={uf.value}>
                            {uf.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {formData.ufDestinoSelecionada && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Cidade Destino
                        </label>
                        <input
                          type="text"
                          value={formData.cidadeDestino}
                          onChange={(e) => handleFormChange('cidadeDestino', e.target.value)}
                          placeholder={formData.ufDestinoSelecionada === 'internacional' ? "Digite a cidade/país de destino" : "Digite a cidade de destino"}
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Data de Coleta *
                    </label>
                    <input
                      type="date"
                      value={formData.dataColeta}
                      onChange={(e) => setFormData({ ...formData, dataColeta: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Data de Entrega *
                    </label>
                    <input
                      type="date"
                      value={formData.dataEntrega}
                      onChange={(e) => setFormData({ ...formData, dataEntrega: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Peso (toneladas) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.peso}
                      onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                      className="input-field"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valor (R$) *
                    </label>
                    <input
                      type="text"
                      value={formData.valor}
                      onChange={(e) => {
                        const formatted = formatCurrency(e.target.value);
                        setFormData({ ...formData, valor: formatted });
                      }}
                      className="input-field"
                      placeholder="R$ 0,00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="input-field"
                    rows={3}
                    placeholder="Observações adicionais..."
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    {editingCarga ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown de status sobreposto */}
      {showStatusDropdown && dropdownPosition && (
        <>
          {/* Overlay para fechar o dropdown ao clicar fora */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setShowStatusDropdown(null);
              setDropdownPosition(null);
            }}
          />
          {/* Dropdown sobreposto */}
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
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleChangeStatus(showStatusDropdown, key as 'entregue' | 'em_transito' | 'a_coletar' | 'armazenada' | 'cancelada')}
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

      {/* Modal de vinculação */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Vincular Parceiro/Motorista
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parceiro
                </label>
                <select
                  value={selectedParceiro}
                  onChange={(e) => {
                    setSelectedParceiro(e.target.value);
                    setSelectedMotorista('');
                    setSelectedVeiculo('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Selecione um parceiro</option>
                  {parceiros.map(parceiro => (
                    <option key={parceiro.id} value={parceiro.id}>
                      {parceiro.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motorista
                </label>
                <select
                  value={selectedMotorista}
                  onChange={(e) => setSelectedMotorista(e.target.value)}
                  disabled={!selectedParceiro}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                >
                  <option value="">Selecione um motorista</option>
                  {filteredMotoristas.map(motorista => (
                    <option key={motorista.id} value={motorista.id}>
                      {motorista.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Veículo
                </label>
                <select
                  value={selectedVeiculo}
                  onChange={(e) => setSelectedVeiculo(e.target.value)}
                  disabled={!selectedParceiro}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
                >
                  <option value="">Selecione um veículo</option>
                  {filteredVeiculos.map(veiculo => (
                    <option key={veiculo.id} value={veiculo.id}>
                      {veiculo.placa} - {veiculo.modelo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowLinkModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveLink}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação CSV/Excel */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Importar Cargas
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportStatus('idle');
                  setImportMessage('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Selecione um arquivo CSV ou Excel (.xlsx, .xls) para importar cargas:
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded mb-2">
                  <strong>Colunas aceitas (flexível):</strong><br/>
                  • CRT/Código/Número (opcional)<br/>
                  • Origem* (obrigatório)<br/>
                  • Destino* (obrigatório)<br/>
                  • Data Coleta (formato: DD/MM/YYYY ou similar)<br/>
                  • Data Entrega (formato: DD/MM/YYYY ou similar)<br/>
                  • Valor (aceita R$ 1.234,56 ou 1234.56)<br/>
                  • Peso (em kg)<br/>
                  • Observações/Comentários
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  💡 O sistema detecta automaticamente as colunas mesmo com nomes diferentes
                </div>
              </div>
              
              <div className="mb-4">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    dark:file:bg-blue-900 dark:file:text-blue-300
                    dark:hover:file:bg-blue-800"
                />
              </div>
              
              {importFile && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Arquivo selecionado: {importFile.name}
                  </p>
                </div>
              )}
              
              {importMessage && (
                <div className={`mb-4 p-3 rounded-lg max-h-40 overflow-y-auto ${
                  importStatus === 'error' 
                    ? 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300'
                    : importStatus === 'success'
                    ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                }`}>
                  <pre className="text-sm whitespace-pre-wrap font-sans">{importMessage}</pre>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportStatus('idle');
                    setImportMessage('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={processImport}
                  disabled={!importFile || importStatus === 'processing'}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {importStatus === 'processing' ? 'Processando...' : 'Importar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Integrar Financeiro */}
      {showIntegrateModal && integratingCarga && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Integrar Financeiro - Carga {integratingCarga.crt || integratingCarga.id}
              </h3>
              <button
                onClick={() => {
                  setShowIntegrateModal(false);
                  setIntegratingCarga(null);
                  setIntegrateData({
                    adiantamentoEnabled: false,
                    adiantamentoPercentual: '70',
                    dataVencimentoAdiantamento: '',
                    dataVencimentoSaldo: '',
                    despesasEnabled: false,
                    valorARS: '',
                    taxaConversao: '',
                    valorBRL: '',
                    diariasEnabled: false,
                    valorDiarias: '',
                    somaOpcao: 'adiantamento'
                  });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {/* A. Adiantamento */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="mb-4">
                    <StandardCheckbox
                      label="Adiantamento"
                      checked={integrateData.adiantamentoEnabled}
                      onChange={(checked) => setIntegrateData(prev => ({ ...prev, adiantamentoEnabled: checked }))}
                      description="Habilitar cálculo de adiantamento sobre o valor total"
                    />
                  </div>
                  
                  {integrateData.adiantamentoEnabled && (
                    <div className="space-y-4 ml-7">
                      {/* Seleção de Percentual */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Percentual do Adiantamento
                        </label>
                        <select
                          value={integrateData.adiantamentoPercentual}
                          onChange={(e) => setIntegrateData(prev => ({ ...prev, adiantamentoPercentual: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                          <option value="70">70%</option>
                          <option value="80">80%</option>
                        </select>
                      </div>
                      
                      {/* Cálculos Automáticos */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Valor Total da Carga:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              R$ {integratingCarga.valorTotal ? parseFloat(integratingCarga.valorTotal.toString().replace(/[^\d.,]/g, '').replace(',', '.')).toFixed(2).replace('.', ',') : '0,00'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Adiantamento ({integrateData.adiantamentoPercentual}%):</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              R$ {calcularAdiantamento().toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Saldo ({100 - parseFloat(integrateData.adiantamentoPercentual)}%):</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              R$ {calcularSaldo().toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Datas de Vencimento */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Data de Vencimento do Adiantamento
                          </label>
                          <input
                            type="date"
                            value={integrateData.dataVencimentoAdiantamento}
                            onChange={(e) => setIntegrateData(prev => ({ ...prev, dataVencimentoAdiantamento: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Data de Vencimento do Saldo
                          </label>
                          <input
                            type="date"
                            value={integrateData.dataVencimentoSaldo}
                            onChange={(e) => setIntegrateData(prev => ({ ...prev, dataVencimentoSaldo: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* B. Despesas Adicionais */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="mb-4">
                    <StandardCheckbox
                      label="Despesas Adicionais"
                      checked={integrateData.despesasEnabled}
                      onChange={(checked) => setIntegrateData(prev => ({ ...prev, despesasEnabled: checked }))}
                      description="Incluir despesas em pesos argentinos com conversão automática"
                    />
                  </div>
                  
                  {integrateData.despesasEnabled && (
                    <div className="space-y-4 ml-7">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Valor em Pesos Argentinos (ARS)
                          </label>
                          <input
                            type="text"
                            value={integrateData.valorARS}
                            onChange={(e) => {
                              const formatted = formatCurrency(e.target.value);
                              setIntegrateData(prev => ({ 
                                ...prev, 
                                valorARS: formatted
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            placeholder="$ 0,00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Taxa de Conversão
                          </label>
                          <input
                            type="text"
                            value={integrateData.taxaConversao}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d.,]/g, '');
                              setIntegrateData(prev => ({ 
                                ...prev, 
                                taxaConversao: value
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Valor em Reais (BRL) - Calculado Automaticamente
                        </label>
                        <input
                          type="text"
                          value={`R$ ${calcularValorBRL().toFixed(2).replace('.', ',')}`}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                        />
                      </div>
                      
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Total das Despesas Adicionais em BRL: </span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            R$ {calcularValorBRL().toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* C. Diárias */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="mb-4">
                    <StandardCheckbox
                      label="Diárias"
                      checked={integrateData.diariasEnabled}
                      onChange={(checked) => setIntegrateData(prev => ({ ...prev, diariasEnabled: checked }))}
                      description="Incluir valor de diárias em reais"
                    />
                  </div>
                  
                  {integrateData.diariasEnabled && (
                    <div className="ml-7">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Valor em Reais (BRL)
                      </label>
                      <input
                        type="text"
                        value={integrateData.valorDiarias}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          setIntegrateData(prev => ({ ...prev, valorDiarias: formatted }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="R$ 0,00"
                      />
                    </div>
                  )}
                </div>

                {/* D. Opção de Soma */}
                {(integrateData.adiantamentoEnabled || integrateData.despesasEnabled || integrateData.diariasEnabled) && (
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Opção de Soma
                    </label>
                    <div className="space-y-3">
                      {integrateData.adiantamentoEnabled && (
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="somaOpcao"
                            value="adiantamento"
                            checked={integrateData.somaOpcao === 'adiantamento'}
                            onChange={(e) => setIntegrateData(prev => ({ ...prev, somaOpcao: e.target.value as 'adiantamento' | 'saldo' }))}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Somar ao Adiantamento</span>
                        </label>
                      )}
                      {integrateData.adiantamentoEnabled && (
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="somaOpcao"
                            value="saldo"
                            checked={integrateData.somaOpcao === 'saldo'}
                            onChange={(e) => setIntegrateData(prev => ({ ...prev, somaOpcao: e.target.value as 'adiantamento' | 'saldo' }))}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Somar ao Saldo</span>
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* Total Final */}
                {(integrateData.adiantamentoEnabled || integrateData.despesasEnabled || integrateData.diariasEnabled) && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Total Final:</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          R$ {calcularTotalFinal().toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {integrateData.adiantamentoEnabled && integrateData.somaOpcao === 'adiantamento' && 
                          `Adiantamento + Despesas + Diárias`}
                        {integrateData.adiantamentoEnabled && integrateData.somaOpcao === 'saldo' && 
                          `Saldo + Despesas + Diárias`}
                        {!integrateData.adiantamentoEnabled && 
                          `Valor da Carga + Despesas + Diárias`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowIntegrateModal(false);
                    setIntegratingCarga(null);
                    setIntegrateData({
                      adiantamentoEnabled: false,
                      adiantamentoPercentual: '70',
                      dataVencimentoAdiantamento: '',
                      dataVencimentoSaldo: '',
                      despesasEnabled: false,
                      valorARS: '',
                      taxaConversao: '',
                      valorBRL: '',
                      diariasEnabled: false,
                      valorDiarias: '',
                      somaOpcao: 'adiantamento'
                    });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleIntegrateSubmit}
                  disabled={!integrateData.adiantamentoEnabled && !integrateData.despesasEnabled && !integrateData.diariasEnabled}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Integrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação para cancelar */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirmar Cancelamento
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Você tem alterações não salvas. Tem certeza que deseja cancelar? Todas as alterações serão perdidas.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Continuar Editando
              </button>
              <button
                onClick={performReset}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Descartar Alterações
              </button>
            </div>
          </div>
        </div>
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
              Tem certeza que deseja excluir a carga "{deleteTarget.descricao}"? Esta ação não pode ser desfeita.
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
    </div>
  );
};

export default Cargas;
