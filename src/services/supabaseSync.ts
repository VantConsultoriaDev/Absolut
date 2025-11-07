import { supabase } from '../lib/supabaseClient';
import { UndoAction } from './undoService';
import { mapToSupabase, mapFromSupabase } from './supabaseMappers';
import { showError, showLoading, dismissToast } from '../utils/toast';
import { Cliente, Parceiro, Motorista, MovimentacaoFinanceira, Carga, ContratoFrete, PermissoInternacional, Veiculo } from '../types';

interface SyncDependencies {
    userId: string | undefined;
    setIsSynced: (isSynced: boolean) => void;
    setIsSyncing: (isSyncing: boolean) => void;
    setClientes: (data: Cliente[]) => void;
    setParceiros: (data: Parceiro[]) => void;
    setMotoristas: (data: Motorista[]) => void;
    setVeiculos: (data: Veiculo[]) => void;
    setMovimentacoes: (data: MovimentacaoFinanceira[]) => void;
    setCargas: (data: Carga[]) => void;
    setContratos: (data: ContratoFrete[]) => void;
    setPermissoes: (data: PermissoInternacional[]) => void;
    isSyncing: boolean; // Adicionado para resolver TS2551
}

// Função auxiliar para determinar o nome correto da tabela no Supabase
const getSupabaseTableName = (tableName: string): string => {
    // Mapeamento explícito para tabelas com nomes complexos
    if (tableName === 'movimentacoes_financeiras') return 'movimentacoes_financeiras';
    if (tableName === 'contratos_frete') return 'contratos_frete';
    if (tableName === 'permisso_internacional') return 'permisso_internacional';
    if (tableName === 'cargas') return 'cargas';
    
    // Padrão: adiciona 's' (para clientes, parceiros, motoristas, veiculos)
    return tableName + 's';
};

// --- SINCRONIZAÇÃO IMEDIATA (PUSH) ---
export const syncActionToSupabase = (action: UndoAction, userId: string | undefined, setIsSynced: (isSynced: boolean) => void) => {
    if (!supabase) {
        console.warn('[SYNC IMMEDIATE] Supabase not configured. Skipping sync.');
        setIsSynced(false);
        return;
    }
    
    const { type, data } = action;
    const [actionType, ...tableNameParts] = type.split('_');
    const tableName = tableNameParts.join('_'); // Reconstroi o nome da tabela (ex: movimentacoes_financeiras)
    
    if (!tableName) {
        console.error('[SYNC IMMEDIATE] Invalid action type for sync:', type);
        return;
    }
    
    // Determina o nome correto da tabela
    const supabaseTableName = getSupabaseTableName(tableName);
    
    let item: any;
    if (actionType === 'delete') {
        item = data.deletedData;
    } else if (actionType === 'update') {
        item = data.updatedData;
    } else { // create/insert
        item = data.newRecord;
    }
    
    if (!item || !item.id) {
        console.error('[SYNC IMMEDIATE] Item data missing ID for sync:', item);
        return;
    }
    
    const supabaseData = mapToSupabase(supabaseTableName, item, userId);
    
    let syncPromise: Promise<any>;
    
    if (actionType === 'create' || actionType === 'update') {
        // CORREÇÃO: Cria o payload de upsert, garantindo que o user_id seja incluído
        const { user_id, created_at, ...restPayload } = supabaseData;
        
        const upsertPayload: any = {
            ...restPayload,
            // Garante que o user_id seja incluído no payload de upsert para RLS
            user_id: user_id, 
        };
        
        if (actionType === 'create') {
            upsertPayload.created_at = created_at;
        }
        
        const options: { onConflict?: string } = {};
        
        // Se for permisso_internacional, use veiculo_id como chave de conflito
        if (supabaseTableName === 'permisso_internacional') {
            options.onConflict = 'veiculo_id';
        }
        
        // Usando upsert com o objeto options
        syncPromise = supabase.from(supabaseTableName).upsert(upsertPayload, options).select().then(res => res) as Promise<any>;
        
    } else if (actionType === 'delete') {
        syncPromise = supabase.from(supabaseTableName).delete().eq('id', item.id).then(res => res) as Promise<any>;
    } else {
        console.warn(`[SYNC IMMEDIATE] Unknown action type: ${actionType}. Skipping sync.`);
        return;
    }
    
    syncPromise.then(({ error }) => {
        if (error) {
            console.error(`[SYNC ERROR] ${actionType.toUpperCase()} ${supabaseTableName}:`, error);
            
            const errorMessage = error.message || 'Erro desconhecido de sincronização.';
            showError(`Falha ao sincronizar ${actionType} de ${supabaseTableName}. Detalhes: ${errorMessage}`);
            
        } else {
            setIsSynced(true);
        }
    });
    
    setIsSynced(false);
};

// --- PULL DATA ---
export const pullSupabaseData = async (deps: SyncDependencies): Promise<boolean> => {
    const { 
        setIsSynced, setIsSyncing, setClientes, setParceiros, setMotoristas, setVeiculos, 
        setMovimentacoes, setCargas, setContratos, setPermissoes, isSyncing // Corrigido: isSyncing adicionado à desestruturação
    } = deps;

    if (!supabase || isSyncing) return false; // Corrigido: usando isSyncing desestruturado
    const toastId = showLoading('Sincronizando dados com o Supabase...');
    setIsSyncing(true);
    
    try {
        const tables = [
            'clientes', 'parceiros', 'motoristas', 'movimentacoes_financeiras', 'cargas', 'contratos_frete', 'permisso_internacional'
        ];
        
        // Fetch Veiculos separadamente, incluindo o relacionamento com permisso_internacional
        // CORREÇÃO: Garante que o relacionamento seja buscado corretamente
        const { data: veiculosData, error: veiculosError } = await supabase!
            .from('veiculos')
            .select('*, permisso_internacional(*)')
            
        if (veiculosError) throw veiculosError;
        
        // Mapeia Veículos
        const veiculosMapped = veiculosData.map(item => mapFromSupabase('veiculos', item) as Veiculo);
        setVeiculos(veiculosMapped);
        
        // Fetch other tables
        const results = await Promise.all(tables.filter(t => t !== 'permisso_internacional').map(tableName => 
            supabase!.from(tableName).select('*')
        ));
        
        const [
            clientesRes, parceirosRes, motoristasRes, movimentacoesRes, cargasRes, contratosRes
        ] = results;

        if (clientesRes.error) throw clientesRes.error;
        if (parceirosRes.error) throw parceirosRes.error;
        if (motoristasRes.error) throw motoristasRes.error;
        if (movimentacoesRes.error) throw movimentacoesRes.error;
        if (cargasRes.error) throw cargasRes.error;
        if (contratosRes.error) throw contratosRes.error;
        
        // Mapeia Permissoes separadamente (embora já estejam nos Veículos, mantemos a tabela para consistência)
        // CORREÇÃO: Extrai permissoes dos veiculos mapeados para popular a tabela permissoes
        const allPermissoes: PermissoInternacional[] = veiculosMapped
            .map(v => v.permisso)
            .filter((p): p is PermissoInternacional => !!p);
            
        setPermissoes(allPermissoes);

        setClientes(clientesRes.data.map(item => mapFromSupabase('clientes', item) as Cliente));
        setParceiros(parceirosRes.data.map(item => mapFromSupabase('parceiros', item) as Parceiro));
        setMotoristas(motoristasRes.data.map(item => mapFromSupabase('motoristas', item) as Motorista));
        setMovimentacoes(movimentacoesRes.data.map(item => mapFromSupabase('movimentacoes_financeiras', item) as MovimentacaoFinanceira));
        setCargas(cargasRes.data.map(item => mapFromSupabase('cargas', item) as Carga));
        setContratos(contratosRes.data.map(item => mapFromSupabase('contratos_frete', item) as ContratoFrete));

        setIsSynced(true);
        // toastId é o ID retornado por showLoading, que é uma string
        dismissToast(toastId as string); 
        // showSuccess('Sincronização concluída com sucesso!'); // REMOVIDO
        return true;
        
    } catch (error) {
        console.error('[SYNC ERROR] Failed to pull data from Supabase:', error);
        setIsSynced(false);
        // toastId é o ID retornado por showLoading, que é uma string
        dismissToast(toastId as string); 
        showError('Falha na sincronização. Verifique a conexão ou as permissões do Supabase.');
        return false;
    } finally {
        setIsSyncing(false);
    }
};