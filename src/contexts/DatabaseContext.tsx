import React, { createContext, useContext, useState, useEffect } from 'react'
import { DatabaseContextType, User, Cliente, Parceiro, Motorista, Veiculo, MovimentacaoFinanceira, Carga } from '../types'


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

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  // A lista de usuários será sempre vazia, pois a gestão é feita pelo Supabase
  const [users, setUsers] = useState<User[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoFinanceira[]>([])
  const [cargas, setCargas] = useState<Carga[]>([])

  // Initialize demo data (excluding users)
  const initializeDemoData = () => {
    // Demo clientes
    const demoClientes: Cliente[] = [
      {
        id: 'cliente-1',
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
        id: 'cliente-2',
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
      }
    ]

    // Demo parceiros
    const demoParceiros: Parceiro[] = [
      {
        id: 'parceiro-1',
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
        id: 'parceiro-2',
        nome: 'Carlos Oliveira',
        tipo: 'PF',
        documento: '123.456.789-01',
        email: 'carlos@email.com',
        telefone: '(11) 9876-5432',
        endereco: 'Av. Paulista, 456',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '04567-890',
        isActive: true,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20')
      }
    ]

    // Demo motoristas
    const demoMotoristas: Motorista[] = [
      {
        id: 'motorista-1',
        parceiroId: 'parceiro-1',
        nome: 'José da Silva',
        cpf: '98765432100',
        cnh: '12345678901',
        categoriaCnh: 'D',
        validadeCnh: new Date('2025-12-31'),
        telefone: '(11) 9999-8888',
        isActive: true,
        createdAt: new Date('2024-01-12'),
        updatedAt: new Date('2024-01-12')
      },
      {
        id: 'motorista-2',
        parceiroId: 'parceiro-2',
        nome: 'Carlos Oliveira',
        cpf: '12345678901',
        cnh: '98765432109',
        categoriaCnh: 'C',
        validadeCnh: new Date('2025-06-30'),
        telefone: '(11) 9876-5432',
        isActive: true,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20')
      }
    ]

    // Demo veículos
    const demoVeiculos: Veiculo[] = [
      {
        id: 'veiculo-1',
        parceiroId: 'parceiro-1',
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
        id: 'veiculo-2',
        parceiroId: 'parceiro-2',
        placa: 'XYZ5678',
        fabricante: 'Ford',
        modelo: 'Cargo 816',
        ano: 2019,
        capacidade: 3500,
        tipo: 'Truck',
        isActive: true,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20')
      }
    ]

    // Demo movimentações financeiras
    const demoMovimentacoes: MovimentacaoFinanceira[] = [
      {
        id: 'mov-1',
        tipo: 'receita',
        valor: 2500.00,
        descricao: 'Frete São Paulo - Rio de Janeiro',
        categoria: 'frete',
        data: new Date('2024-01-15'),
        status: 'pago',
        parceiroId: 'parceiro-1',
        cargaId: 'carga-1',
        isPago: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: 'mov-2',
        tipo: 'despesa',
        valor: 350.00,
        descricao: 'Combustível',
        categoria: 'combustivel',
        data: new Date('2024-01-16'),
        status: 'pago',
        parceiroId: 'parceiro-1',
        isPago: true,
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16')
      },
      {
        id: 'mov-3',
        tipo: 'receita',
        valor: 1800.00,
        descricao: 'Frete local - entrega de materiais',
        categoria: 'frete',
        data: new Date('2024-01-22'),
        status: 'pendente',
        parceiroId: 'parceiro-2',
        cargaId: 'carga-2',
        isPago: false,
        createdAt: new Date('2024-01-22'),
        updatedAt: new Date('2024-01-22')
      }
    ]

    // Demo cargas
    const demoCargas: Carga[] = [
      {
        id: 'carga-1',
        descricao: 'Produtos eletrônicos',
        origem: 'São Paulo - SP',
        destino: 'Rio de Janeiro - RJ',
        peso: 5000,
        valor: 25000.00,
        dataColeta: new Date('2024-01-15'),
        dataEntrega: new Date('2024-01-16'),
        status: 'entregue',
        parceiroId: 'parceiro-1',
        motoristaId: 'motorista-1',
        veiculoId: 'veiculo-1',
        createdAt: new Date('2024-01-14'),
        updatedAt: new Date('2024-01-16')
      },
      {
        id: 'carga-2',
        descricao: 'Materiais de construção',
        origem: 'São Paulo - SP',
        destino: 'Campinas - SP',
        peso: 3200,
        valor: 8500.00,
        dataColeta: new Date('2024-01-22'),
        dataEntrega: new Date('2024-01-22'),
        status: 'em_transito',
        parceiroId: 'parceiro-2',
        motoristaId: 'motorista-2',
        veiculoId: 'veiculo-2',
        createdAt: new Date('2024-01-21'),
        updatedAt: new Date('2024-01-22')
      }
    ]

    return {
      clientes: demoClientes,
      parceiros: demoParceiros,
      motoristas: demoMotoristas,
      veiculos: demoVeiculos,
      movimentacoes: demoMovimentacoes,
      cargas: demoCargas
    }
  }

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      // const savedUsers = localStorage.getItem('absolut_users') // REMOVIDO
      const savedClientes = localStorage.getItem('absolut_clientes')
      const savedParceiros = localStorage.getItem('absolut_parceiros')
      const savedMotoristas = localStorage.getItem('absolut_motoristas')
      const savedVeiculos = localStorage.getItem('absolut_veiculos')
      const savedMovimentacoes = localStorage.getItem('absolut_movimentacoes')
      const savedCargas = localStorage.getItem('absolut_cargas')

      // If no data exists, initialize with demo data
      if (!savedParceiros || !savedClientes) {
        const demoData = initializeDemoData()
        // setUsers([]) // Usuários sempre vazios
        setClientes(demoData.clientes)
        setParceiros(demoData.parceiros)
        setMotoristas(demoData.motoristas)
        setVeiculos(demoData.veiculos)
        setMovimentacoes(demoData.movimentacoes)
        setCargas(demoData.cargas)
      } else {
        // Load existing data and convert date strings back to Date objects
        
        // const parsedUsers = JSON.parse(savedUsers || '[]').map((user: any) => ({ // REMOVIDO
        //   ...user,
        //   createdAt: new Date(user.createdAt),
        //   updatedAt: new Date(user.updatedAt)
        // }))

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
          validadeCnh: new Date(motorista.validadeCnh),
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
          createdAt: new Date(mov.createdAt),
          updatedAt: new Date(mov.updatedAt)
        }))
        
        const parsedCargas = JSON.parse(savedCargas || '[]').map((carga: any) => ({
          ...carga,
          dataColeta: new Date(carga.dataColeta),
          dataEntrega: new Date(carga.dataEntrega),
          createdAt: new Date(carga.createdAt),
          updatedAt: new Date(carga.updatedAt)
        }))
        
        // setUsers(parsedUsers) // REMOVIDO
        setClientes(parsedClientes)
        setParceiros(parsedParceiros)
        setMotoristas(parsedMotoristas)
        setVeiculos(parsedVeiculos)
        setMovimentacoes(parsedMovimentacoes)
        setCargas(parsedCargas)
      }
    }

    loadData()
  }, [])

  // Save data to localStorage whenever state changes
  // useEffect(() => { // REMOVIDO
  //   localStorage.setItem('absolut_users', JSON.stringify(users))
  // }, [users])

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
    localStorage.setItem('absolut_veiculos', JSON.stringify(veiculos))
  }, [veiculos])

  useEffect(() => {
    localStorage.setItem('absolut_movimentacoes', JSON.stringify(movimentacoes))
  }, [movimentacoes])

  useEffect(() => {
    localStorage.setItem('absolut_cargas', JSON.stringify(cargas))
  }, [cargas])

  // Utility function to generate IDs
  const generateId = () => Math.random().toString(36).substr(2, 9)

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

  const updateUser = (id: string, userData: Partial<User>): User | null => {
    console.warn("DatabaseContext: updateUser chamado. A gestão de usuários deve ser feita via Supabase.");
    // setUsers(prev => prev.map(user => // Não atualiza o estado local
    //   user.id === id 
    //     ? { ...user, ...userData, updatedAt: new Date() }
    //     : user
    // ))
    return getUserById(id)
  }

  const deleteUser = (id: string): boolean => {
    console.warn("DatabaseContext: deleteUser chamado. A gestão de usuários deve ser feita via Supabase.");
    // setUsers(prev => prev.filter(user => user.id !== id)) // Não deleta do estado local
    return true
  }

  const getUserById = (id: string): User | null => {
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
    setVeiculos(prev => prev.map(veiculo => 
      veiculo.id === id 
        ? { ...veiculo, ...veiculoData, updatedAt: new Date() }
        : veiculo
    ))
    return veiculos.find(v => v.id === id) || null
  }

  const deleteVeiculo = (id: string): boolean => {
    setVeiculos(prev => prev.filter(veiculo => veiculo.id !== id))
    return true
  }

  const getVeiculosByParceiro = (parceiroId: string): Veiculo[] => {
    return veiculos.filter(veiculo => veiculo.parceiroId === parceiroId)
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
    setCargas(prev => prev.map(carga => 
      carga.id === id 
        ? { ...carga, ...cargaData, updatedAt: new Date() }
        : carga
    ))
    return cargas.find(c => c.id === id) || null
  }

  const deleteCarga = (id: string): boolean => {
    setCargas(prev => prev.filter(carga => carga.id !== id))
    return true
  }

  const value: DatabaseContextType = {
    users,
    clientes,
    parceiros,
    motoristas,
    veiculos,
    movimentacoes,
    cargas,
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
    createMovimentacao,
    updateMovimentacao,
    deleteMovimentacao,
    createCarga,
    updateCarga,
    deleteCarga
  }

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  )
}