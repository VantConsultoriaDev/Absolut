import { supabase } from '../lib/supabaseClient';
import { showError } from '../utils/toast.tsx';

// Função auxiliar para garantir que o bucket exista
// REMOVIDA A LÓGICA DE CRIAÇÃO/VERIFICAÇÃO DE BUCKET, POIS O CLIENTE ANON NÃO TEM PERMISSÃO PARA ISSO.
// O bucket deve ser criado manualmente via SQL ou Service Role Key.
export const ensureBucketExists = async (bucketName: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    // Tenta obter o bucket (apenas para verificar se existe, mas não tenta criar)
    const { error: getBucketError } = await supabase.storage.getBucket(bucketName);
    
    if (getBucketError && getBucketError.message === 'Bucket not found') {
      // Se não existir, falha silenciosamente, pois o cliente anon não pode criar.
      console.error(`[STORAGE] Bucket ${bucketName} não encontrado. O upload falhará se o bucket não for criado manualmente.`);
      showError(`Erro de configuração: O bucket '${bucketName}' não existe no Supabase Storage.`);
      return false;
    } else if (getBucketError) {
      // Outro erro ao obter (ex: RLS)
      console.error(`[STORAGE] Erro ao verificar bucket ${bucketName}:`, getBucketError.message);
      // Não mostra erro ao usuário, pois o erro pode ser RLS na verificação, mas o upload pode funcionar.
      return true; // Assume que existe para tentar o upload
    }
    
    return true;
  } catch (e) {
    console.error(`[STORAGE] Erro inesperado ao garantir bucket ${bucketName}:`, e);
    return true; // Assume que existe para tentar o upload
  }
};

// --- AVATAR UTILS ---

export const uploadAvatar = async (file: File, clienteId: string): Promise<string | null> => {
  if (!supabase) {
    console.error('[STORAGE] Supabase client não inicializado.');
    showError('Serviço de Storage indisponível.');
    return null;
  }
  
  // REMOVIDO: if (!(await ensureBucketExists('avatares', true))) return null;
  
  const fileExt = file.name.split('.').pop();
  // Usar o ID do cliente como nome do arquivo para garantir unicidade e fácil remoção
  const fileName = `${clienteId}.${fileExt}`;
  const filePath = `${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('avatares')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload do avatar:', uploadError);
      // Adicionando mensagem de erro mais específica para o usuário
      showError(`Falha no upload do avatar: ${uploadError.message}. Verifique RLS e permissões do bucket 'avatares'.`);
      return null;
    }

    const { data } = supabase.storage.from('avatares').getPublicUrl(filePath);
    
    // CORREÇÃO: Adicionar cache-busting (timestamp) à URL
    const cacheBuster = Date.now();
    return `${data.publicUrl}?t=${cacheBuster}`;
    
  } catch (e) {
    console.error('Erro inesperado no upload:', e);
    showError('Erro inesperado durante o upload do avatar.');
    return null;
  }
};

export const deleteAvatar = async (avatarUrl: string): Promise<boolean> => {
  if (!supabase || !avatarUrl) return false;
  
  try {
    // Extrai o caminho do arquivo (tudo que vem depois de /avatares/)
    const url = new URL(avatarUrl);
    const pathSegments = url.pathname.split('/');
    
    // Encontra o índice do bucket 'avatares'
    const bucketIndex = pathSegments.indexOf('avatares');
    
    if (bucketIndex === -1 || bucketIndex >= pathSegments.length - 1) {
        console.warn('[STORAGE] URL de avatar inválida ou não pertence ao bucket avatares:', avatarUrl);
        return false;
    }
    
    // O caminho do arquivo é tudo após o nome do bucket
    const filePath = pathSegments.slice(bucketIndex + 1).join('/'); 

    // Decodifica o caminho do arquivo (necessário se houver caracteres especiais)
    const decodedFilePath = decodeURIComponent(filePath);

    console.log(`[STORAGE] Tentando remover avatar: ${decodedFilePath}`);

    const { error } = await supabase.storage
      .from('avatares')
      .remove([decodedFilePath]);

    if (error) {
      console.error('[STORAGE] Erro ao deletar avatar:', error);
      showError(`Falha ao deletar avatar do Storage: ${error.message}.`);
      return false;
    }
    console.log(`[STORAGE] Avatar ${decodedFilePath} removido com sucesso.`);
    return true;
  } catch (e) {
    console.error('[STORAGE] Erro inesperado ao deletar avatar:', e);
    showError('Erro inesperado ao deletar avatar.');
    return false;
  }
};

// --- COMPROVANTE UTILS ---

export const deleteComprovante = async (comprovanteUrl: string): Promise<boolean> => {
  if (!supabase || !comprovanteUrl) return false;
  
  // REMOVIDO: if (!(await ensureBucketExists('comprovantes', false))) return false;
  
  try {
    const url = new URL(comprovanteUrl);
    const pathSegments = url.pathname.split('/');
    const bucketIndex = pathSegments.indexOf('comprovantes');
    
    if (bucketIndex === -1 || bucketIndex >= pathSegments.length - 1) {
        console.warn('URL de comprovante inválida ou não pertence ao bucket comprovantes:', comprovanteUrl);
        return false;
    }
    
    // O caminho do arquivo é tudo após o nome do bucket
    const filePath = pathSegments.slice(bucketIndex + 1).join('/'); 
    const decodedFilePath = decodeURIComponent(filePath);

    const { error } = await supabase.storage
      .from('comprovantes')
      .remove([decodedFilePath]);

    if (error) {
      console.error('Erro ao deletar comprovante:', error);
      showError('Falha ao deletar comprovante do Storage.');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Erro inesperado ao deletar comprovante:', e);
    showError('Erro inesperado ao deletar comprovante.');
    return false;
  }
};

export const uploadComprovante = async (file: File, movId: string, userId: string | undefined): Promise<string | null> => {
  if (!supabase) return null;
  
  // REMOVIDO: if (!(await ensureBucketExists('comprovantes', false))) return null;
  
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Usar o ID do usuário no caminho para RLS (Row Level Security)
    const path = `${userId || 'anon'}/movimentacoes/${movId}/${Date.now()}_${safeName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('comprovantes')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload do comprovante:', uploadError);
      // CORREÇÃO: Inclui a mensagem de erro do Supabase
      showError(`Falha ao fazer upload do comprovante: ${uploadError.message}.`);
      return null;
    }

    // Nota: getPublicUrl funciona mesmo para buckets privados, mas o acesso ao arquivo
    // requer autenticação (token) se o RLS estiver ativo.
    const { data } = supabase.storage.from('comprovantes').getPublicUrl(path);
    return data.publicUrl;
    
  } catch (e) {
    console.error('Erro inesperado no upload de comprovante:', e);
    showError('Erro inesperado durante o upload do comprovante.');
    return null;
  }
};