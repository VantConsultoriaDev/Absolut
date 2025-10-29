import React, { createContext, useContext, useState, useEffect } from 'react'
import { AuthContextType, User } from '../types'
import { useDatabase } from './DatabaseContext'

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { users, getUserById } = useDatabase()

  useEffect(() => {
    // Check if user is already logged in
    const savedUserId = localStorage.getItem('mobtax_user_id')
    if (savedUserId) {
      const savedUser = getUserById(savedUserId)
      if (savedUser) {
        setUser(savedUser)
        setIsAuthenticated(true)
      }
    }
  }, [getUserById])

  const login = async (username: string, password: string): Promise<boolean> => {
    // Admin global credentials
    if (username === 'Admin' && password === '@Vant96') {
      const adminUser: User = {
        id: 'admin-global',
        username: 'Admin',
        password: '@Vant96',
        email: 'admin@mobtax.com',
        name: 'Administrador Global',
        role: 'admin',
        isActive: true,
        permissions: {
          inicio: 'edit',
          financeiro: 'edit',
          cargas: 'edit',
          parceiros: 'edit',
          usuarios: 'edit'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setUser(adminUser)
      setIsAuthenticated(true)
      localStorage.setItem('mobtax_user_id', adminUser.id)
      return true
    }

    // Check other users
    const foundUser = users.find(u => u.username === username && u.password === password)
    if (foundUser) {
      setUser(foundUser)
      setIsAuthenticated(true)
      localStorage.setItem('mobtax_user_id', foundUser.id)
      return true
    }

    return false
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('mobtax_user_id')
  }

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}