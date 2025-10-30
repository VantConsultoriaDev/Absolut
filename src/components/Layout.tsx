import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  DollarSign, 
  Truck, 
  Users, 
  Menu, 
  X, 
  Sun, 
  Moon,
  LogOut,
  ChevronRight,
  UserCheck,
  FileText // Novo ícone para Contratos
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()

  useEffect(() => {
    if (!isHovering) {
      const timer = setTimeout(() => {
        setSidebarCollapsed(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isHovering])

  const navigation = [
    { name: 'Início', href: '/inicio', icon: Home, permission: 'inicio' },
    { name: 'Financeiro', href: '/financeiro', icon: DollarSign, permission: 'financeiro' },
    { name: 'Cargas', href: '/cargas', icon: Truck, permission: 'cargas' },
    { name: 'Contratos de Frete', href: '/contratos', icon: FileText, permission: 'cargas' },
    { name: 'Parceiros', href: '/parceiros', icon: UserCheck, permission: 'parceiros' },
    { name: 'Clientes', href: '/clientes', icon: Users, permission: 'clientes' },
  ]

  // Simplificando a verificação de permissão: se o usuário existe, ele tem acesso.
  // A lógica de permissões granulares (view/edit) foi removida com o módulo de usuários.
  const hasPermission = (permission: string) => {
    return !!user
  }

  const filteredNavigation = navigation.filter(item => hasPermission(item.permission))

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black/20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">ABSOLUT</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="btn-ghost p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-4">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Desktop Sidebar */}
      <div 
        className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${sidebarCollapsed && !isHovering ? 'lg:w-20' : 'lg:w-72'} z-30`}
        onMouseEnter={() => {
          setIsHovering(true)
          setSidebarCollapsed(false)
        }}
        onMouseLeave={() => {
          setIsHovering(false)
        }}
      >
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300">
          {/* Logo */}
          <div className="h-20 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 w-full">
              <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <span className={`text-lg font-bold text-slate-900 dark:text-white transition-all duration-300 whitespace-nowrap ${sidebarCollapsed && !isHovering ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                ABSOLUT
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href
              const isCollapsed = sidebarCollapsed && !isHovering
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                    {item.name}
                  </span>
                  {!isCollapsed && isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              )
            })}
          </nav>

          {/* Footer - User Info (Desktop only) */}
          <div className={`border-t border-slate-200 dark:border-slate-800 p-4 transition-all duration-300 ${sidebarCollapsed && !isHovering ? 'flex justify-center' : ''}`}>
            <div className={`${sidebarCollapsed && !isHovering ? 'flex justify-center' : 'space-y-3'}`}>
              {!sidebarCollapsed && <div className="px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
                <p className="font-semibold text-slate-900 dark:text-white truncate">{user?.email}</p>
                <p className="text-slate-500 dark:text-slate-400 capitalize">Usuário Autenticado</p>
              </div>}
              <button
                onClick={handleLogout}
                className={`btn-ghost w-full justify-center ${!sidebarCollapsed && !isHovering ? '' : ''}`}
              >
                <LogOut className="h-5 w-5" />
                {!sidebarCollapsed && <span className="ml-2">Sair</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed && !isHovering ? 'lg:pl-20' : 'lg:pl-72'}`}>
        {/* Top Header */}
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
          {/* Mobile Menu */}
          <button
            type="button"
            className="btn-ghost p-2 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Header Title / Breadcrumb (Future enhancement) */}
          <div className="flex-1 flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Dashboard</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="btn-ghost p-2"
              aria-label="Toggle theme"
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? (
                <Sun className="h-5 w-5 text-amber-500" />
              ) : (
                <Moon className="h-5 w-5 text-slate-600" />
              )}
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            {/* User Menu & Logout (Desktop) */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex flex-col items-end text-right">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {user?.email}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  Usuário Autenticado
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-ghost p-2"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

            {/* User Menu (Mobile) */}
            <button
              onClick={handleLogout}
              className="btn-ghost p-2 sm:hidden"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout