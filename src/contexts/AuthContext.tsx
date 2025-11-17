import React, { createContext, useContext, useState, useEffect } from 'react'
import { AuthContextType, User } from '../types'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

// Função para mapear o usuário da sessão Supabase para a interface User simplificada
const mapSupabaseUserToAppUser = (sessionUser: any): User => {
  const metadataName = sessionUser?.user_metadata?.name;
  return {
    id: sessionUser.id,
    email: sessionUser.email || 'N/A',
    name: metadataName || sessionUser.email || 'Usuário Autenticado',
    createdAt: new Date(sessionUser.created_at!),
    updatedAt: new Date(sessionUser.updated_at!),
  };
};


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true) // Novo estado de loading
  const [lastAuthError, setLastAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client is not initialized. Authentication will not work.');
      setIsLoading(false); // Se não houver Supabase, termina o loading
      return;
    }

    let isMounted = true;

    // 1. Verifica a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session) {
        setUser(mapSupabaseUserToAppUser(session.user));
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      // Garante que o loading termine após a primeira verificação
      setIsLoading(false); 
    });

    // 2. Configura o listener para mudanças futuras
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session) {
        const authenticatedUser = mapSupabaseUserToAppUser(session.user);
        setUser(authenticatedUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      // O listener também pode disparar o fim do loading, mas a chamada getSession acima é mais garantida para o estado inicial.
      if (isLoading) setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [isLoading]); // Adicionado isLoading como dependência para o listener

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!supabase) {
      console.error('Supabase client is not initialized. Cannot log in.');
      // Define o erro para ser exibido na tela de login
      setLastAuthError('Serviço de autenticação indisponível. Verifique a configuração do Supabase (VITE_SUPABASE_URL/ANON_KEY).');
      return false; 
    }
    
    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    const translateAuthError = (err: any): string => {
      const msg = err?.message || '';
      if (/Email not confirmed/i.test(msg)) {
        return 'Email não confirmado. Verifique sua caixa de entrada.';
      }
      if (/Invalid login credentials/i.test(msg)) {
        return 'Email ou senha inválidos';
      }
      if (/Invalid password/i.test(msg)) {
        return 'Senha inválida';
      }
      if (/rate limit/i.test(msg)) {
        return 'Muitas tentativas. Tente novamente mais tarde.';
      }
      return 'Falha na autenticação. Tente novamente.';
    };

    const { data: _data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: normalizedPassword });

    if (error) {
      console.error('Erro de login no Supabase:', error.message);
      setLastAuthError(translateAuthError(error));
      if (/Email not confirmed/i.test(error.message)) {
        try {
          // @ts-ignore
          await supabase.auth.resend({ type: 'signup', email: normalizedEmail });
        } catch (e) {
          console.warn('Falha ao reenviar confirmação:', e);
        }
      }
      setIsLoading(false); 
      return false;
    }

    setLastAuthError(null);
    // onAuthStateChange irá lidar com a definição do estado do usuário e a limpeza do loading
    return true;
  };

  const logout = async () => {
    setIsLoading(true);
    if (!supabase) {
      setUser(null)
      setIsAuthenticated(false)
      setIsLoading(false)
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro de logout no Supabase:', error.message);
    }
    setLastAuthError(null);
  };

  const updateProfile = async (name: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (!supabase) {
        return false;
      }

      const { error } = await supabase.auth.updateUser({ data: { name } });
      if (error) {
        console.error('Erro ao atualizar perfil:', error.message);
        return false;
      }

      // Buscar user atualizado e refletir no contexto
      const { data: { user: updatedUser }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) {
        console.error('Erro ao obter usuário após update:', getUserError.message);
        return true; // Update foi feito; mesmo sem refletir imediatamente
      }
      if (updatedUser) {
        setUser(mapSupabaseUserToAppUser(updatedUser));
      }
      return true;
    } catch (e) {
      console.error('Falha no updateProfile:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      if (!supabase) {
        return { ok: false, error: 'Serviço de autenticação indisponível' };
      }

      // Verifica senha atual com re-autenticação
      const email = user?.email;
      if (!email) {
        return { ok: false, error: 'Usuário inválido' };
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        return { ok: false, error: 'senha atual incorreta' };
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        console.error('Erro ao alterar senha:', updateErr.message);
        return { ok: false, error: 'Erro ao alterar senha' };
      }

      return { ok: true };
    } catch (e) {
      console.error('Falha no changePassword:', e);
      return { ok: false, error: 'Erro inesperado' };
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated,
    isLoading, // Exporta o estado de loading
    lastAuthError: lastAuthError ?? undefined,
    updateProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};