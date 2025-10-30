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
  return {
    id: sessionUser.id,
    email: sessionUser.email || 'N/A',
    name: sessionUser.email || 'Usuário Autenticado',
    createdAt: new Date(sessionUser.created_at!),
    updatedAt: new Date(sessionUser.updated_at!),
  };
};


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true) // Novo estado de loading

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client is not initialized. Authentication will not work.');
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

  const logout = async () => {
    if (!supabase) {
      console.error('Supabase client is not initialized. Cannot log out.');
      return;
    }
    // Define loading como true durante o logout
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro de logout no Supabase:', error.message);
    }
    // onAuthStateChange irá lidar com a limpeza do estado do usuário e a limpeza do loading
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated,
    isLoading // Exporta o estado de loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};