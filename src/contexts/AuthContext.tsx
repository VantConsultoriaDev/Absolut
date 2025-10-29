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

// Função para buscar ou criar o perfil do usuário
const fetchOrCreateProfile = async (sessionUser: any): Promise<User | null> => {
  if (!supabase) return null;

  // 1. Tenta buscar o perfil existente
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, role, permissions')
    .eq('id', sessionUser.id)
    .single();

  // 2. Se o perfil não existir (e não for um erro de RLS ou outro erro grave), cria um perfil padrão
  if (profileError && profileError.code === 'PGRST116') { // PGRST116: Linha não encontrada (perfil não existe)
    console.warn('Perfil não encontrado. Criando perfil padrão...');
    
    const defaultRole = (sessionUser.app_metadata?.role as 'admin' | 'master' | 'comum') || 'comum';
    const defaultPermissions = getPermissionsByRole(defaultRole);

    const newProfileData = {
      id: sessionUser.id,
      first_name: sessionUser.email?.split('@')[0] || 'Usuário',
      last_name: '',
      role: defaultRole,
      permissions: defaultPermissions,
      created_at: new Date(),
      updated_at: new Date()
    };

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert([newProfileData])
      .select('first_name, last_name, role, permissions')
      .single();

    if (insertError) {
      console.error('Erro ao criar perfil padrão:', insertError);
      // Se falhar ao inserir, retorna o perfil padrão sem tentar buscar novamente
      profile = newProfileData;
    } else {
      profile = newProfile;
    }
  } else if (profileError) {
    console.error('Erro ao buscar perfil do usuário:', profileError);
    // Se for outro erro (ex: RLS), usa o fallback de dados do auth.users
    const defaultRole = (sessionUser.app_metadata?.role as 'admin' | 'master' | 'comum') || 'comum';
    profile = {
      first_name: sessionUser.email?.split('@')[0] || 'Usuário',
      last_name: '',
      role: defaultRole,
      permissions: getPermissionsByRole(defaultRole)
    };
  }

  // 3. Monta o objeto User para o contexto
  if (profile) {
    const userRole = (profile.role as 'admin' | 'master' | 'comum') || 'comum';
    return {
      id: sessionUser.id,
      username: profile.first_name || sessionUser.email || 'unknown',
      email: sessionUser.email || undefined,
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || sessionUser.email || 'Unknown User',
      role: userRole,
      isActive: true,
      // Type assertion para garantir que 'permissions' está no formato correto
      permissions: (profile.permissions as User['permissions']) || getPermissionsByRole(userRole),
      createdAt: new Date(sessionUser.created_at!),
      updatedAt: new Date(sessionUser.updated_at!),
      password: ''
    };
  }

  return null;
};


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client is not initialized. Authentication will not work.');
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const authenticatedUser = await fetchOrCreateProfile(session.user);
        
        if (authenticatedUser) {
          setUser(authenticatedUser);
          setIsAuthenticated(true);
        } else {
          // Se falhar ao buscar/criar o perfil, desloga por segurança
          await supabase.auth.signOut();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    // Verificação da sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // onAuthStateChange já lidou com isso, mas garantimos o estado inicial
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
      // onAuthStateChange irá lidar com a definição do estado do usuário e criação do perfil, se necessário
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