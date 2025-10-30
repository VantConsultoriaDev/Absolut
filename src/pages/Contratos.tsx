import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, parseCurrency, formatDocument } from '../utils/formatters';
import { FileText, RefreshCw, Search, AlertTriangle, Download, Send, Mail } from 'lucide-react';
import { PDFService, ContratoData } from '../services/pdfService';

// Tipagem para os valores editáveis do frete
interface FreteValores {
  valorFrete: string; // VF
  adiantamento: string; // AD
  pedagio: string; // PD
  outrasDespesas: string; // OE1
  diarias: string; // D1
  outrosDescontos: string; // OU
}

const initialFreteValores: FreteValores = {
  valorFrete: '',
  adiantamento: '',
  pedagio: '',
  outrasDespesas: '',
  diarias: '',
  outrosDescontos: ''
};

// Tipagem para os dados carregados do Supabase
interface LoadedData {
  carga: any;
  motorista: any;
  veiculo: any;
  proprietario: any;
  movimentacoes: any[];
  placasCarretas: string;
}

// Regex simples para verificar se o ID se parece com um UUID (contém hífens e tem o comprimento correto)
const isUUID = (id: string) => {
  return id.length === 36 && id.includes('-');
};

const Contratos: React.FC = () => {
  const { cargas: localCargas, veiculos: localVeiculos } = useDatabase();
  
  const [selectedCargaId, setSelectedCargaId] = useState('');
  const [freteValores, setFreteValores] = useState<FreteValores>(initialFreteValores);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // 1. Carga Selecionada (usando dados locais para o Select)
  const selectedCarga = useMemo(() => {
    return localCargas.find(c => c.id === selectedCargaId);
  }, [localCargas, selectedCargaId]);

  // 2. Cálculo do Saldo
  const calcularSaldo = useCallback((valores: FreteValores) => {
    const vf = parseCurrency(valores.valorFrete);
    const ad = parseCurrency(valores.adiantamento);
    const pd = parseCurrency(valores.pedagio);
    const oe1 = parseCurrency(valores.outrasDespesas);
    const d1 = parseCurrency(valores.diarias);
    const ou = parseCurrency(valores.outrosDescontos);
    
    // Saldo = VF - AD + PD + OE1 + D1 - OU
    const saldo = vf - ad + pd + oe1 + d1 - ou;
    return saldo;
  }, []);

  const saldoAReceber = useMemo(() => {
    return calcularSaldo(freteValores);
  }, [freteValores, calcularSaldo]);

  // 3. Função para carregar dados (Simulando Queries Supabase)
  const loadDataFromCarga = useCallback(async () => {
    if (!selectedCargaId) {
      setFreteValores(initialFreteValores);
      setLoadedData(null);
      setPdfUrl(null);
      return;
    }
    
    if (!supabase) {
      alert('Erro: Cliente Supabase não inicializado. Verifique as variáveis de ambiente.');
      setLoading(false);
      return;
    }

    // VERIFICAÇÃO DE UUID ROBUSTA
    if (!isUUID(selectedCargaId)) {
        setLoading(false);
        setLoadedData(null);
        alert('Atenção: Esta funcionalidade de Contrato de Frete só funciona com cargas salvas no Supabase (UUIDs). A carga selecionada é um dado de demonstração local.');
        return;
    }

    setLoading(true);
    setPdfUrl(null);
    
    try {
      // 3.1. Carregar Carga + Cliente + Parceiro
      const { data: carga, error: cargaError } = await supabase
        .from('cargas')
        .select(`
          id, crt, origem, destino, peso, valor, descricao, data_coleta, data_entrega,
          cliente:clientes(nome),
          parceiro:parceiros(nome),
          motorista_id,
          veiculo_id,
          carretas_selecionadas
        `)
        .eq('id', selectedCargaId)
        .single();

      if (cargaError || !carga) throw new Error(cargaError?.message || 'Carga não encontrada');

      // 3.2. Carregar Motorista
      let motorista: any = null;
      if (carga.motorista_id) {
        const { data: mData } = await supabase
          .from('motoristas')
          .select('nome, cpf, cnh, categoria_cnh, validade_cnh, telefone')
          .eq('id', carga.motorista_id)
          .single();
        motorista = mData;
      }

      // 3.3. Carregar Veículo + Proprietário
      let veiculo: any = null;
      let proprietario: any = null;
      if (carga.veiculo_id) {
        const { data: vData } = await supabase
          .from('veiculos')
          .select(`
            placa, placa_cavalo, placa_carreta, placa_carreta1, placa_carreta2, placa_dolly,
            modelo, ano, tipo, carroceria, possui_dolly,
            parceiro:parceiros(nome)
          `)
          .eq('id', carga.veiculo_id)
          .single();
        veiculo = vData;
        proprietario = vData?.parceiro;
      }
      
      // 3.4. Carregar Movimentações do Frete
      const { data: movimentos, error: movError } = await supabase
        .from('movimentacoes_financeiras')
        .select('tipo, categoria, valor, status')
        .eq('carga_id', selectedCargaId);

      if (movError) throw new Error(movError.message);

      // 3.5. Classificação dos Valores
      let VF = 0, AD = 0, PD = 0, OE1 = 0, D1 = 0, OU = 0;

      movimentos.forEach(m => {
        // Usamos o valor absoluto, pois a classificação é feita pela categoria
        const valor = Math.abs(m.valor || 0); 
        
        // Nota: As categorias devem ser consistentes com o que é salvo no banco.
        // Assumindo que as categorias são salvas em MAIÚSCULAS ou minúsculas.
        switch (m.categoria?.toUpperCase()) {
          case 'FRETE': VF += valor; break;
          case 'ADIANTAMENTO': AD += valor; break;
          case 'PEDAGIO': PD += valor; break;
          case 'ALUGUEL':
          case 'OUTRAS DESPESAS': OE1 += valor; break;
          case 'DIARIA': D1 += valor; break;
          case 'DESCONTO': OU += valor; break;
        }
      });

      // Se não houver movimentação de FRETE, usa o valor da carga como VF
      if (VF === 0) {
        VF = carga.valor || 0;
      }

      setFreteValores({
        valorFrete: formatCurrency(VF),
        adiantamento: formatCurrency(AD),
        pedagio: formatCurrency(PD),
        outrasDespesas: formatCurrency(OE1),
        diarias: formatCurrency(D1),
        outrosDescontos: formatCurrency(OU)
      });
      
      // 3.6. Carretas Selecionadas (Busca localmente, pois a query Supabase não traz os dados completos das carretas)
      const placasCarretas = (carga.carretas_selecionadas as string[] || [])
        .map(id => localVeiculos.find(v => v.id === id)?.placaCarreta || '')
        .filter(Boolean)
        .join(', ') || '-';

      setLoadedData({
        carga,
        motorista,
        veiculo,
        proprietario,
        movimentacoes: movimentos,
        placasCarretas
      });

    } catch (error) {
      console.error('Erro ao carregar dados do contrato:', error);
      alert(`Erro ao carregar dados do contrato. Detalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setLoadedData(null);
      setFreteValores(initialFreteValores);
    } finally {
      setLoading(false);
    }
  }, [selectedCargaId, localVeiculos]);

  // Carregar dados automaticamente ao selecionar uma carga
  useEffect(() => {
    loadDataFromCarga();
  }, [selectedCargaId, loadDataFromCarga]);

  // Filtrar cargas para o Select (usando dados locais para performance)
  const filteredCargas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    // Ordenar por created_at DESC (simulando a query)
    const sortedCargas = [...localCargas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (!q) return sortedCargas;
    return sortedCargas.filter(c =>
      (c.crt || '').toLowerCase().includes(q) ||
      (c.origem || '').toLowerCase().includes(q) ||
      (c.destino || '').toLowerCase().includes(q)
    );
  }, [localCargas, searchTerm]);

  // Componente auxiliar para exibir campos de dados
  const DataField: React.FC<{ label: string, value: string | number | undefined, isEditable?: boolean, fieldName?: keyof FreteValores }> = ({ label, value, isEditable = false, fieldName }) => {
    const displayValue = typeof value === 'number' ? formatCurrency(value) : (value || '-');
    
    if (isEditable && fieldName) {
      return (
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
          <input
            type="text"
            value={freteValores[fieldName]}
            onChange={(e) => setFreteValores(prev => ({ ...prev, [fieldName]: formatCurrency(e.target.value) }))}
            className="input-field text-sm font-semibold h-10"
            placeholder="R$ 0,00"
          />
        </div>
      );
    }

    // Ajuste para exibir valores de data corretamente
    let finalValue = displayValue;
    if (label.includes('Data') && typeof value === 'string' && value !== '-') {
        try {
            finalValue = format(new Date(value), 'dd/MM/yyyy', { locale: ptBR });
        } catch {
            finalValue = value;
        }
    }

    return (
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{finalValue}</p>
      </div>
    );
  };

  // Função para obter CPF/CNH de forma segura, garantindo que retorne string
  const getMotoristaDocumentos = (motorista: any) => {
    if (!motorista) return { cpf: '-', cnh: '-' };
    
    // Supabase retorna 'cpf' e 'cnh' diretamente da tabela motoristas
    return { cpf: motorista.cpf || '-', cnh: motorista.cnh || '-' };
  };
  
  // Função para gerar o PDF
  const handleGeneratePDF = async () => {
    if (!loadedData) return;

    setLoading(true);
    
    const contratoData: ContratoData = {
      carga: loadedData.carga,
      motorista: loadedData.motorista,
      veiculo: loadedData.veiculo,
      proprietario: loadedData.proprietario,
      placasCarretas: loadedData.placasCarretas,
      valoresFrete: {
        VF: freteValores.valorFrete,
        AD: freteValores.adiantamento,
        PD: freteValores.pedagio,
        OE1: freteValores.outrasDespesas,
        D1: freteValores.diarias,
        OU: freteValores.outrosDescontos,
        SL: saldoAReceber
      }
    };

    try {
      const url = await PDFService.generateContratoPDF(contratoData);
      setPdfUrl(url);
      alert('PDF gerado com sucesso! Use os botões de ação.');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Verifique o console para detalhes.');
    } finally {
      setLoading(false);
    }
  };

  // Componente para os botões de ação do PDF
  const PDFActionButtons: React.FC<{ data: ContratoData }> = ({ data }) => (
    <div className="flex justify-end pt-4 space-x-3">
      <button
        onClick={() => PDFService.downloadPDF(pdfUrl!, `Contrato_Frete_${data.carga.crt || data.carga.id}.txt`)}
        className="btn-secondary text-lg px-8 py-3 flex items-center"
        disabled={!pdfUrl}
      >
        <Download className="h-6 w-6 mr-3" />
        Baixar PDF
      </button>
      <button
        onClick={() => PDFService.shareWhatsApp(data)}
        className="btn-secondary text-lg px-8 py-3 flex items-center bg-green-500 hover:bg-green-600 text-white"
        disabled={!pdfUrl}
      >
        <Send className="h-6 w-6 mr-3" />
        Enviar por WhatsApp
      </button>
      <button
        onClick={() => PDFService.shareEmail(data)}
        className="btn-secondary text-lg px-8 py-3 flex items-center"
        disabled={!pdfUrl}
      >
        <Mail className="h-6 w-6 mr-3" />
        Enviar por Email
      </button>
    </div>
  );

  const contratoDataForActions: ContratoData | null = useMemo(() => {
    if (!loadedData) return null;
    return {
      carga: loadedData.carga,
      motorista: loadedData.motorista,
      veiculo: loadedData.veiculo,
      proprietario: loadedData.proprietario,
      placasCarretas: loadedData.placasCarretas,
      valoresFrete: {
        VF: freteValores.valorFrete,
        AD: freteValores.adiantamento,
        PD: freteValores.pedagio,
        OE1: freteValores.outrasDespesas,
        D1: freteValores.diarias,
        OU: freteValores.outrosDescontos,
        SL: saldoAReceber
      }
    };
  }, [loadedData, freteValores, saldoAReceber]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contratos</h1>
          <p className="text-gray-600 dark:text-gray-400">Selecione uma carga para gerar o contrato e calcular o saldo.</p>
        </div>
      </div>

      {/* Seleção de Carga */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar carga por CRT, origem ou destino..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 h-11 text-sm"
            />
          </div>
          
          <select
            value={selectedCargaId}
            onChange={(e) => setSelectedCargaId(e.target.value)}
            className="input-field h-11 text-sm flex-1"
          >
            <option value="">Selecione uma Carga</option>
            {filteredCargas.map(carga => (
              <option key={carga.id} value={carga.id}>
                {carga.crt || carga.descricao} ({carga.origem} → {carga.destino})
              </option>
            ))}
          </select>
          
          <button
            onClick={loadDataFromCarga}
            disabled={!selectedCargaId || loading}
            className="btn-secondary h-11 px-4 flex items-center"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Conteúdo do Contrato */}
      {loading && selectedCargaId ? (
        <div className="text-center py-12 card">
          <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Carregando dados do Supabase...</p>
        </div>
      ) : selectedCarga && loadedData ? (
        <div className="space-y-6">
          {/* SEÇÃO: Dados da Carga */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b pb-3 border-gray-100 dark:border-gray-700">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dados da Carga</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DataField label="CRT" value={loadedData.carga.crt} />
              <DataField label="Origem" value={loadedData.carga.origem} />
              <DataField label="Destino" value={loadedData.carga.destino} />
              <DataField label="Peso (kg)" value={loadedData.carga.peso} />
              <DataField label="Data Coleta" value={loadedData.carga.data_coleta} />
              <DataField label="Data Entrega" value={loadedData.carga.data_entrega} />
              <DataField label="Valor Carga" value={loadedData.carga.valor} />
              <DataField label="Cliente" value={loadedData.carga.cliente?.nome || '-'} />
              <DataField label="Parceiro" value={loadedData.carga.parceiro?.nome || '-'} />
              <div className="col-span-2">
                <DataField label="Descrição" value={loadedData.carga.descricao} />
              </div>
            </div>
          </div>

          {/* SEÇÃO: Motorista */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b pb-3 border-gray-100 dark:border-gray-700">
              <FileText className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Motorista</h2>
            </div>
            {loadedData.motorista ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DataField label="Nome" value={loadedData.motorista.nome} />
                <DataField label="CPF" value={formatDocument(getMotoristaDocumentos(loadedData.motorista).cpf, 'PF')} />
                <DataField label="CNH" value={getMotoristaDocumentos(loadedData.motorista).cnh} />
                <DataField label="Telefone" value={loadedData.motorista.telefone} />
                <DataField label="Categoria CNH" value={loadedData.motorista.categoria_cnh} />
                <DataField label="Validade CNH" value={loadedData.motorista.validade_cnh} />
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Motorista não vinculado à carga.</p>
              </div>
            )}
          </div>

          {/* SEÇÃO: Veículo */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b pb-3 border-gray-100 dark:border-gray-700">
              <FileText className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Veículo</h2>
            </div>
            {loadedData.veiculo ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DataField label="Placa Cavalo/Truck" value={loadedData.veiculo.placa_cavalo || loadedData.veiculo.placa} />
                <DataField label="Placas Carretas" value={loadedData.placasCarretas} />
                <DataField label="Placa Dolly" value={loadedData.veiculo.placa_dolly} />
                <DataField label="Modelo" value={loadedData.veiculo.modelo} />
                <DataField label="Ano" value={loadedData.veiculo.ano} />
                <DataField label="Tipo" value={`${loadedData.veiculo.tipo} (${loadedData.veiculo.carroceria || 'N/A'})`} />
                <DataField label="Possui Dolly?" value={loadedData.veiculo.possui_dolly ? 'Sim' : 'Não'} />
                <DataField label="Proprietário" value={loadedData.proprietario?.nome || '-'} />
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Veículo não vinculado à carga.</p>
              </div>
            )}
          </div>

          {/* SEÇÃO: Valores do Frete */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b pb-3 border-gray-100 dark:border-gray-700">
              <FileText className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Valores do Frete (Editável)</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DataField label="Valor Frete (VF)" value={freteValores.valorFrete} isEditable fieldName="valorFrete" />
              <DataField label="Adiantamento (AD)" value={freteValores.adiantamento} isEditable fieldName="adiantamento" />
              <DataField label="Pedágio (PD)" value={freteValores.pedagio} isEditable fieldName="pedagio" />
              <DataField label="Outras Despesas (OE1)" value={freteValores.outrasDespesas} isEditable fieldName="outrasDespesas" />
              <DataField label="Diárias (D1)" value={freteValores.diarias} isEditable fieldName="diarias" />
              <DataField label="Outros Descontos (OU)" value={freteValores.outrosDescontos} isEditable fieldName="outrosDescontos" />
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold text-gray-700 dark:text-gray-300">Saldo a Receber (SL)</p>
                <p className={`text-2xl font-extrabold ${saldoAReceber >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(saldoAReceber)}
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Cálculo: (VF - AD - OU) + PD + OE1 + D1
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end pt-4 space-x-3">
            <button
              onClick={handleGeneratePDF}
              className="btn-primary text-lg px-8 py-3 flex items-center"
              disabled={loading}
            >
              <FileText className={`h-6 w-6 mr-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Gerando PDF...' : 'Gerar PDF do Contrato'}
            </button>
          </div>
          
          {pdfUrl && contratoDataForActions && (
            <PDFActionButtons data={contratoDataForActions} />
          )}
        </div>
      ) : (
        <div className="text-center py-12 card">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Selecione uma carga no menu acima para visualizar e gerar o contrato de frete.</p>
        </div>
      )}
    </div>
  );
};

export default Contratos;