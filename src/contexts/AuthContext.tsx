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

// Helper para obter permissões com base no role
const getPermissionsByRole = (role: 'admin' | 'master' | 'comum'): User['permissions'] => {
  switch (role) {
    case 'admin':
      return {
        inicio: 'edit',
        financeiro: 'edit',
        cargas: 'edit',
        parceiros: 'edit',
        usuarios: 'edit'
      };
    case 'master':
      return {
        inicio: 'view',
        financeiro: 'edit',
        cargas: 'edit',
        parceiros: 'edit',
        usuarios: 'view'
      };
    case 'comum':
    default:
      return {
        inicio: 'view',
        financeiro: 'view',
        cargas: 'view',
        parceiros: 'view',
        usuarios: 'none'
      };
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client is not initialized. Authentication will not work.');
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => { // _event para ignorar o parâmetro não utilizado
      if (session) {
        // Buscar dados do perfil da tabela public.profiles
        const { data: profile, error: profileError } = await supabase! // Adicionado '!' para afirmar que supabase não é nulo
          .from('profiles')
          .select('first_name, last_name, role, permissions')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Erro ao buscar perfil do usuário:', profileError);
          // Fallback se o perfil não for encontrado ou houver erro
          const defaultRole = (session.user.app_metadata?.role as 'admin' | 'master' | 'comum') || 'comum';
          setUser({
            id: session.user.id,
            username: session.user.email || 'unknown',
            email: session.user.email || undefined,
            name: session.user.email || 'Unknown User',
            role: defaultRole,
            isActive: true,
            permissions: getPermissionsByRole(defaultRole),
            createdAt: new Date(session.user.created_at!), // Adicionado '!' para afirmar que created_at não é nulo
            updatedAt: new Date(session.user.updated_at!), // Adicionado '!' para afirmar que updated_at não é nulo
            password: ''
          });
        } else {
          const userRole = (profile.role as 'admin' | 'master' | 'comum') || 'comum';
          setUser({
            id: session.user.id,
            username: profile.first_name || session.user.email || 'unknown',
            email: session.user.email || undefined,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || session.user.email || 'Unknown User',
            role: userRole,
            isActive: true,
            // Type assertion para garantir que 'permissions' está no formato correto
            permissions: (profile.permissions as User['permissions']) || getPermissionsByRole(userRole),
            createdAt: new Date(session.user.created_at!), // Adicionado '!' para afirmar que created_at não é nulo
            updatedAt: new Date(session.user.updated_at!), // Adicionado '!' para afirmar que updated_at não é nulo
            password: ''
          });
        }
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    // Verificação da sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Isso será tratado pelo onAuthStateChange 'INITIAL_SESSION' ou 'SIGNED_IN'
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!supabase) {
      console.error('Supabase client is not initialized. Cannot log in.');
      return false;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('Erro de login no Supabase:', error.message);
      return false;
    }

    if (data.user) {
      // onAuthStateChange irá lidar com a definição do estado do usuário
      return true;
    }
    return false;
  };

  const logout = async () => {
    if (!supabase) {
      console.error('Supabase client is not initialized. Cannot log out.');
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro de logout no Supabase:', error.message);
    }
    // onAuthStateChange irá lidar com a limpeza do estado do usuário
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};