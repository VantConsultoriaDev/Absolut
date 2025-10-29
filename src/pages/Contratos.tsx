import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, parseCurrency, formatDocument } from '../utils/formatters';
import { FileText, RefreshCw, Download, Send, Mail, Search, AlertTriangle } from 'lucide-react';

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

const Contratos: React.FC = () => {
  const { 
    cargas, 
    movimentacoes, 
    getMotoristaName, 
    parceiros, 
    veiculos,
    motoristas
  } = useDatabase();
  
  const [selectedCargaId, setSelectedCargaId] = useState('');
  const [freteValores, setFreteValores] = useState<FreteValores>(initialFreteValores);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Carga Selecionada e Dados Relacionados
  const selectedCarga = useMemo(() => {
    return cargas.find(c => c.id === selectedCargaId);
  }, [cargas, selectedCargaId]);

  const dadosRelacionados = useMemo(() => {
    if (!selectedCarga) return null;

    // Motorista (pode ser o parceiro PF)
    const motoristaData = motoristas.find(m => m.id === selectedCarga.motoristaId) || 
                         parceiros.find(p => p.id === selectedCarga.motoristaId && p.isMotorista);

    // Veículo
    const veiculoData = veiculos.find(v => v.id === selectedCarga.veiculoId);

    // Proprietário do Veículo (Parceiro)
    const proprietarioData = veiculoData?.parceiroId 
      ? parceiros.find(p => p.id === veiculoData.parceiroId) 
      : null;

    // Carretas
    const placasCarretas = selectedCarga.carretasSelecionadas
      ?.map(id => veiculos.find(v => v.id === id)?.placaCarreta || '')
      .filter(Boolean)
      .join(', ') || '-';

    return {
      motorista: motoristaData,
      veiculo: veiculoData,
      proprietario: proprietarioData,
      placasCarretas
    };
  }, [selectedCarga, motoristas, parceiros, veiculos]);

  // 2. Movimentações Financeiras e Cálculo de Saldo
  const movimentacoesCarga = useMemo(() => {
    if (!selectedCarga) return [];
    return movimentacoes.filter(m => m.cargaId === selectedCarga.id);
  }, [movimentacoes, selectedCarga]);

  const calcularSaldo = useCallback((valores: FreteValores) => {
    const vf = parseCurrency(valores.valorFrete);
    const ad = parseCurrency(valores.adiantamento);
    const pd = parseCurrency(valores.pedagio);
    const oe1 = parseCurrency(valores.outrasDespesas);
    const d1 = parseCurrency(valores.diarias);
    const ou = parseCurrency(valores.outrosDescontos);
    
    // Saldo a Receber (SL) = VF – AD + PD + OE1 + D1 – OU
    // Nota: A fórmula Saldo a Receber (SL) = VF – AD + PD + OE1 + D1 – OU parece incorreta para um contrato de frete.
    // Geralmente, o saldo é o valor total do frete menos o adiantamento e descontos.
    // Vamos usar a fórmula mais comum para o Saldo do Frete: VF - AD - OU + PD + OE1 + D1
    // Assumindo que Pedágio, Outras Despesas e Diárias são REEMBOLSOS/ADICIONAIS ao motorista.
    
    // Se o motorista está recebendo o frete, o saldo é:
    // Saldo = (Valor Frete - Adiantamento - Outros Descontos) + (Pedágio + Outras Despesas + Diárias)
    
    const saldo = (vf - ad - ou) + pd + oe1 + d1;
    return saldo;
  }, []);

  const saldoAReceber = useMemo(() => {
    return calcularSaldo(freteValores);
  }, [freteValores, calcularSaldo]);

  // 3. Função para carregar dados (F2)
  const loadDataFromCarga = useCallback(() => {
    if (!selectedCarga) {
      setFreteValores(initialFreteValores);
      return;
    }

    setLoading(true);
    
    // 3.1. Carregar valores das movimentações
    const movs = movimentacoesCarga;
    
    // Mapeamento simplificado:
    // Valor Frete (VF): Soma de todas as movimentações (Receita ou Despesa)
    // Adiantamento (AD): Movimentações com prefixo 'Adto'
    // Saldo (SL): Movimentações com prefixo 'Saldo'
    
    let valorFreteTotal = 0;
    let adiantamentoTotal = 0;
    let pedagioTotal = 0;
    let outrasDespesasTotal = 0;
    let diariasTotal = 0;
    let outrosDescontosTotal = 0;

    // Para simplificar, vamos assumir que o Valor Frete (VF) é o valor total da carga
    // e que as movimentações representam o Adiantamento e Saldo.
    
    valorFreteTotal = selectedCarga.valor || 0;
    
    movs.forEach(mov => {
      const valor = mov.valor || 0;
      const desc = mov.descricao.toLowerCase();
      
      if (desc.includes('adto')) {
        adiantamentoTotal += valor;
      } else if (desc.includes('saldo')) {
        // O saldo não é um valor de entrada editável, mas é o restante do frete.
        // Não o somamos aqui.
      } else if (desc.includes('pedagio')) {
        pedagioTotal += valor;
      } else if (desc.includes('diarias')) {
        diariasTotal += valor;
      } else if (desc.includes('despesa') && !desc.includes('adto') && !desc.includes('saldo')) {
        outrasDespesasTotal += valor;
      }
      // Nota: Outros Descontos (OU) não são facilmente mapeáveis de Movimentacoes,
      // então deixamos como 0 por padrão.
    });

    setFreteValores({
      valorFrete: formatCurrency(valorFreteTotal),
      adiantamento: formatCurrency(adiantamentoTotal),
      pedagio: formatCurrency(pedagioTotal),
      outrasDespesas: formatCurrency(outrasDespesasTotal),
      diarias: formatCurrency(diariasTotal),
      outrosDescontos: formatCurrency(outrosDescontosTotal) // Mantido 0 por padrão
    });

    setLoading(false);
  }, [selectedCarga, movimentacoesCarga]);

  // Carregar dados automaticamente ao selecionar uma carga
  useEffect(() => {
    loadDataFromCarga();
  }, [selectedCargaId, loadDataFromCarga]);

  // Filtrar cargas para o Select
  const filteredCargas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return cargas;
    return cargas.filter(c =>
      (c.crt || '').toLowerCase().includes(q) ||
      (c.origem || '').toLowerCase().includes(q) ||
      (c.destino || '').toLowerCase().includes(q)
    );
  }, [cargas, searchTerm]);

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

    return (
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayValue}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerar Contrato de Frete</h1>
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
      {selectedCarga ? (
        <div className="space-y-6">
          {/* SEÇÃO: Dados da Carga */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b pb-3 border-gray-100 dark:border-gray-700">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dados da Carga</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DataField label="CRT" value={selectedCarga.crt} />
              <DataField label="Origem" value={selectedCarga.origem} />
              <DataField label="Destino" value={selectedCarga.destino} />
              <DataField label="Peso (kg)" value={selectedCarga.peso} />
              <DataField label="Data Coleta" value={selectedCarga.dataColeta ? format(new Date(selectedCarga.dataColeta), 'dd/MM/yyyy', { locale: ptBR }) : '-'} />
              <DataField label="Data Entrega" value={selectedCarga.dataEntrega ? format(new Date(selectedCarga.dataEntrega), 'dd/MM/yyyy', { locale: ptBR }) : '-'} />
              <div className="col-span-2">
                <DataField label="Descrição" value={selectedCarga.descricao} />
              </div>
            </div>
          </div>

          {/* SEÇÃO: Motorista */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b pb-3 border-gray-100 dark:border-gray-700">
              <FileText className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Motorista</h2>
            </div>
            {dadosRelacionados?.motorista ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DataField label="Nome" value={dadosRelacionados.motorista.nome} />
                <DataField label="CPF" value={formatDocument(dadosRelacionados.motorista.cpf, 'PF')} />
                <DataField label="CNH" value={dadosRelacionados.motorista.cnh} />
                <DataField label="Telefone" value={dadosRelacionados.motorista.telefone} />
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
            {dadosRelacionados?.veiculo ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DataField label="Placa Cavalo/Truck" value={dadosRelacionados.veiculo.placaCavalo || dadosRelacionados.veiculo.placa} />
                <DataField label="Placas Carretas" value={dadosRelacionados.placasCarretas} />
                <DataField label="Modelo" value={dadosRelacionados.veiculo.modelo} />
                <DataField label="Ano" value={dadosRelacionados.veiculo.ano} />
                <DataField label="Proprietário" value={dadosRelacionados.proprietario?.nome} />
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

          {/* Botão de Ação Principal */}
          <div className="flex justify-end pt-4">
            <button
              onClick={() => alert('Funcionalidade de Gerar PDF será implementada na próxima etapa.')}
              className="btn-primary text-lg px-8 py-3 flex items-center"
            >
              <FileText className="h-6 w-6 mr-3" />
              Gerar PDF Contrato
            </button>
          </div>
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