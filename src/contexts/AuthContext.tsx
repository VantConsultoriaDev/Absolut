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

  // Gerador simples de UUID caso crypto.randomUUID não esteja disponível
  const generateUuid = () => {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      // @ts-ignore
      return (crypto as any).randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client is not initialized. Authentication will not work.');
      // Recupera usuário demo se existir
      const demoRaw = localStorage.getItem('absolut_demo_user')
      if (demoRaw) {
        try {
          const demo = JSON.parse(demoRaw)
          const demoUser: User = {
            id: demo.id,
            email: demo.email,
            name: demo.name,
            createdAt: new Date(demo.createdAt),
            updatedAt: new Date(demo.updatedAt)
          }
          setUser(demoUser)
          setIsAuthenticated(true)
        } catch (e) {
          console.error('Erro ao carregar sessão demo:', e)
          localStorage.removeItem('absolut_demo_user')
        }
      }
      setIsLoading(false); // Se não houver Supabase, termina o loading
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const authenticatedUser = mapSupabaseUserToAppUser(session.user);
        
        setUser(authenticatedUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false); // Termina o loading após a mudança de estado
    });

    // Verificação da sessão inicial (para garantir que o estado inicial seja definido)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const authenticatedUser = mapSupabaseUserToAppUser(session.user);
        if (authenticatedUser) {
          setUser(authenticatedUser);
          setIsAuthenticated(true);
        }
      }
      // O onAuthStateChange já deve ter definido isLoading=false, mas garantimos aqui também
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!supabase) {
      console.error('Supabase client is not initialized. Cannot log in.');
      // Retorna false imediatamente se o cliente não estiver pronto
      return false; 
    }
    
    // Define loading como true durante a tentativa de login
    setIsLoading(true);
    
    const { data: _data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('Erro de login no Supabase:', error.message);
      setIsLoading(false); // Se houver erro, termina o loading
      return false;
    }

    // onAuthStateChange irá lidar com a definição do estado do usuário e a limpeza do loading
    return true;
  };

  const loginDemo = async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      const demoUser: User = {
        id: generateUuid(),
        email: 'demo@absolut.local',
        name: 'Usuário Demo',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      localStorage.setItem('absolut_demo_user', JSON.stringify(demoUser))
      setUser(demoUser)
      setIsAuthenticated(true)
      return true
    } catch (e) {
      console.error('Falha no login demo:', e)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    // Define loading como true durante o logout
    setIsLoading(true);
    if (!supabase) {
      // Logout local/demo
      localStorage.removeItem('absolut_demo_user')
      setUser(null)
      setIsAuthenticated(false)
      setIsLoading(false)
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro de logout no Supabase:', error.message);
    }
    // onAuthStateChange irá lidar com a limpeza do estado do usuário e a limpeza do loading
  };

  const updateProfile = async (name: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (!supabase) {
        // Atualiza usuário demo local
        const demoRaw = localStorage.getItem('absolut_demo_user');
        if (demoRaw) {
          const demo = JSON.parse(demoRaw);
          const updated = { ...demo, name, updatedAt: new Date().toISOString() };
          localStorage.setItem('absolut_demo_user', JSON.stringify(updated));
          const demoUser: User = {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            createdAt: new Date(updated.createdAt),
            updatedAt: new Date(updated.updatedAt)
          };
          setUser(demoUser);
          return true;
        }
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
        return { ok: false, error: 'Funcionalidade indisponível no modo demo' };
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
    loginDemo,
    logout,
    isAuthenticated,
    isLoading, // Exporta o estado de loading
    updateProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};