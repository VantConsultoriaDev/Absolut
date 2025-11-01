import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { DatabaseContextType, User, Cliente, Parceiro, Motorista, Veiculo, MovimentacaoFinanceira, Carga, ContratoFrete, PermissoInternacional } from '../types'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext' // Necessário para obter o userId

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

export const useDatabase = () => {
  const context = useContext(DatabaseContext)
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider')
  }
  return context
}

interface DatabaseProviderProps {
  children: React.ReactNode
}

// Função para gerar IDs no formato UUID simulado (para compatibilidade com a Edge Function)
const generateUuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Função para inicializar dados de demonstração (movida para fora do componente)
const initializeDemoData = () => {
  // Utility function to generate IDs
  const generateId = generateUuid // Usando o novo gerador de UUID

  // IDs de demonstração fixos no formato UUID simulado
  const cliente1Id = generateId();
  const cliente2Id = generateId();
  const cliente3Id = generateId();
  const parceiro1Id = generateId();
  const parceiro2Id = generateId();
  const parceiro3Id = generateId();
  const motorista1Id = generateId();
  const motorista2Id = generateId();
  const veiculo1Id = generateId();
  const veiculo2Id = generateId();
  const veiculo3Id = generateId();
  const carreta1Id = generateId();
  const permisso1Id = generateId();
  const carga1Id = generateId();
  const carga2Id = generateId();
  const carga3Id = generateId();
  const mov1Id = generateId();
  const mov2Id = generateId();
  const mov3Id = generateId();
  const mov4Id = generateId();
  const mov5Id = generateId();
  const mov6Id = generateId();
  const mov7Id = generateId();
  const contrato1Id = generateId();


  // Demo clientes
  const demoClientes: Cliente[] = [
    {
      id: cliente1Id,
      tipo: 'PJ',
      nome: 'Loja do Centro Ltda',
      documento: '45.678.123/0001-55',
      email: 'contato@lojacentro.com.br',
      telefone: '(11) 3344-5566',
      endereco: 'Rua Central, 100',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01010-010',
      isActive: true,
      createdAt: new Date('2024-01-08'),
      updatedAt: new Date('2024-01-08')
    },
    {
      id: cliente2Id,
      tipo: 'PF',
      nome: 'Ana Pereira',
      documento: '123.456.789-00',
      email: 'ana.pereira@example.com',
      telefone: '(11) 98888-7777',
      endereco: 'Av. das Américas, 200',
      cidade: 'Osasco',
      estado: 'SP',
      cep: '06233-903',
      isActive: true,
      createdAt: new Date('2024-01-18'),
      updatedAt: new Date('2024-01-18')
    },
    {
      id: cliente3Id,
      tipo: 'INTERNACIONAL',
      nome: 'Global Imports S.A.',
      documento: '30-71000000-7', // Exemplo CUIT
      email: 'global@imports.com',
      telefone: '+54 11 4567-8901',
      endereco: 'Av. Libertador, 1000',
      cidade: 'Buenos Aires',
      estado: 'AR',
      cep: '1001',
      isActive: true,
      createdAt: new Date('2024-01-25'),
      updatedAt: new Date('2024-01-25')
    }
  ]

  // Demo parceiros
  const demoParceiros: Parceiro[] = [
    {
      id: parceiro1Id,
      nome: 'Transportadora ABC Ltda',
      tipo: 'PJ',
      documento: '12.345.678/0001-90',
      email: 'contato@transportadoraabc.com',
      telefone: '(11) 3456-7890',
      endereco: 'Rua das Flores, 123',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567',
      isActive: true,
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10')
    },
    {
      id: parceiro2Id,
      nome: 'Carlos Oliveira',
      tipo: 'PF',
      documento: '123.456.789-01',
      cnh: '98765432101',
      email: 'carlos@email.com',
      telefone: '(11) 9876-5432',
      endereco: 'Av. Paulista, 456',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '04567-890',
      isActive: true,
      isMotorista: true,
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20')
    },
    // Parceiro completo para teste de contrato
    {
      id: parceiro3Id,
      nome: 'Transportes Internacionais LTDA',
      tipo: 'PJ',
      documento: '99.888.777/0001-66',
      email: 'internacional@transporte.com',
      telefone: '(51) 3333-4444',
      endereco: 'Av. do Porto, 500',
      cidade: 'Porto Alegre',
      estado: 'RS',
      cep: '90000-000',
      isActive: true,
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01')
    }
  ]

  // Demo motoristas
  const demoMotoristas: Motorista[] = [
    {
      id: motorista1Id,
      parceiroId: parceiro1Id,
      nome: 'José da Silva',
      cpf: '98765432100',
      cnh: '12345678901',
      nacionalidade: 'Brasileiro',
      categoriaCnh: 'D',
      validadeCnh: new Date('2025-12-31'),
      telefone: '(11) 9999-8888',
      isActive: true,
      createdAt: new Date('2024-01-12'),
      updatedAt: new Date('2024-01-12')
    },
    // Motorista para Parceiro 3
    {
      id: motorista2Id,
      parceiroId: parceiro3Id,
      nome: 'Ricardo Almeida',
      cpf: '11122233344',
      cnh: '99887766554',
      nacionalidade: 'Brasileiro',
      categoriaCnh: 'E',
      validadeCnh: new Date('2026-06-15'),
      telefone: '(51) 98888-7777',
      isActive: true,
      createdAt: new Date('2024-02-05'),
      updatedAt: new Date('2024-02-05')
    }
  ]
  
  // Demo permisso
  const demoPermissoes: PermissoInternacional[] = [
    {
      id: permisso1Id,
      veiculoId: veiculo3Id, // Vinculado ao Cavalo
      razaoSocial: 'TRANSPORTES INTERNACIONAIS LTDA',
      nomeFantasia: 'TransInter',
      cnpj: '99888777000166',
      enderecoCompleto: 'Av. do Porto, 500 - Centro - Porto Alegre - RS - Brasil',
      dataConsulta: new Date('2024-07-25'),
      simulado: false,
      createdAt: new Date('2024-07-25'),
      updatedAt: new Date('2024-07-25')
    }
  ];

  // Demo veículos
  const demoVeiculos: Veiculo[] = [
    {
      id: veiculo1Id,
      parceiroId: parceiro1Id,
      placa: 'ABC1234',
      fabricante: 'Mercedes-Benz',
      modelo: 'Atego 1719',
      ano: 2020,
      capacidade: 8000,
      tipo: 'Truck',
      isActive: true,
      createdAt: new Date('2024-01-12'),
      updatedAt: new Date('2024-01-12')
    },
    {
      id: veiculo2Id,
      parceiroId: parceiro2Id,
      placa: 'XYZ5678',
      fabricante: 'Ford',
      modelo: 'Cargo 816',
      ano: 2019,
      capacidade: 3500,
      tipo: 'Truck',
      isActive: true,
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20')
    },
    // Veículo Cavalo para teste de contrato
    {
      id: veiculo3Id,
      parceiroId: parceiro3Id,
      placaCavalo: 'IJK9012',
      placa: 'IJK9012',
      fabricante: 'Scania',
      modelo: 'R450',
      ano: 2022,
      capacidade: 40000,
      tipo: 'Cavalo',
      isActive: true,
      createdAt: new Date('2024-02-05'),
      updatedAt: new Date('2024-02-05'),
      permisso: demoPermissoes[0] // Vincula o permisso
    },
    // Carreta 1 para teste de contrato
    {
      id: carreta1Id,
      parceiroId: parceiro3Id,
      placaCarreta: 'MNO3456',
      placa: 'MNO3456',
      fabricante: 'Randon',
      modelo: 'SR FG',
      ano: 2021,
      capacidade: 20000,
      tipo: 'Carreta',
      isActive: true,
      createdAt: new Date('2024-02-05'),
      updatedAt: new Date('2024-02-05')
    }
  ]

  // Demo movimentações financeiras
  const demoMovimentacoes: MovimentacaoFinanceira[] = [
    {
      id: mov1Id,
      tipo: 'receita',
      valor: 2500.00,
      descricao: 'Frete São Paulo - Rio de Janeiro',
      categoria: 'frete',
      data: new Date('2024-01-15'),
      status: 'pago',
      parceiroId: parceiro1Id,
      cargaId: carga1Id,
      isPago: true,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: mov2Id,
      tipo: 'despesa',
      valor: 350.00,
      descricao: 'Combustível',
      categoria: 'combustivel',
      data: new Date('2024-01-16'),
      parceiroId: parceiro1Id,
      status: 'pago',
      isPago: true,
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16')
    },
    {
      id: mov3Id,
      tipo: 'receita',
      valor: 1800.00,
      descricao: 'Frete local - entrega de materiais',
      categoria: 'frete',
      data: new Date('2024-01-22'),
      status: 'pendente',
      parceiroId: parceiro2Id,
      cargaId: carga2Id,
      isPago: false,
      createdAt: new Date('2024-01-22'),
      updatedAt: new Date('2024-01-22')
    },
    // Movimentações para Carga de Contrato (Split 70/30 + Extras)
    {
      id: mov4Id,
      tipo: 'despesa',
      valor: 7000.00, // 70% de 10000
      descricao: 'Adto - CRT-INT - Buenos Aires - Ricardo Almeida',
      categoria: 'FRETE',
      data: new Date('2024-07-20'),
      status: 'pendente',
      parceiroId: parceiro3Id,
      cargaId: carga3Id,
      isPago: false,
      createdAt: new Date('2024-07-20'),
      updatedAt: new Date('2024-07-20')
    },
    {
      id: mov5Id,
      tipo: 'despesa',
      valor: 3000.00, // 30% de 10000
      descricao: 'Saldo - CRT-INT - Buenos Aires - Ricardo Almeida',
      categoria: 'FRETE',
      data: new Date('2024-07-30'),
      status: 'pendente',
      parceiroId: parceiro3Id,
      cargaId: carga3Id,
      isPago: false,
      createdAt: new Date('2024-07-20'),
      updatedAt: new Date('2024-07-20')
    },
    {
      id: mov6Id,
      tipo: 'despesa',
      valor: 500.00, // Diárias
      descricao: 'Diárias - CRT-INT - Buenos Aires - Ricardo Almeida',
      categoria: 'DIARIA',
      data: new Date('2024-07-20'),
      status: 'pendente',
      parceiroId: parceiro3Id,
      cargaId: carga3Id,
      isPago: false,
      createdAt: new Date('2024-07-20'),
      updatedAt: new Date('2024-07-20')
    },
    {
      id: mov7Id,
      tipo: 'despesa',
      valor: 200.00, // Despesas Adicionais
      descricao: 'Despesas Adicionais - CRT-INT - Buenos Aires - Ricardo Almeida',
      categoria: 'OUTRAS DESPESAS',
      data: new Date('2024-07-20'),
      status: 'pendente',
      parceiroId: parceiro3Id,
      cargaId: carga3Id,
      isPago: false,
      createdAt: new Date('2024-07-20'),
      updatedAt: new Date('2024-07-20')
    }
  ]

  // Demo cargas
  const demoCargas: Carga[] = [
    {
      id: carga1Id,
      descricao: 'Produtos eletrônicos',
      origem: 'São Paulo - SP',
      destino: 'Rio de Janeiro - RJ',
      peso: 5.0, // 5 toneladas
      valor: 25000.00,
      dataColeta: new Date('2024-01-15'),
      dataEntrega: new Date('2024-01-16'),
      status: 'entregue',
      parceiroId: parceiro1Id,
      motoristaId: motorista1Id,
      veiculoId: veiculo1Id,
      crt: 'BR722',
      createdAt: new Date('2024-01-14'),
      updatedAt: new Date('2024-01-16')
    },
    {
      id: carga2Id,
      descricao: 'Materiais de construção',
      origem: 'São Paulo - SP',
      destino: 'Campinas - SP',
      peso: 3.2, // 3.2 toneladas
      valor: 8500.00,
      dataColeta: new Date('2024-01-22'),
      dataEntrega: new Date('2024-01-22'),
      status: 'em_transito',
      parceiroId: parceiro2Id,
      motoristaId: parceiro2Id, // Parceiro PF que é motorista
      veiculoId: veiculo2Id,
      crt: 'BR723',
      createdAt: new Date('2024-01-21'),
      updatedAt: new Date('2024-01-22')
    },
    // Carga Internacional completa para teste de contrato
    {
      id: carga3Id,
      descricao: 'Carga de Exportação para Argentina',
      origem: 'Porto Alegre - RS',
      destino: 'Buenos Aires', // Destino Internacional
      peso: 25.5, // 25.5 toneladas
      valor: 10000.00, // Valor base do frete
      dataColeta: new Date('2024-07-20'),
      dataEntrega: new Date('2024-07-25'),
      status: 'em_transito',
      clienteId: cliente3Id,
      parceiroId: parceiro3Id,
      motoristaId: motorista2Id,
      veiculoId: veiculo3Id,
      carretasSelecionadas: [carreta1Id],
      crt: 'CRT-INT',
      observacoes: 'Carga de alto valor, requer atenção especial na fronteira.',
      createdAt: new Date('2024-07-19'),
      updatedAt: new Date('2024-07-20')
    }
  ]
  
  // Demo contratos (vazio inicialmente)
  const demoContratos: ContratoFrete[] = [
    {
      id: contrato1Id,
      cargaId: carga3Id,
      pdfUrl: 'CONTRATO DE FRETE BASTOS.pdf', // Usando o arquivo de exemplo como URL simulada
      motoristaNome: 'Ricardo Almeida',
      parceiroNome: 'Transportes Internacionais LTDA',
      crt: 'CRT-INT',
      createdAt: new Date('2024-07-25'),
      updatedAt: new Date('2024-07-25')
    }
  ]

  return {
    clientes: demoClientes,
    parceiros: demoParceiros,
    motoristas: demoMotoristas,
    veiculos: demoVeiculos,
    movimentacoes: demoMovimentacoes,
    cargas: demoCargas,
    contratos: demoContratos,
    permissoes: demoPermissoes
  }
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth() // Necessário para obter o userId
  
  // A lista de usuários será sempre vazia, pois a gestão é feita pelo Supabase
  const [users] = useState<User[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoFinanceira[]>([])
  const [cargas, setCargas] = useState<Carga[]>([])
  const [contratos, setContratos] = useState<ContratoFrete[]>([]) // Novo estado para contratos
  const [permissoes, setPermissoes] = useState<PermissoInternacional[]>([]) // NOVO: Estado para Permisso
  const [isSynced, setIsSynced] = useState(false); // NOVO: Estado para rastrear sincronização
  const [isSyncing, setIsSyncing] = useState(false); // NOVO: Estado para rastrear sincronização em andamento

  // Utility function to generate IDs
  const generateId = generateUuid // Usando o novo gerador de UUID

  // Função para carregar dados do localStorage ou inicializar com demo data
  const loadData = useCallback(() => {
    const savedClientes = localStorage.getItem('absolut_clientes')
    const savedParceiros = localStorage.getItem('absolut_parceiros')
    const savedMotoristas = localStorage.getItem('absolut_motoristas')
    const savedVeiculos = localStorage.getItem('absolut_veiculos')
    const savedMovimentacoes = localStorage.getItem('absolut_movimentacoes')
    const savedCargas = localStorage.getItem('absolut_cargas')
    const savedContratos = localStorage.getItem('absolut_contratos')
    const savedPermissoes = localStorage.getItem('absolut_permissoes')
    const savedSyncStatus = localStorage.getItem('absolut_synced')

    // Se não houver dados salvos, inicializa com dados de demonstração
    if (!savedParceiros || !savedClientes) {
      const demoData = initializeDemoData()
      setClientes(demoData.clientes)
      setParceiros(demoData.parceiros)
      setMotoristas(demoData.motoristas)
      setVeiculos(demoData.veiculos.map(v => ({
          ...v,
          permisso: demoData.permissoes.find(p => p.veiculoId === v.id)
      })))
      setMovimentacoes(demoData.movimentacoes)
      setCargas(demoData.cargas)
      setContratos(demoData.contratos)
      setPermissoes(demoData.permissoes)
    } else {
      // Load existing data and convert date strings back to Date objects
      
      const parsedClientes = JSON.parse(savedClientes || '[]').map((cliente: any) => ({
        ...cliente,
        createdAt: new Date(cliente.createdAt),
        updatedAt: new Date(cliente.updatedAt)
      }))
      
      const parsedParceiros = JSON.parse(savedParceiros || '[]').map((parceiro: any) => ({
        ...parceiro,
        createdAt: new Date(parceiro.createdAt),
        updatedAt: new Date(parceiro.updatedAt)
      }))
      
      const parsedMotoristas = JSON.parse(savedMotoristas || '[]').map((motorista: any) => ({
        ...motorista,
        validadeCnh: motorista.validadeCnh ? new Date(motorista.validadeCnh) : undefined,
        createdAt: new Date(motorista.createdAt),
        updatedAt: new Date(motorista.updatedAt)
      }))
      
      const parsedVeiculos = JSON.parse(savedVeiculos || '[]').map((veiculo: any) => ({
        ...veiculo,
        createdAt: new Date(veiculo.createdAt),
        updatedAt: new Date(veiculo.updatedAt)
      }))
      
      const parsedMovimentacoes = JSON.parse(savedMovimentacoes || '[]').map((mov: any) => ({
        ...mov,
        data: new Date(mov.data),
        dataPagamento: mov.dataPagamento ? new Date(mov.dataPagamento) : null,
        createdAt: new Date(mov.createdAt),
        updatedAt: new Date(mov.updatedAt)
      }))
      
      const parsedCargas = JSON.parse(savedCargas || '[]').map((carga: any) => ({
        ...carga,
        dataColeta: carga.dataColeta ? new Date(carga.dataColeta) : undefined,
        dataEntrega: carga.dataEntrega ? new Date(carga.dataEntrega) : undefined,
        createdAt: new Date(carga.createdAt),
        updatedAt: new Date(carga.updatedAt)
      }))
      
      const parsedContratos = JSON.parse(savedContratos || '[]').map((contrato: any) => ({
        ...contrato,
        createdAt: new Date(contrato.createdAt),
        updatedAt: new Date(contrato.updatedAt)
      }))
      
      const parsedPermissoes = JSON.parse(savedPermissoes || '[]').map((permisso: any) => ({
        ...permisso,
        dataConsulta: new Date(permisso.dataConsulta),
        createdAt: new Date(permisso.createdAt),
        updatedAt: new Date(permisso.updatedAt)
      }))

      setClientes(parsedClientes)
      setParceiros(parsedParceiros)
      setMotoristas(parsedMotoristas)
      setMovimentacoes(parsedMovimentacoes)
      setCargas(parsedCargas)
      setContratos(parsedContratos)
      setPermissoes(parsedPermissoes)
      
      // Atualiza veículos com permisso
      const veiculosWithPermisso = parsedVeiculos.map((v: Veiculo) => ({
          ...v,
          permisso: parsedPermissoes.find((p: PermissoInternacional) => p.veiculoId === v.id)
      }));
      setVeiculos(veiculosWithPermisso);
    }
    
    setIsSynced(savedSyncStatus === 'true');
  }, [])

  // Função para resetar dados de demonstração (NOVO)
  const resetDemoData = useCallback(() => {
    const demoData = initializeDemoData();
    setClientes(demoData.clientes);
    setParceiros(demoData.parceiros);
    setMotoristas(demoData.motoristas);
    setPermissoes(demoData.permissoes);
    setVeiculos(demoData.veiculos.map(v => ({
        ...v,
        permisso: demoData.permissoes.find(p => p.veiculoId === v.id)
    })));
    setMovimentacoes(demoData.movimentacoes);
    setCargas(demoData.cargas);
    setContratos(demoData.contratos);
    setIsSynced(false); // Reseta o status de sincronização
    
    // Limpa o localStorage para forçar o uso dos novos dados
    localStorage.removeItem('absolut_clientes');
    localStorage.removeItem('absolut_parceiros');
    localStorage.removeItem('absolut_motoristas');
    localStorage.removeItem('absolut_veiculos');
    localStorage.removeItem('absolut_movimentacoes');
    localStorage.removeItem('absolut_cargas');
    localStorage.removeItem('absolut_contratos');
    localStorage.removeItem('absolut_permissoes');
    localStorage.removeItem('absolut_synced');
    
    alert('Dados de demonstração resetados com sucesso!');
  }, []);
  
  // Função de sincronização para o Supabase
  const syncDemoDataToSupabase = useCallback(async (force = false) => {
    if (!supabase || !user) {
        console.error('Supabase ou usuário não estão prontos para sincronização.');
        return false;
    }
    if (isSynced && !force) {
        console.log('Sincronização já realizada. Use force=true para forçar.');
        return true;
    }
    
    setIsSyncing(true);
    console.log('Iniciando sincronização de dados de demonstração para o Supabase...');
    
    const userId = user.id;
    const now = new Date().toISOString();

    const syncTable = async (tableName: string, data: any[], mapFn: (item: any) => any) => {
      const payload = data.map(item => ({
        ...mapFn(item),
        user_id: userId,
        created_at: item.createdAt.toISOString(),
        updated_at: item.updatedAt.toISOString(),
      }));
      
      // Usamos upsert para garantir que os dados sejam inseridos ou atualizados
      const { error } = await supabase
        .from(tableName)
        .upsert(payload, { onConflict: 'id' }); 

      if (error) {
        console.error(`Erro ao sincronizar ${tableName}:`, error);
        return false;
      } else {
        console.log(`Sincronização de ${tableName} concluída: ${payload.length} registros.`);
        return true;
      }
    };

    try {
      // Sincronização sequencial
      const results = await Promise.all([
        syncTable('clientes', clientes, (c: Cliente) => ({
          id: c.id, tipo: c.tipo, nome: c.nome, documento: c.documento, email: c.email, telefone: c.telefone, endereco: c.endereco, cidade: c.cidade, estado: c.estado, cep: c.cep, observacoes: c.observacoes, is_active: c.isActive,
        })),
        syncTable('parceiros', parceiros, (p: Parceiro) => ({
          id: p.id, tipo: p.tipo, nome: p.nome, documento: p.documento, cnh: p.cnh, email: p.email, telefone: p.telefone, endereco: p.endereco, cidade: p.cidade, estado: p.estado, cep: p.cep, observacoes: p.observacoes, is_motorista: p.isMotorista, is_active: p.isActive,
        })),
        syncTable('motoristas', motoristas, (m: Motorista) => ({
          id: m.id, parceiro_id: m.parceiroId, nome: m.nome, cpf: m.cpf, cnh: m.cnh, categoria_cnh: m.categoriaCnh, validade_cnh: m.validadeCnh?.toISOString().split('T')[0], telefone: m.telefone, is_active: m.isActive,
        })),
        syncTable('permisso_internacional', permissoes, (p: PermissoInternacional) => ({
          id: p.id, veiculo_id: p.veiculoId, razao_social: p.razaoSocial, cnpj: p.cnpj, endereco_completo: p.enderecoCompleto, data_consulta: p.dataConsulta.toISOString(),
        })),
        syncTable('veiculos', veiculos, (v: Veiculo) => ({
          id: v.id, parceiro_id: v.parceiroId, placa: v.placa, placa_cavalo: v.placaCavalo, placa_carreta: v.placaCarreta, placa_carreta1: v.placaCarreta1, placa_carreta2: v.placaCarreta2, placa_dolly: v.placaDolly, modelo: v.modelo, fabricante: v.fabricante, ano: v.ano, capacidade: v.capacidade, chassis: v.chassis, carroceria: v.carroceria, tipo: v.tipo, quantidade_carretas: v.quantidadeCarretas, possui_dolly: v.possuiDolly, motorista_vinculado: v.motoristaVinculado, carretas_vinculadas: v.carretasVinculadas, is_active: v.isActive,
        })),
        syncTable('cargas', cargas, (c: Carga) => ({
          id: c.id, descricao: c.descricao, origem: c.origem, destino: c.destino, peso: c.peso, valor: c.valor, data_coleta: c.dataColeta?.toISOString().split('T')[0], data_entrega: c.dataEntrega?.toISOString().split('T')[0], status: c.status, cliente_id: c.clienteId, parceiro_id: c.parceiroId, motorista_id: c.motoristaId, veiculo_id: c.veiculoId, carretas_selecionadas: c.carretasSelecionadas, crt: c.crt, observacoes: c.observacoes,
        })),
        syncTable('movimentacoes_financeiras', movimentacoes, (m: MovimentacaoFinanceira) => ({
          id: m.id, tipo: m.tipo, valor: m.valor, descricao: m.descricao, categoria: m.categoria, data: m.data.toISOString().split('T')[0], status: m.status, data_pagamento: m.dataPagamento?.toISOString().split('T')[0], parceiro_id: m.parceiroId, carga_id: m.cargaId, is_pago: m.isPago, observacoes: m.observacoes,
        })),
        syncTable('contratos_frete', contratos, (c: ContratoFrete) => ({
          id: c.id, carga_id: c.cargaId, pdf_url: c.pdfUrl, motorista_nome: c.motoristaNome, parceiro_nome: c.parceiroNome, crt: c.crt,
        })),
      ]);

      const success = results.every(r => r === true);
      
      if (success) {
        setIsSynced(true);
        localStorage.setItem('absolut_synced', 'true');
        console.log('Sincronização de dados de demonstração concluída com sucesso!');
      } else {
        console.error('Sincronização falhou em uma ou mais tabelas.');
      }
      
      return success;
      
    } catch (error) {
      console.error('Falha crítica na sincronização de dados de demonstração:', error);
      return false;
    } finally {
        setIsSyncing(false);
    }
  }, [user, isSynced, clientes, parceiros, motoristas, veiculos, permissoes, cargas, movimentacoes, contratos]);

  // Load data from localStorage on mount
  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Efeito para sincronizar dados após o login
  useEffect(() => {
    if (isAuthenticated && user && !isSynced) {
      syncDemoDataToSupabase();
    }
  }, [isAuthenticated, user, isSynced, syncDemoDataToSupabase]);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('absolut_clientes', JSON.stringify(clientes))
  }, [clientes])

  useEffect(() => {
    localStorage.setItem('absolut_parceiros', JSON.stringify(parceiros))
  }, [parceiros])

  useEffect(() => {
    localStorage.setItem('absolut_motoristas', JSON.stringify(motoristas))
  }, [motoristas])

  useEffect(() => {
    // Salva veículos sem o objeto permisso aninhado para evitar duplicação
    const veiculosToSave = veiculos.map(v => {
        const { permisso, ...rest } = v;
        return rest;
    });
    localStorage.setItem('absolut_veiculos', JSON.stringify(veiculosToSave))
  }, [veiculos])

  useEffect(() => {
    localStorage.setItem('absolut_movimentacoes', JSON.stringify(movimentacoes))
  }, [movimentacoes])

  useEffect(() => {
    localStorage.setItem('absolut_cargas', JSON.stringify(cargas))
  }, [cargas])
  
  useEffect(() => {
    localStorage.setItem('absolut_contratos', JSON.stringify(contratos))
  }, [contratos])
  
  useEffect(() => {
    // Salva apenas os campos que existem no Supabase
    const permissoesToSave = permissoes.map(p => ({
        id: p.id,
        veiculoId: p.veiculoId,
        razaoSocial: p.razaoSocial,
        cnpj: p.cnpj,
        enderecoCompleto: p.enderecoCompleto,
        dataConsulta: p.dataConsulta,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    }));
    localStorage.setItem('absolut_permissoes', JSON.stringify(permissoesToSave))
    
    // Sincroniza permisso com veículos
    setVeiculos(prevVeiculos => prevVeiculos.map(v => ({
        ...v,
        permisso: permissoes.find(p => p.veiculoId === v.id)
    })));
  }, [permissoes])

  // Utility functions for Cargas/Financeiro synchronization

  const getMotoristaName = (motoristaId: string | undefined): string => {
    if (!motoristaId) return '';
    
    // 1. Tenta encontrar na lista de motoristas
    const motorista = motoristas.find(m => m.id === motoristaId);
    if (motorista) return motorista.nome;

    // 2. Tenta encontrar como parceiro PF que é motorista
    const parceiroMotorista = parceiros.find(p => p.id === motoristaId && p.tipo === 'PF' && p.isMotorista);
    if (parceiroMotorista) return parceiroMotorista.nome || '';

    return '';
  };

  const buildMovimentacaoDescription = useCallback((carga: Carga, prefix: 'Adto' | 'Saldo' | 'Frete'): string => {
    const localDisplay = carga.destino.toLowerCase() === 'internacional' 
      ? carga.destino 
      : carga.destino.includes(' - ') 
        ? carga.destino.split(' - ')[0] // Apenas a cidade
        : carga.destino; // Se for apenas a UF ou cidade/país

    const crtDisplay = carga.crt || carga.descricao || carga.id;
    
    const motoristaNome = getMotoristaName(carga.motoristaId);
    const motoristaSufixo = motoristaNome ? ` - ${motoristaNome}` : '';

    // Formato: "{Tipo} - {CRT} - {Cidade Destino} - {Motorista Vinculado}"
    return `${prefix} - ${crtDisplay} - ${localDisplay}${motoristaSufixo}`;
  }, [getMotoristaName]);

  // Função de sincronização refatorada para usar o estado atualizado
  const syncMovimentacoesForCarga = useCallback((cargaId: string, currentCargas: Carga[], currentMovimentacoes: MovimentacaoFinanceira[]) => {
    const carga = currentCargas.find(c => c.id === cargaId);
    if (!carga) return;

    setMovimentacoes(prevMovimentacoes => {
      return prevMovimentacoes.map(mov => {
        if (mov.cargaId === cargaId) {
          let prefix: 'Adto' | 'Saldo' | 'Frete';
          
          if (mov.descricao.startsWith('Adto')) {
            prefix = 'Adto';
          } else if (mov.descricao.startsWith('Saldo')) {
            prefix = 'Saldo';
          } else {
            prefix = 'Frete';
          }

          const newDescription = buildMovimentacaoDescription(carga, prefix);
          let newValor = carga.valor;
          
          // Lógica de Recálculo de Valor (Se for Adiantamento ou Saldo)
          if (prefix === 'Adto' || prefix === 'Saldo') {
            
            const relatedMovs = currentMovimentacoes.filter(m => m.cargaId === cargaId);
            const totalRelatedValue = relatedMovs.reduce((sum, m) => sum + m.valor, 0);
            
            if (relatedMovs.length > 1 && totalRelatedValue > 0) {
              // Se houver split, recalcula a proporção
              const proporcao = mov.valor / totalRelatedValue;
              
              // O novo valor da movimentação é a proporção aplicada ao novo valor da carga
              // (Assumindo que o valor da carga é o valor base para o split)
              newValor = carga.valor * proporcao;
            } else {
              // Fallback: Se não for possível calcular a proporção, usa o valor total da carga
              // (Isso pode ser impreciso se a integração original incluiu extras)
              newValor = carga.valor;
            }
          } else {
            // Se for Frete (sem split), o valor é o valor total da carga
            newValor = carga.valor;
          }

          // Atualiza descrição, valor e updatedAt
          return {
            ...mov,
            descricao: newDescription,
            valor: newValor, // Atualiza o valor
            updatedAt: new Date()
          };
        }
        return mov;
      });
    });
  }, [buildMovimentacaoDescription]); // Dependências: buildMovimentacaoDescription

  const deleteMovimentacoesByCargaId = (cargaId: string): void => {
    setMovimentacoes(prev => prev.filter(mov => mov.cargaId !== cargaId));
  };

  // Cliente operations
  const createCliente = (clienteData: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>): Cliente => {
    const newCliente: Cliente = {
      ...clienteData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setClientes(prev => [...prev, newCliente])
    return newCliente
  }

  const updateCliente = (id: string, clienteData: Partial<Cliente>): Cliente | null => {
    setClientes(prev => prev.map(cliente => 
      cliente.id === id 
        ? { ...cliente, ...clienteData, updatedAt: new Date() }
        : cliente
    ))
    return getClienteById(id)
  }

  const deleteCliente = (id: string): boolean => {
    setClientes(prev => prev.filter(cliente => cliente.id !== id))
    return true
  }

  const getClienteById = (id: string): Cliente | null => {
    return clientes.find(cliente => cliente.id === id) || null
  }

  // User operations (Mantidas, mas operam em um array vazio)
  const createUser = (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
    console.warn("DatabaseContext: createUser chamado. A gestão de usuários deve ser feita via Supabase.");
    const newUser: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    // setUsers(prev => [...prev, newUser]) // Não adiciona ao estado local
    return newUser
  }

  const updateUser = (_id: string, _userData: Partial<User>): User | null => {
    console.warn("DatabaseContext: updateUser chamado. A gestão de usuários deve ser feita via Supabase.");
    // setUsers(prev => prev.map(user => // Não atualiza o estado local
    //   user.id === id 
    //     ? { ...user, ...userData, updatedAt: new Date() }
    //     : user
    // ))
    return getUserById(_id)
  }

  const deleteUser = (_id: string): boolean => {
    console.warn("DatabaseContext: deleteUser chamado. A gestão de usuários deve ser feita via Supabase.");
    // setUsers(prev => prev.filter(user => user.id !== id)) // Não deleta do estado local
    return true
  }

  const getUserById = (_id: string): User | null => {
    // Retorna null, pois os usuários não estão mais no estado local
    return null
  }

  // Parceiro operations
  const createParceiro = (parceiroData: Omit<Parceiro, 'id' | 'createdAt' | 'updatedAt'>): Parceiro => {
    const newParceiro: Parceiro = {
      ...parceiroData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setParceiros(prev => [...prev, newParceiro])
    return newParceiro
  }

  const updateParceiro = (id: string, parceiroData: Partial<Parceiro>): Parceiro | null => {
    setParceiros(prev => prev.map(parceiro => 
      parceiro.id === id 
        ? { ...parceiro, ...parceiroData, updatedAt: new Date() }
        : parceiro
    ))
    // Nota: A sincronização de cargas/movimentações será feita no useEffect abaixo
    return getParceiroById(id)
  }

  const deleteParceiro = (id: string): boolean => {
    setParceiros(prev => prev.filter(parceiro => parceiro.id !== id))
    // Also delete related motoristas and veiculos
    setMotoristas(prev => prev.filter(motorista => motorista.parceiroId !== id))
    setVeiculos(prev => prev.filter(veiculo => veiculo.parceiroId !== id))
    return true
  }

  const getParceiroById = (id: string): Parceiro | null => {
    return parceiros.find(parceiro => parceiro.id === id) || null
  }

  // Motorista operations
  const createMotorista = (motoristaData: Omit<Motorista, 'id' | 'createdAt' | 'updatedAt'>): Motorista => {
    const newMotorista: Motorista = {
      ...motoristaData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setMotoristas(prev => [...prev, newMotorista])
    return newMotorista
  }

  const updateMotorista = (id: string, motoristaData: Partial<Motorista>): Motorista | null => {
    setMotoristas(prev => prev.map(motorista => 
      motorista.id === id 
        ? { ...motorista, ...motoristaData, updatedAt: new Date() }
        : motorista
    ))
    // Nota: A sincronização de cargas/movimentações será feita no useEffect abaixo
    return motoristas.find(m => m.id === id) || null
  }

  const deleteMotorista = (id: string): boolean => {
    setMotoristas(prev => prev.filter(motorista => motorista.id !== id))
    return true
  }

  const getMotoristasByParceiro = (parceiroId: string): Motorista[] => {
    return motoristas.filter(motorista => motorista.parceiroId === parceiroId)
  }

  // Veiculo operations
  const createVeiculo = (veiculoData: Omit<Veiculo, 'id' | 'createdAt' | 'updatedAt'>): Veiculo => {
    const newVeiculo: Veiculo = {
      ...veiculoData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setVeiculos(prev => [...prev, newVeiculo])
    return newVeiculo
  }

  const updateVeiculo = (id: string, veiculoData: Partial<Veiculo>): Veiculo | null => {
    let updatedVeiculo: Veiculo | null = null;
    setVeiculos(prev => prev.map(veiculo => {
      if (veiculo.id === id) {
        updatedVeiculo = { ...veiculo, ...veiculoData, updatedAt: new Date() };
        return updatedVeiculo;
      }
      return veiculo;
    }));
    return updatedVeiculo;
  }

  const deleteVeiculo = (id: string): boolean => {
    setVeiculos(prev => prev.filter(veiculo => veiculo.id !== id))
    setPermissoes(prev => prev.filter(permisso => permisso.veiculoId !== id)) // Deleta permisso associado
    return true
  }

  const getVeiculosByParceiro = (parceiroId: string): Veiculo[] => {
    return veiculos.filter(veiculo => veiculo.parceiroId === parceiroId)
  }
  
  // Permisso Operations (NOVO)
  const createPermisso = (permissoData: Omit<PermissoInternacional, 'id' | 'createdAt' | 'updatedAt' | 'dataConsulta'>, veiculoId: string): PermissoInternacional => {
    const newPermisso: PermissoInternacional = {
      ...permissoData,
      id: generateId(),
      veiculoId: veiculoId,
      dataConsulta: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setPermissoes(prev => [...prev, newPermisso])
    return newPermisso
  }

  const updatePermisso = (id: string, permissoData: Partial<PermissoInternacional>): PermissoInternacional | null => {
    let updatedPermisso: PermissoInternacional | null = null;
    setPermissoes(prev => prev.map(permisso => {
      if (permisso.id === id) {
        updatedPermisso = { 
          ...permisso, 
          ...permissoData, 
          updatedAt: new Date(), 
          dataConsulta: new Date() 
        };
        return updatedPermisso;
      }
      return permisso;
    }));
    return updatedPermisso;
  }
  
  const getPermissoByVeiculoId = (veiculoId: string): PermissoInternacional | null => {
    return permissoes.find(p => p.veiculoId === veiculoId) || null;
  }

  // Movimentacao operations
  const createMovimentacao = (movimentacaoData: Omit<MovimentacaoFinanceira, 'id' | 'createdAt' | 'updatedAt'>): MovimentacaoFinanceira => {
    const newMovimentacao: MovimentacaoFinanceira = {
      ...movimentacaoData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setMovimentacoes(prev => [...prev, newMovimentacao])
    return newMovimentacao
  }

  const updateMovimentacao = (id: string, movimentacaoData: Partial<MovimentacaoFinanceira>): MovimentacaoFinanceira | null => {
    setMovimentacoes(prev => prev.map(movimentacao => 
      movimentacao.id === id 
        ? { ...movimentacao, ...movimentacaoData, updatedAt: new Date() }
        : movimentacao
    ))
    return movimentacoes.find(m => m.id === id) || null
  }

  const deleteMovimentacao = (id: string): boolean => {
    setMovimentacoes(prev => prev.filter(movimentacao => movimentacao.id !== id))
    return true
  }

  // Carga operations
  const createCarga = (cargaData: Omit<Carga, 'id' | 'createdAt' | 'updatedAt'>): Carga => {
    const newCarga: Carga = {
      ...cargaData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setCargas(prev => [...prev, newCarga])
    return newCarga
  }

  const updateCarga = (id: string, cargaData: Partial<Carga>): Carga | null => {
    let updatedCarga: Carga | null = null;
    
    setCargas(prev => prev.map(carga => {
      if (carga.id === id) {
        updatedCarga = { ...carga, ...cargaData, updatedAt: new Date() };
        return updatedCarga;
      }
      return carga;
    }));

    // Se a carga foi atualizada e possui movimentações financeiras, sincroniza a descrição e o valor
    if (updatedCarga) {
      // Chamamos a sincronização no useEffect, mas se quisermos garantir a atualização imediata
      // para o próximo render, podemos chamar aqui, mas o useEffect já cobre isso.
      // syncMovimentacoesForCarga(id, cargas, movimentacoes); // Removido para evitar estado obsoleto
    }
    
    return updatedCarga;
  }

  const deleteCarga = (id: string): boolean => {
    // 1. Exclui as movimentações financeiras associadas
    deleteMovimentacoesByCargaId(id);
    
    // 2. Exclui a carga
    setCargas(prev => prev.filter(carga => carga.id !== id))
    
    // 3. Exclui o contrato associado (se existir)
    setContratos(prev => prev.filter(contrato => contrato.cargaId !== id))
    
    return true
  }

  // Contrato Operations
  const getContracts = useCallback(async (): Promise<ContratoFrete[]> => {
    if (!supabase || !user) {
      // Retorna dados mockados/locais se Supabase não estiver pronto
      return contratos;
    }
    
    // Em uma aplicação real, buscaríamos do Supabase
    try {
      const { data, error } = await supabase
        .from('contratos_frete')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Mapeia datas de volta para objetos Date
      const fetchedContratos: ContratoFrete[] = data.map(c => ({
        ...c,
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at)
      }));
      
      setContratos(fetchedContratos);
      return fetchedContratos;
      
    } catch (error) {
      console.error('Erro ao buscar contratos do Supabase. Retornando dados locais:', error);
      // Fallback para dados locais em caso de erro de API
      return contratos;
    }
  }, [contratos, user]);

  const generateContract = useCallback(async (cargaId: string) => {
    if (!supabase || !user) {
      alert('Erro: Supabase não está pronto ou usuário não autenticado.');
      return;
    }
    
    const projectRef = 'qoeocxprlioianbordjt'; // Supabase Project ID
    const edgeFunctionUrl = `https://${projectRef}.supabase.co/functions/v1/generate-contract`;
    
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ cargaId, userId: user.id }),
      });
      
      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Falha ao gerar contrato na Edge Function.');
      }
      
      // Após a geração bem-sucedida, atualiza a lista de contratos
      await getContracts();
      
      alert(`Contrato gerado/regenerado com sucesso! URL: ${result.pdfUrl}`);
      
    } catch (error) {
      console.error('Erro na geração do contrato:', error);
      alert(`Erro ao gerar contrato: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, [user, getContracts]);


  // Efeito para sincronizar Movimentações Financeiras sempre que Cargas ou Motoristas/Parceiros mudarem
  useEffect(() => {
    const cargaIdsToSync = new Set<string>();

    // Identifica todas as cargas que possuem movimentações
    movimentacoes.forEach(mov => {
      if (mov.cargaId) {
        cargaIdsToSync.add(mov.cargaId);
      }
    });
    
    if (cargaIdsToSync.size > 0) {
      // Passa o estado atual para a função de sincronização
      const currentCargas = [...cargas];
      const currentMovimentacoes = [...movimentacoes];
      
      cargaIdsToSync.forEach(cargaId => {
        syncMovimentacoesForCarga(cargaId, currentCargas, currentMovimentacoes);
      });
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargas, motoristas, parceiros]); // Depende de cargas, motoristas e parceiros para capturar mudanças de nome/vínculo

  // Efeito para carregar dados na inicialização
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Efeito para carregar contratos na autenticação
  useEffect(() => {
    if (user) {
        getContracts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); 

  const value: DatabaseContextType = {
    users,
    clientes,
    parceiros,
    motoristas,
    veiculos,
    movimentacoes,
    cargas,
    contratos, // Novo
    createCliente,
    updateCliente,
    deleteCliente,
    getClienteById,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    createParceiro,
    updateParceiro,
    deleteParceiro,
    getParceiroById,
    createMotorista,
    updateMotorista,
    deleteMotorista,
    getMotoristasByParceiro,
    createVeiculo,
    updateVeiculo,
    deleteVeiculo,
    getVeiculosByParceiro,
    createPermisso, // NOVO
    updatePermisso, // NOVO
    getPermissoByVeiculoId, // NOVO
    createMovimentacao,
    updateMovimentacao,
    deleteMovimentacao,
    createCarga,
    updateCarga,
    deleteCarga,
    // Contrato functions
    generateContract,
    getContracts,
    // Utility functions
    getMotoristaName,
    buildMovimentacaoDescription,
    syncMovimentacoesForCarga: (cargaId: string) => syncMovimentacoesForCarga(cargaId, cargas, movimentacoes), // Wrapper para o hook
    resetDemoData, // NOVO: Exporta a função de reset
    // Sincronização
    syncDemoDataToSupabase: syncDemoDataToSupabase as any, // Exporta a função de sincronização
    isSynced,
    isSyncing,
  }

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  )
}