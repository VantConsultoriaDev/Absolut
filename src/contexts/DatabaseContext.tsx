import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { DatabaseContextType, User, Cliente, Parceiro, Motorista, Veiculo, MovimentacaoFinanceira, Carga, ContratoFrete, PermissoInternacional } from '../types'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { parseDocument } from '../utils/formatters'
import { undoService, UndoAction } from '../services/undoService'
import { showError } from '../utils/toast' // Removido showSuccess
import { 
  normalizeClienteCreate, normalizeParceiroCreate, normalizeMotoristaCreate, normalizeVeiculoCreate, 
  normalizeCargaCreate, normalizePermissoCreate, applyUpdateCliente, applyUpdateParceiro, 
  applyUpdateMotorista, applyUpdateVeiculo, applyUpdateCarga, applyUpdatePermisso 
} from '../services/dataNormalizers'
import { 
  uploadAvatar, deleteAvatar, deleteComprovante, uploadComprovante 
} from '../services/supabaseStorage'
import { syncActionToSupabase, pullSupabaseData as pullSupabaseDataService } from '../services/supabaseSync'

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

export const useDatabase = () => {
  const context = useContext(DatabaseContext)
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider')
  }
  return context
}

// Função para gerar IDs no formato UUID simulado
const generateUuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Função auxiliar para salvar no localStorage
const saveToLocalStorage = (key: string, data: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage`, e);
  }
};

// Função para inicializar dados de demonstração
export const initializeDemoData = () => {
  // Tenta carregar do localStorage, se não houver, usa array vazio
  const loadFromStorage = (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item).map((d: any) => ({
        ...d,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
        updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
        // Conversões específicas para datas
        data: d.data ? new Date(d.data) : undefined,
        dataColeta: d.dataColeta ? new Date(d.dataColeta) : undefined,
        dataEntrega: d.dataEntrega ? new Date(d.dataEntrega) : undefined,
        dataPagamento: d.dataPagamento ? new Date(d.dataPagamento) : null,
        validadeCnh: d.validadeCnh ? new Date(d.validadeCnh) : undefined,
        dataConsulta: d.dataConsulta ? new Date(d.dataConsulta) : undefined,
      })) : [];
    } catch (e) {
      console.error(`Failed to load ${key} from localStorage`, e);
      return [];
    }
  };
  
  return {
    clientes: loadFromStorage('clientes'),
    parceiros: loadFromStorage('parceiros'),
    motoristas: loadFromStorage('motoristas'),
    veiculos: loadFromStorage('veiculos'),
    movimentacoes: loadFromStorage('movimentacoes'),
    cargas: loadFromStorage('cargas'),
    contratos: loadFromStorage('contratos'),
    permissoes: loadFromStorage('permissoes') // NOVO: Carregando permissoes
  }
}

// Helper function to split a large load into multiple smaller loads
const splitCarga = (cargaData: Omit<Carga, 'id' | 'createdAt' | 'updatedAt'>): Omit<Carga, 'id' | 'createdAt' | 'updatedAt'>[] => {
    const MAX_WEIGHT = 30;
    const totalWeight = cargaData.peso;
    
    // Se o peso for inválido ou menor/igual ao limite, retorna a carga original
    if (isNaN(totalWeight) || totalWeight <= MAX_WEIGHT) {
        return [cargaData];
    }

    // 1. Calculate number of required loads (N)
    const N = Math.ceil(totalWeight / MAX_WEIGHT);
    
    // 2. Calculate base weight and value per load
    const baseWeight = totalWeight / N;
    const baseValue = cargaData.valor / N;
    
    const splitCargas: Omit<Carga, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Função de arredondamento para 2 casas decimais
    const round = (num: number) => Math.round(num * 100) / 100;
    
    let remainingWeight = totalWeight;
    let remainingValue = cargaData.valor;
    
    for (let i = 0; i < N; i++) {
        let currentWeight: number;
        let currentValue: number;
        
        if (i === N - 1) {
            // Última carga pega o restante para garantir que a soma seja exata
            currentWeight = round(remainingWeight);
            currentValue = round(remainingValue);
        } else {
            currentWeight = round(baseWeight);
            currentValue = round(baseValue);
            
            remainingWeight = round(remainingWeight - currentWeight);
            remainingValue = round(remainingValue - currentValue);
        }
        
        // Gera o sufixo do CRT
        const originalCrt = cargaData.crt || 'CARGA';
        const newCrt = `${originalCrt}-${i + 1}/${N}`;
        
        // Os dados que devem ser idênticos são copiados diretamente
        const newCarga: Omit<Carga, 'id' | 'createdAt' | 'updatedAt'> = {
            ...cargaData,
            crt: newCrt,
            peso: currentWeight,
            valor: currentValue,
            // Garante que a descrição reflita a divisão
            descricao: `${cargaData.descricao} (${i + 1}/${N})`,
            // O trajeto original é copiado, mas o valor e peso são atualizados
            trajetos: cargaData.trajetos.map(t => ({
                ...t,
                valor: currentValue, // Assume que o valor do trajeto é o valor da carga dividida
            }))
        };
        
        splitCargas.push(newCarga);
    }
    
    return splitCargas;
};

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const { user } = useAuth()
  
  const demoData = initializeDemoData();
  
  const [users] = useState<User[]>([])
  const [clientes, setClientes] = useState<Cliente[]>(demoData.clientes)
  const [parceiros, setParceiros] = useState<Parceiro[]>(demoData.parceiros)
  const [motoristas, setMotoristas] = useState<Motorista[]>(demoData.motoristas)
  const [veiculos, setVeiculos] = useState<Veiculo[]>(demoData.veiculos)
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoFinanceira[]>(demoData.movimentacoes)
  const [cargas, setCargas] = useState<Carga[]>(demoData.cargas)
  const [contratos, setContratos] = useState<ContratoFrete[]>(demoData.contratos)
  const [permissoes, setPermissoes] = useState<PermissoInternacional[]>(demoData.permissoes) // NOVO
  const [isSynced, setIsSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const generateId = generateUuid

  // --- PERSISTÊNCIA LOCAL (localStorage) ---
  useEffect(() => { saveToLocalStorage('clientes', clientes); }, [clientes]);
  useEffect(() => { saveToLocalStorage('parceiros', parceiros); }, [parceiros]);
  useEffect(() => { saveToLocalStorage('motoristas', motoristas); }, [motoristas]);
  useEffect(() => { saveToLocalStorage('veiculos', veiculos); }, [veiculos]);
  useEffect(() => { saveToLocalStorage('movimentacoes', movimentacoes); }, [movimentacoes]);
  useEffect(() => { saveToLocalStorage('cargas', cargas); }, [cargas]);
  useEffect(() => { saveToLocalStorage('contratos', contratos); }, [contratos]);
  useEffect(() => { saveToLocalStorage('permissoes', permissoes); }, [permissoes]); // NOVO: Persistindo permissoes

  // --- SINCRONIZAÇÃO IMEDIATA (PUSH) ---
  const handleSyncAction = useCallback((action: UndoAction) => {
    syncActionToSupabase(action, user?.id, setIsSynced);
  }, [user?.id]);

  // --- PULL DATA ---
  const pullSupabaseData = useCallback(async (): Promise<boolean> => {
    const deps = {
        userId: user?.id,
        setIsSynced,
        setIsSyncing,
        setClientes,
        setParceiros,
        setMotoristas,
        setVeiculos,
        setMovimentacoes,
        setCargas,
        setContratos,
        setPermissoes,
        isSyncing, // Passando isSyncing para o serviço verificar
    };
    return pullSupabaseDataService(deps);
  }, [isSyncing, user?.id]);

  // --- LOAD DATA (Chamado apenas na montagem inicial ou login/logout) ---
  useEffect(() => {
    if (supabase && user && !isInitialized) {
        pullSupabaseData().then(() => {
            setIsInitialized(true);
        });
    } else if (!supabase || !user) {
        // Se não houver Supabase ou usuário, apenas carrega do localStorage (já feito na inicialização do estado)
        setIsSynced(false);
        setIsInitialized(false);
    }
    
    undoService.setExpirationCallback(() => {});
    
  }, [user, pullSupabaseData, isInitialized]);
  
  // --- STORAGE UTILS (Wrapper para injetar userId) ---
  const storageUploadAvatar = (file: File, clienteId: string) => uploadAvatar(file, clienteId);
  const storageDeleteAvatar = (avatarUrl: string) => deleteAvatar(avatarUrl);
  const storageDeleteComprovante = (comprovanteUrl: string) => deleteComprovante(comprovanteUrl);
  // CORREÇÃO: Passando user?.id para uploadComprovante
  const storageUploadComprovante = (file: File, movId: string) => uploadComprovante(file, movId, user?.id);


  // --- CLIENTE OPERATIONS ---
  const createCliente = (clienteData: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Cliente => {
    try {
      const cleanDocument = parseDocument(clienteData.documento || '');
      if (cleanDocument && clientes.some(c => parseDocument(c.documento || '') === cleanDocument)) {
        throw new Error('Cliente com este documento já cadastrado.');
      }
      
      const newCliente: Cliente = {
        ...normalizeClienteCreate(clienteData),
        id: clienteData.id || generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setClientes(prev => [...prev, newCliente])
      
      undoService.addUndoAction({
          type: 'create_cliente',
          description: `Cliente "${newCliente.nome}" criado`,
          data: { newRecord: newCliente },
          undoFunction: async () => {
              setClientes(prev => prev.filter(c => c.id !== newCliente.id));
              // Não revertemos a exclusão do avatar aqui, pois ele foi criado agora.
          }
      });
      handleSyncAction({ type: 'create_cliente', description: '', data: { newRecord: newCliente } } as UndoAction);
      // showSuccess(`Cliente "${newCliente.nome}" criado com sucesso.`); // REMOVIDO
      return newCliente
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao criar cliente.');
      throw e;
    }
  }

  const updateCliente = async (id: string, clienteData: Partial<Cliente>): Promise<Cliente | null> => {
    try {
      const originalCliente = clientes.find(c => c.id === id);
      if (!originalCliente) {
        throw new Error('Cliente não encontrado.');
      }

      const cleanDocument = parseDocument(clienteData.documento || originalCliente.documento || '');
      if (cleanDocument && clientes.some(c => parseDocument(c.documento || '') === cleanDocument && c.id !== id)) {
        throw new Error('Cliente com este documento já cadastrado.');
      }
      
      // 1. Aplica as mudanças localmente para obter o objeto atualizado
      const updatedCliente = applyUpdateCliente(originalCliente, clienteData);
      
      // 2. Lógica de exclusão do avatar antigo (Assíncrona)
      // Se a URL antiga existe E a nova URL é diferente (incluindo se a nova for null)
      if (originalCliente.avatarUrl && originalCliente.avatarUrl !== updatedCliente.avatarUrl) {
          // AGUARDA a exclusão do arquivo antigo
          await storageDeleteAvatar(originalCliente.avatarUrl);
      }
      
      // 3. Atualiza o estado local
      setClientes(prev => prev.map(cliente => {
        if (cliente.id === id) {
          return updatedCliente;
        }
        return cliente;
      }));
      
      // 4. Registra a ação de desfazer e sincroniza
      undoService.addUndoAction({
          type: 'update_cliente',
          description: `Cliente "${updatedCliente.nome}" atualizado`,
          data: { updatedData: updatedCliente },
          undoFunction: async () => {
              setClientes(prev => prev.map(c => c.id === id ? originalCliente! : c));
              // A reversão do avatar é complexa no undo, mas a reversão do estado local é suficiente.
          }
      });
      handleSyncAction({ type: 'update_cliente', description: '', data: { updatedData: updatedCliente } as any } as UndoAction);
      // showSuccess(`Cliente "${updatedCliente.nome}" atualizado com sucesso.`); // REMOVIDO
      
      return updatedCliente;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao atualizar cliente.');
      throw e;
    }
  }

  const deleteCliente = (id: string): boolean => {
    try {
      const deletedCliente = clientes.find(c => c.id === id);
      setClientes(prev => prev.filter(cliente => cliente.id !== id))
      
      if (deletedCliente) {
          if (deletedCliente.avatarUrl) {
              // AGUARDA a exclusão do arquivo
              storageDeleteAvatar(deletedCliente.avatarUrl);
          }
          
          undoService.addUndoAction({
              type: 'delete_cliente',
              description: `Cliente "${deletedCliente.nome}" excluído`,
              data: { deletedData: deletedCliente },
              undoFunction: async () => {
                  setClientes(prev => [...prev, deletedCliente]);
              }
          });
          handleSyncAction({ type: 'delete_cliente', description: '', data: { deletedData: deletedCliente } } as UndoAction);
          // showSuccess(`Cliente "${deletedCliente.nome}" excluído com sucesso.`); // REMOVIDO
      }
      return true
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir cliente.');
      return false;
    }
  }

  const getClienteById = (id: string): Cliente | null => {
    return clientes.find(cliente => cliente.id === id) || null
  }

  // User operations (Mantidas, mas operam em um array vazio)
  const createUser = (_user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => { throw new Error('Not implemented'); };
  const updateUser = (_id: string, _user: Partial<User>): User | null => { throw new Error('Not implemented'); };
  const deleteUser = (_id: string): boolean => { throw new Error('Not implemented'); };
  const getUserById = (_id: string): User | null => { throw new Error('Not implemented'); };

  // --- PARCEIRO OPERATIONS ---
  const createParceiro = (parceiroData: Omit<Parceiro, 'id' | 'createdAt' | 'updatedAt'>): Parceiro => {
    try {
      const cleanDocument = parseDocument(parceiroData.documento || '');
      if (cleanDocument && parceiros.some(p => parseDocument(p.documento || '') === cleanDocument)) {
        throw new Error('Parceiro com este documento já cadastrado.');
      }
      
      const newParceiro: Parceiro = {
        ...normalizeParceiroCreate(parceiroData),
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setParceiros(prev => [...prev, newParceiro])
      
      undoService.addUndoAction({
          type: 'create_parceiro',
          description: `Parceiro "${newParceiro.nome}" criado`,
          data: { newRecord: newParceiro },
          undoFunction: async () => {
              setParceiros(prev => prev.filter(p => p.id !== newParceiro.id));
          }
      });
      handleSyncAction({ type: 'create_parceiro', description: '', data: { newRecord: newParceiro } } as UndoAction);
      // showSuccess(`Parceiro "${newParceiro.nome}" criado com sucesso.`); // REMOVIDO
      return newParceiro
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao criar parceiro.');
      throw e;
    }
  }

  const updateParceiro = (id: string, parceiroData: Partial<Parceiro>): Parceiro | null => {
    try {
      let updatedParceiro: Parceiro | null = null;
      let originalParceiro: Parceiro | null = null;
      
      setParceiros(prev => prev.map(parceiro => {
        if (parceiro.id === id) {
          originalParceiro = parceiro;
          const cleanDocument = parseDocument(parceiroData.documento || parceiro.documento || '');
          if (cleanDocument && parceiros.some(p => parseDocument(p.documento || '') === cleanDocument && p.id !== id)) {
            throw new Error('Parceiro com este documento já cadastrado.');
          }
          const updated = applyUpdateParceiro(parceiro, parceiroData);
          updatedParceiro = updated;
          return updated;
        }
        return parceiro;
      }));
      
      if (updatedParceiro && originalParceiro) {
          const partner = updatedParceiro as Parceiro;
          undoService.addUndoAction({
              type: 'update_parceiro',
              description: `Parceiro "${partner.nome}" atualizado`,
              data: { updatedData: partner },
              undoFunction: async () => {
                  setParceiros(prev => prev.map(p => p.id === id ? originalParceiro! : p));
              }
          });
          handleSyncAction({ type: 'update_parceiro', description: '', data: { updatedData: partner } } as UndoAction);
          // showSuccess(`Parceiro "${partner.nome}" atualizado com sucesso.`); // REMOVIDO
      }
      return updatedParceiro;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao atualizar parceiro.');
      throw e;
    }
  }

  const deleteParceiro = (id: string): boolean => {
    try {
      const deletedParceiro = parceiros.find(p => p.id === id);
      const relatedMotoristas = motoristas.filter(m => m.parceiroId === id);
      const relatedVeiculos = veiculos.filter(v => v.parceiroId === id);
      
      setParceiros(prev => prev.filter(parceiro => parceiro.id !== id))
      setMotoristas(prev => prev.filter(motorista => motorista.parceiroId !== id))
      setVeiculos(prev => prev.filter(veiculo => veiculo.parceiroId !== id))
      
      if (deletedParceiro) {
          undoService.addUndoAction({
              type: 'delete_parceiro',
              description: `Parceiro "${deletedParceiro.nome}" excluído`,
              data: { deletedData: deletedParceiro, relatedMotoristas, relatedVeiculos },
              undoFunction: async () => {
                  setParceiros(prev => [...prev, deletedParceiro]);
                  setMotoristas(prev => [...prev, ...relatedMotoristas]);
                  setVeiculos(prev => [...prev, ...relatedVeiculos]);
              }
          });
          handleSyncAction({ type: 'delete_parceiro', description: '', data: { deletedData: deletedParceiro } } as UndoAction);
          // showSuccess(`Parceiro "${deletedParceiro.nome}" excluído com sucesso.`); // REMOVIDO
      }
      return true
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir parceiro.');
      throw e;
    }
  }

  const getParceiroById = (id: string): Parceiro | null => {
    return parceiros.find(parceiro => parceiro.id === id) || null
  }

  // --- MOTORISTA OPERATIONS ---
  const createMotorista = (motoristaData: Omit<Motorista, 'id' | 'createdAt' | 'updatedAt'>): Motorista => {
    try {
      const newMotorista: Motorista = {
        ...normalizeMotoristaCreate(motoristaData),
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setMotoristas(prev => [...prev, newMotorista])
      
      undoService.addUndoAction({
          type: 'create_motorista',
          description: `Motorista "${newMotorista.nome}" criado`,
          data: { newRecord: newMotorista },
          undoFunction: async () => {
              setMotoristas(prev => prev.filter(m => m.id !== newMotorista.id));
          }
      });
      handleSyncAction({ type: 'create_motorista', description: '', data: { newRecord: newMotorista } } as UndoAction);
      // showSuccess(`Motorista "${newMotorista.nome}" criado com sucesso.`); // REMOVIDO
      return newMotorista
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao criar motorista.');
      throw e;
    }
  }

  const updateMotorista = (id: string, motoristaData: Partial<Motorista>): Motorista | null => {
    try {
      let updatedMotorista: Motorista | null = null;
      let originalMotorista: Motorista | null = null;
      
      setMotoristas(prev => prev.map(motorista => {
        if (motorista.id === id) {
          originalMotorista = motorista;
          const updated = applyUpdateMotorista(motorista, motoristaData);
          updatedMotorista = updated;
          return updated;
        }
        return motorista;
      }));
      
      if (updatedMotorista && originalMotorista) {
          const driver = updatedMotorista as Motorista;
          undoService.addUndoAction({
              type: 'update_motorista',
              description: `Motorista "${driver.nome}" atualizado`,
              data: { updatedData: driver },
              undoFunction: async () => {
                  setMotoristas(prev => prev.map(m => m.id === id ? originalMotorista! : m));
              }
          });
          handleSyncAction({ type: 'update_motorista', description: '', data: { updatedData: driver } } as UndoAction);
          // showSuccess(`Motorista "${driver.nome}" atualizado com sucesso.`); // REMOVIDO
      }
      return updatedMotorista;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao atualizar motorista.');
      throw e;
    }
  }

  const deleteMotorista = (id: string): boolean => {
    try {
      const deletedMotorista = motoristas.find(m => m.id === id);
      setMotoristas(prev => prev.filter(motorista => motorista.id !== id))
      
      if (deletedMotorista) {
          undoService.addUndoAction({
              type: 'delete_motorista',
              description: `Motorista "${deletedMotorista.nome}" excluído`,
              data: { deletedData: deletedMotorista },
              undoFunction: async () => {
                  setMotoristas(prev => [...prev, deletedMotorista]);
              }
          });
          handleSyncAction({ type: 'delete_motorista', description: '', data: { deletedData: deletedMotorista } } as UndoAction);
          // showSuccess(`Motorista "${deletedMotorista.nome}" excluído com sucesso.`); // REMOVIDO
      }
      return true
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir motorista.');
      throw e;
    }
  }

  const getMotoristasByParceiro = (parceiroId: string): Motorista[] => {
    return motoristas.filter(m => m.parceiroId === parceiroId);
  }

  // --- VEICULO OPERATIONS ---
  const createVeiculo = (veiculoData: Omit<Veiculo, 'id' | 'createdAt' | 'updatedAt'>): Veiculo => {
    try {
      if (!veiculoData.parceiroId) {
        throw new Error('Parceiro ID é obrigatório para criar um veículo.');
      }
      
      const newVeiculo: Veiculo = {
        ...normalizeVeiculoCreate(veiculoData),
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        // Garante que carretasSelecionadas seja um array vazio se não estiver presente
        carretasSelecionadas: veiculoData.carretasSelecionadas || [], 
        // INJETANDO user_id AQUI PARA GARANTIR QUE O RLS FUNCIONE NO INSERT
        userId: user?.id, 
      }
      setVeiculos(prev => [...prev, newVeiculo])
      
      undoService.addUndoAction({
          type: 'create_veiculo',
          description: `Veículo "${newVeiculo.placa || newVeiculo.placaCavalo || newVeiculo.placaCarreta}" criado`,
          data: { newRecord: newVeiculo },
          undoFunction: async () => {
              setVeiculos(prev => prev.filter(v => v.id !== newVeiculo.id));
          }
      });
      // O handleSyncAction agora receberá o objeto com o userId
      handleSyncAction({ type: 'create_veiculo', description: '', data: { newRecord: newVeiculo } } as UndoAction);
      // showSuccess(`Veículo "${newVeiculo.placa || newVeiculo.placaCavalo || newVeiculo.placaCarreta}" criado com sucesso.`); // REMOVIDO
      return newVeiculo
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao criar veículo.');
      throw e;
    }
  }

  const updateVeiculo = (id: string, veiculoData: Partial<Veiculo>): Veiculo | null => {
    try {
      let updatedVeiculo: Veiculo | null = null;
      let originalVeiculo: Veiculo | null = null;
      
      setVeiculos(prev => prev.map(veiculo => {
        if (veiculo.id === id) {
          originalVeiculo = veiculo;
          const updated = applyUpdateVeiculo(veiculo, veiculoData);
          // Garante que o userId seja mantido no objeto atualizado
          updated.userId = veiculo.userId || user?.id; 
          
          // Se o permisso existir no objeto original, ele deve ser mantido no updated,
          // a menos que veiculoData o sobrescreva (o que não deve acontecer aqui).
          if (veiculo.permisso && !updated.permisso) {
              updated.permisso = veiculo.permisso;
          }
          
          updatedVeiculo = updated;
          return updated;
        }
        return veiculo;
      }));
      
      if (updatedVeiculo && originalVeiculo) {
          const vehicle = updatedVeiculo as Veiculo;
          
          // LOG PARA DEBUG
          console.log('[DatabaseContext] Payload de atualização do Veículo:', vehicle);
          
          undoService.addUndoAction({
              type: 'update_veiculo',
              description: `Veículo "${vehicle.placa || vehicle.placaCavalo || vehicle.placaCarreta}" atualizado`,
              data: { updatedData: vehicle },
              undoFunction: async () => {
                  setVeiculos(prev => prev.map(v => v.id === id ? originalVeiculo! : v));
              }
          });
          // CORREÇÃO: Garante que o objeto enviado para sincronização contenha o chassis atualizado
          handleSyncAction({ type: 'update_veiculo', description: '', data: { updatedData: vehicle } } as UndoAction);
          
          // EXIBIÇÃO DA MENSAGEM DE SUCESSO DO VEÍCULO
          // showSuccess(`Veículo "${vehicle.placa || vehicle.placaCavalo || vehicle.placaCarreta}" criado com sucesso.`); // REMOVIDO
      }
      return updatedVeiculo;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao atualizar veículo.');
      throw e;
    }
  }

  const deleteVeiculo = (id: string): boolean => {
    try {
      const deletedVeiculo = veiculos.find(v => v.id === id);
      setVeiculos(prev => prev.filter(veiculo => veiculo.id !== id))
      
      if (deletedVeiculo) {
          undoService.addUndoAction({
              type: 'delete_veiculo',
              description: `Veículo "${deletedVeiculo.placa || deletedVeiculo.placaCavalo || deletedVeiculo.placaCarreta}" excluído`,
              data: { deletedData: deletedVeiculo },
              undoFunction: async () => {
                  setVeiculos(prev => [...prev, deletedVeiculo]);
              }
          });
          handleSyncAction({ type: 'delete_veiculo', description: '', data: { deletedData: deletedVeiculo } } as UndoAction);
          // showSuccess(`Veículo "${deletedVeiculo.placa || deletedVeiculo.placaCavalo || deletedVeiculo.placaCarreta}" excluído com sucesso.`); // REMOVIDO
      }
      return true
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir veículo.');
      throw e;
    }
  }

  const getVeiculosByParceiro = (parceiroId: string): Veiculo[] => {
    return veiculos.filter(v => v.parceiroId === parceiroId);
  }
  
  // --- PERMISSO OPERATIONS ---
  const createPermisso = (permissoData: Omit<PermissoInternacional, 'id' | 'createdAt' | 'updatedAt' | 'dataConsulta'> & { veiculoId: string }, veiculoId: string): PermissoInternacional => {
    try {
      const newPermisso: PermissoInternacional = {
        ...normalizePermissoCreate(permissoData),
        id: generateId(),
        veiculoId: veiculoId,
        dataConsulta: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setPermissoes(prev => [...prev, newPermisso])
      
      // ATUALIZA O OBJETO VEÍCULO NO ESTADO LOCAL
      setVeiculos(prev => prev.map(v => v.id === veiculoId ? { ...v, permisso: newPermisso } : v));
      
      undoService.addUndoAction({
          type: 'create_permisso_internacional',
          description: `Permisso para Veículo ${veiculoId} criado`,
          data: { newRecord: newPermisso },
          undoFunction: async () => {
              setPermissoes(prev => prev.filter(p => p.id !== newPermisso.id));
              setVeiculos(prev => prev.map(v => v.id === veiculoId ? { ...v, permisso: undefined } : v));
          }
      });
      handleSyncAction({ type: 'create_permisso_internacional', description: '', data: { newRecord: newPermisso } } as UndoAction);
      // showSuccess(`Permisso para Veículo ${veiculoId} criado com sucesso.`); // REMOVIDO
      return newPermisso
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao criar permisso.');
      throw e;
    }
  }

  const updatePermisso = (id: string, permissoData: Partial<PermissoInternacional>): PermissoInternacional | null => {
    try {
      let updatedPermisso: PermissoInternacional | null = null;
      let originalPermisso: PermissoInternacional | null = null;
      
      setPermissoes(prev => prev.map(permisso => {
        if (permisso.id === id) {
          originalPermisso = permisso;
          const updated = applyUpdatePermisso(permisso, permissoData);
          updated.dataConsulta = new Date();
          updatedPermisso = updated;
          return updated;
        }
        return permisso;
      }));
      
      if (updatedPermisso && originalPermisso) {
          const permisso = updatedPermisso as PermissoInternacional;
          
          // ATUALIZA O OBJETO VEÍCULO NO ESTADO LOCAL
          setVeiculos(prev => prev.map(v => v.id === permisso.veiculoId ? { ...v, permisso: permisso } : v));
          
          undoService.addUndoAction({
              type: 'update_permisso_internacional',
              description: `Permisso para Veículo ${permisso.veiculoId} atualizado`,
              data: { updatedData: permisso },
              undoFunction: async () => {
                  setPermissoes(prev => prev.map(p => p.id === id ? originalPermisso! : p));
                  setVeiculos(prev => prev.map(v => v.id === permisso.veiculoId ? { ...v, permisso: originalPermisso! } : v));
              }
          });
          handleSyncAction({ type: 'update_permisso_internacional', description: '', data: { updatedData: permisso } } as UndoAction);
          
          // CORREÇÃO: A mensagem de sucesso do Permisso deve ser mais informativa
          // showSuccess(`Permisso para Veículo ${permisso.veiculoId} atualizado com sucesso.`); // REMOVIDO
      }
      return updatedPermisso;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao atualizar permisso.');
      throw e;
    }
  }
  
  const getPermissoByVeiculoId = (veiculoId: string): PermissoInternacional | null => {
    // CORREÇÃO: Busca o Permisso diretamente do objeto Veiculo no estado veiculos
    const veiculo = veiculos.find(v => v.id === veiculoId);
    return veiculo?.permisso || null;
  }

  // --- MOVIMENTACAO OPERATIONS ---
  const createMovimentacao = (movimentacaoData: Omit<MovimentacaoFinanceira, 'id' | 'createdAt' | 'updatedAt'>): MovimentacaoFinanceira => {
    try {
      const newMovimentacao: MovimentacaoFinanceira = {
        ...movimentacaoData,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setMovimentacoes(prev => [...prev, newMovimentacao])
      
      undoService.addUndoAction({
          type: 'create_movimentacoes_financeiras',
          description: `Movimentação "${newMovimentacao.descricao}" criada`,
          data: { newRecord: newMovimentacao },
          undoFunction: async () => {
              setMovimentacoes(prev => prev.filter(m => m.id !== newMovimentacao.id));
          }
      });
      handleSyncAction({ type: 'create_movimentacoes_financeiras', description: '', data: { newRecord: newMovimentacao } } as UndoAction);
      // showSuccess(`Movimentação "${newMovimentacao.descricao}" criada com sucesso.`); // REMOVIDO
      return newMovimentacao
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao criar movimentação.');
      throw e;
    }
  }

  const updateMovimentacao = async (id: string, movimentacaoData: Partial<MovimentacaoFinanceira>): Promise<MovimentacaoFinanceira | null> => {
    try {
      let updatedMovimentacao: MovimentacaoFinanceira | null = null;
      let originalMovimentacao: MovimentacaoFinanceira | null = null;
      
      setMovimentacoes(prev => prev.map(movimentacao => {
        if (movimentacao.id === id) {
          originalMovimentacao = movimentacao;
          
          let finalComprovanteUrl = movimentacao.comprovanteUrl;
          
          // LÓGICA DE EXCLUSÃO DE COMPROVANTE: Se o status for alterado de 'pago' para outro
          if (movimentacao.status === 'pago' && movimentacaoData.status !== 'pago') {
              if (movimentacao.comprovanteUrl) {
                  // AGUARDA a exclusão do arquivo
                  storageDeleteComprovante(movimentacao.comprovanteUrl);
              }
              // Garante que a URL seja limpa no objeto local
              finalComprovanteUrl = undefined; 
          } else if (movimentacaoData.comprovanteUrl !== undefined) {
              // Se uma nova URL for fornecida (ou null/undefined), usa a nova
              finalComprovanteUrl = movimentacaoData.comprovanteUrl;
          }
          
          const updated = { 
              ...movimentacao, 
              ...movimentacaoData, 
              updatedAt: new Date(),
              comprovanteUrl: finalComprovanteUrl // Aplica a URL final (limpa ou mantida)
          };
          
          updatedMovimentacao = updated;
          return updated;
        }
        return movimentacao;
      }));
      
      if (updatedMovimentacao && originalMovimentacao) {
          const mov = updatedMovimentacao as MovimentacaoFinanceira;
          undoService.addUndoAction({
              type: 'update_movimentacoes_financeiras',
              description: `Movimentação "${mov.descricao}" atualizada`,
              data: { updatedData: mov },
              undoFunction: async () => {
                  setMovimentacoes(prev => prev.map(m => m.id === id ? originalMovimentacao! : m));
              }
          });
          handleSyncAction({ type: 'update_movimentacoes_financeiras', description: '', data: { updatedData: mov } } as UndoAction);
          // showSuccess(`Movimentação "${mov.descricao}" atualizada com sucesso.`); // REMOVIDO
      }
      return updatedMovimentacao;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao atualizar movimentação.');
      throw e;
    }
  }

  const deleteMovimentacao = (id: string): boolean => {
    try {
      const deletedMovimentacao = movimentacoes.find(m => m.id === id);
      setMovimentacoes(prev => prev.filter(movimentacao => movimentacao.id !== id))
      
      if (deletedMovimentacao) {
          if (deletedMovimentacao.comprovanteUrl) {
              storageDeleteComprovante(deletedMovimentacao.comprovanteUrl);
          }
          
          undoService.addUndoAction({
              type: 'delete_movimentacoes_financeiras',
              description: `Movimentação "${deletedMovimentacao.descricao}" excluída`,
              data: { deletedData: deletedMovimentacao },
              undoFunction: async () => {
                  setMovimentacoes(prev => [...prev, deletedMovimentacao]);
              }
          });
          handleSyncAction({ type: 'delete_movimentacoes_financeiras', description: '', data: { deletedData: deletedMovimentacao } } as UndoAction);
          // showSuccess(`Movimentação "${deletedMovimentacao.descricao}" excluída com sucesso.`); // REMOVIDO
      }
      return true
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir movimentação.');
      throw e;
    }
  }

  // --- CARGA OPERATIONS ---
  const createCarga = (cargaData: Omit<Carga, 'id' | 'createdAt' | 'updatedAt'>): Carga => {
    try {
        // NOVO: Validação de peso máximo antes do split
        if (cargaData.peso > 1000) {
            throw new Error('O peso da carga excede o limite máximo de 1000 toneladas.');
        }
        
        // 1. Split the load if necessary
        const loadsToCreate = splitCarga(cargaData);
        
        const createdLoads: Carga[] = [];
        
        loadsToCreate.forEach(loadData => {
            const newCarga: Carga = {
                // CORREÇÃO: Normaliza a descrição aqui para garantir que não seja nula
                ...normalizeCargaCreate(loadData),
                id: generateId(),
                createdAt: new Date(),
                updatedAt: new Date()
            }
            createdLoads.push(newCarga);
        });
        
        // 2. Update local state with all created loads
        setCargas(prev => [...prev, ...createdLoads]);
        
        // 3. Prepare undo action for all created loads
        const undoDescription = loadsToCreate.length > 1 
            ? `Carga original "${cargaData.crt || cargaData.descricao}" (${loadsToCreate.length} partes) criada`
            : `Carga "${cargaData.crt || cargaData.descricao}" criada`;
            
        const createdIds = createdLoads.map(c => c.id);
            
        undoService.addUndoAction({
            type: 'create_cargas',
            description: undoDescription,
            data: { createdIds: createdIds }, // Store IDs for undo
            undoFunction: async () => {
                setCargas(prev => prev.filter(c => !createdIds.includes(c.id)));
            }
        });
        
        // 4. Sync all created loads
        createdLoads.forEach(load => {
            handleSyncAction({ type: 'create_cargas', description: '', data: { newRecord: load } } as UndoAction);
        });
        
        // showSuccess(undoDescription + ' com sucesso.'); // REMOVIDO
        
        // Return the first created load (or the only one) for consistency with the function signature
        return createdLoads[0];
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao criar carga.');
      throw e;
    }
  }

  const updateCarga = (id: string, cargaData: Partial<Carga>): Carga | null => {
    try {
      let updatedCarga: Carga | null = null;
      let originalCarga: Carga | null = null;
      
      setCargas(prev => prev.map(carga => {
        if (carga.id === id) {
          originalCarga = carga;
          const updated = applyUpdateCarga(carga, cargaData);
          updatedCarga = updated;
          return updated;
        }
        return carga;
      }));
      
      if (updatedCarga && originalCarga) {
          const cargo = updatedCarga as Carga;
          undoService.addUndoAction({
              type: 'update_cargas',
              description: `Carga "${cargo.crt || cargo.descricao}" atualizada`,
              data: { updatedData: cargo },
              undoFunction: async () => {
                  setCargas(prev => prev.map(c => c.id === id ? originalCarga! : c));
              }
          });
          handleSyncAction({ type: 'update_cargas', description: '', data: { updatedData: cargo } } as UndoAction);
          // showSuccess(`Carga "${cargo.crt || cargo.descricao}" atualizada com sucesso.`); // REMOVIDO
      }
      return updatedCarga;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao atualizar carga.');
      throw e;
    }
  }

  const deleteCarga = (id: string): boolean => {
    try {
      const deletedCarga = cargas.find(c => c.id === id);
      const associatedMovs = movimentacoes.filter(m => m.cargaId === id);
      const associatedContratos = contratos.filter(c => c.cargaId === id);
      
      setCargas(prev => prev.filter(carga => carga.id !== id))
      setMovimentacoes(prev => prev.filter(m => m.cargaId !== id));
      setContratos(prev => prev.filter(c => c.cargaId !== id));
      
      if (deletedCarga) {
          undoService.addUndoAction({
              type: 'delete_cargas',
              description: `Carga "${deletedCarga.crt || deletedCarga.descricao}" excluída`,
              data: { deletedData: deletedCarga, associatedMovs, associatedContratos },
              undoFunction: async () => {
                  setCargas(prev => [...prev, deletedCarga]);
                  setMovimentacoes(prev => [...prev, ...associatedMovs]);
                  setContratos(prev => [...prev, ...associatedContratos]);
              }
          });
          handleSyncAction({ type: 'delete_cargas', description: '', data: { deletedData: deletedCarga } } as UndoAction);
          // showSuccess(`Carga "${deletedCarga.crt || deletedCarga.descricao}" excluída com sucesso.`); // REMOVIDO
      }
      return true
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir carga.');
      throw e;
    }
  }

  // --- CONTRATO OPERATIONS ---
  const generateContract = async (cargaId: string): Promise<void> => {
    // Lógica de geração de contrato (simulada)
    const carga = cargas.find(c => c.id === cargaId);
    if (!carga) {
        showError('Carga não encontrada.');
        return;
    }
    
    // O motorista e parceiro agora vêm do primeiro trajeto (ou do trajeto selecionado, se a lógica for mais complexa)
    const trajetoPrincipal = carga.trajetos[0];
    
    const newContrato: ContratoFrete = {
      id: generateId(),
      cargaId: cargaId,
      pdfUrl: 'CONTRATO_SIMULADO.pdf',
      motoristaNome: getMotoristaName(trajetoPrincipal?.motoristaId),
      parceiroNome: parceiros.find(p => p.id === trajetoPrincipal?.parceiroId)?.nome,
      crt: carga.crt,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setContratos(prev => {
      const existing = prev.find(c => c.cargaId === cargaId);
      if (existing) {
        return prev.map(c => c.cargaId === cargaId ? { ...newContrato, id: existing.id } : c);
      }
      return [...prev, newContrato];
    });
    
    undoService.addUndoAction({
        type: 'create_contratos_frete',
        description: `Contrato para CRT ${carga.crt || 'N/A'} gerado`,
        data: { newRecord: newContrato },
        undoFunction: async () => {
            setContratos(prev => prev.filter(c => c.id !== newContrato.id));
        }
    });
    handleSyncAction({ type: 'create_contratos_frete', description: '', data: { newRecord: newContrato } } as UndoAction);
    // showSuccess(`Contrato para CRT ${carga.crt || 'N/A'} gerado com sucesso.`); // REMOVIDO
  };

  const getContracts = async (): Promise<ContratoFrete[]> => {
    return contratos;
  };
  
  const deleteContrato = (id: string): boolean => {
    try {
      const deletedContrato = contratos.find(c => c.id === id);
      setContratos(prev => prev.filter(c => c.id !== id));
      
      if (deletedContrato) {
          undoService.addUndoAction({
              type: 'delete_contratos_frete',
              description: `Contrato para CRT ${deletedContrato.crt || 'N/A'} excluído`,
              data: { deletedData: deletedContrato },
              undoFunction: async () => {
                  setContratos(prev => [...prev, deletedContrato]);
              }
          });
          handleSyncAction({ type: 'delete_contratos_frete', description: '', data: { deletedData: deletedContrato } } as UndoAction);
          // showSuccess(`Contrato para CRT ${deletedContrato.crt || 'N/A'} excluído com sucesso.`); // REMOVIDO
      }
      return true;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir contrato.');
      throw e;
    }
  };
  
  // Utility functions for Cargas/Financeiro synchronization
  const getMotoristaName = (motoristaId: string | undefined) => {
    if (!motoristaId) return 'N/A';
    const motorista = motoristas.find(m => m.id === motoristaId);
    if (motorista) return motorista.nome;
    const parceiro = parceiros.find(p => p.id === motoristaId && p.isMotorista);
    return parceiro?.nome || 'N/A';
  };
  
  // ATUALIZADO: Adicionando trajetoIndex
  const buildMovimentacaoDescription = (carga: Carga, prefix: 'Adto' | 'Saldo' | 'Frete' | 'Diárias' | 'Despesas Adicionais', trajetoIndex?: number) => {
    // Verifica se a carga tem mais de um trajeto OU se o trajetoIndex é explicitamente maior que 1
    const shouldShowTrajetoIndex = (carga.trajetos || []).length > 1 && trajetoIndex !== undefined;
    
    const trajetoSuffix = shouldShowTrajetoIndex ? ` (Trajeto ${trajetoIndex})` : '';
    return `${prefix} - ${carga.crt || carga.descricao}${trajetoSuffix}`;
  };
  
  const syncMovimentacoesForCarga = (cargaId: string) => {
    console.log(`Simulating sync movs for ${cargaId}`);
  };

  const value: DatabaseContextType = {
    users,
    clientes,
    parceiros,
    motoristas,
    veiculos,
    movimentacoes,
    cargas,
    contratos,
    
    // User operations
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    
    // Cliente operations
    createCliente,
    updateCliente,
    deleteCliente,
    getClienteById,
    
    // Parceiro operations
    createParceiro,
    updateParceiro,
    deleteParceiro,
    getParceiroById,
    
    // Motorista operations
    createMotorista,
    updateMotorista,
    deleteMotorista,
    getMotoristasByParceiro,
    
    // Veiculo operations
    createVeiculo,
    updateVeiculo,
    deleteVeiculo,
    getVeiculosByParceiro,
    
    // Permisso operations
    createPermisso,
    updatePermisso,
    getPermissoByVeiculoId,

    // Movimentacao operations
    createMovimentacao,
    updateMovimentacao,
    deleteMovimentacao,
    
    // Carga operations
    createCarga,
    updateCarga,
    deleteCarga,

    // Contrato operations
    generateContract,
    getContracts,
    deleteContrato,
    
    // Utility functions for Cargas/Financeiro synchronization
    getMotoristaName,
    buildMovimentacaoDescription,
    syncMovimentacoesForCarga,
    
    // Storage Utils
    uploadAvatar: storageUploadAvatar,
    deleteAvatar: storageDeleteAvatar,
    deleteComprovante: storageDeleteComprovante,
    uploadComprovante: storageUploadComprovante,
    
    // Sincronização e Reset
    pullSupabaseData,
    isSynced,
    isSyncing,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  )
}