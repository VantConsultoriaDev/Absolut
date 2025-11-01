import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
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
  FileText,
  Briefcase,
  FileBadge,
  Pin 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
// StandardCheckbox não é mais necessário aqui

const Layout: React.FC = () => {
  // sidebarOpen: Usado para Mobile E para o estado de expansão no MODO MANUAL (Desktop)
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  // sidebarCollapsed: Usado para o estado de colapso no MODO AUTOMÁTICO (Desktop)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); 
  const [isHovering, setIsHovering] = useState(false);
  
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, isMenuManual, toggleMenuManual } = useTheme(); 
  const location = useLocation();

  // Determina se o menu está no modo automático (expansão por hover)
  const isAutoMode = !isMenuManual;
  
  // Determina se o menu deve estar expandido (para desktop)
  const isExpanded = isMenuManual ? sidebarOpen : !sidebarCollapsed;
  
  // Efeito para controlar a retração automática (apenas se estiver no modo automático)
  useEffect(() => {
    if (isAutoMode && !isHovering) {
      // Adiciona um pequeno delay para evitar fechamento acidental
      const timeout = setTimeout(() => {
        setSidebarCollapsed(true);
      }, 100); 
      return () => clearTimeout(timeout);
    }
  }, [isHovering, isAutoMode]);
  
  // CORREÇÃO: A largura do menu depende diretamente de isExpanded
  const menuWidthClass = isExpanded ? 'lg:w-72' : 'lg:w-20';

  // Handler para o botão Pin (Alterna entre modo Manual e Automático)
  const handlePinToggle = () => {
    const wasManual = isMenuManual; // Estado antes do toggle
    const wasExpanded = isExpanded; // Estado visual antes do toggle

    toggleMenuManual(); // Toggles isMenuManual (agora é !wasManual)
    
    if (wasManual) {
      // Transição: Manual -> Auto (Sempre colapsa e entra em modo hover)
      setSidebarOpen(false); 
      setSidebarCollapsed(true); 
    } else {
      // Transição: Auto -> Manual (Fixar)
      if (wasExpanded) {
        // Se estava expandido (por hover), fixa expandido.
        setSidebarOpen(true); 
        setSidebarCollapsed(false); 
      } else {
        // Se estava retraído, fixa retraído.
        setSidebarOpen(false); // Mantém retraído no modo manual
        setSidebarCollapsed(false); // Desabilita o colapso automático
      }
    }
  };

  const navigation = [
    { name: 'Início', href: '/inicio', icon: Home, permission: 'inicio' },
    { name: 'Financeiro', href: '/financeiro', icon: DollarSign, permission: 'financeiro' },
    { name: 'Cargas', href: '/cargas', icon: Truck, permission: 'cargas' },
    { name: 'Contratos', href: '/contratos', icon: FileText, permission: 'cargas' },
    { name: 'CRT/MIC', href: '/crt-mic', icon: FileBadge, permission: 'cargas' },
    { name: 'Parceiros', href: '/parceiros', icon: Briefcase, permission: 'parceiros' },
    { name: 'Clientes', href: '/clientes', icon: Users, permission: 'clientes' },
  ];

  const hasPermission = () => {
    return !!user;
  };

  const filteredNavigation = navigation.filter(() => hasPermission());

  const handleLogout = () => {
    logout();
  };
  
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
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
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
            const isActive = location.pathname === item.href;
            const IconComponent = item.icon;
            
            const iconColorClasses = isActive 
              ? 'text-red-700 dark:text-red-300' 
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300';

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
                <IconComponent className={`h-5 w-5 flex-shrink-0 ${iconColorClasses}`} />
                <span>{item.name}</span>
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop Sidebar */}
      <div 
        className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${menuWidthClass} z-50 overflow-y-hidden`}
        // O contêiner principal controla a persistência do hover (isHovering)
        onMouseEnter={() => {
          if (isAutoMode) {
            setIsHovering(true);
            // REMOVIDO: setSidebarCollapsed(false) - A expansão é disparada pela NAV
          }
        }}
        onMouseLeave={() => {
          if (isAutoMode) {
            setIsHovering(false);
          }
        }}
      >
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 overflow-hidden">
          {/* Logo e Botão de Toggle Manual */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 w-full">
              <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <span className={`text-lg font-bold text-slate-900 dark:text-white transition-all duration-300 whitespace-nowrap ${!isExpanded ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                ABSOLUT
              </span>
            </div>
          </div>
          
          {/* Navigation - Gatilho de Expansão */}
          <nav 
            className={`flex-1 space-y-1 px-3 py-4 ${isExpanded ? 'overflow-y-auto' : 'overflow-hidden'}`}
            onMouseEnter={() => {
              // Expande apenas se estiver no modo automático E colapsado
              if (isAutoMode && sidebarCollapsed) {
                setSidebarCollapsed(false);
              }
            }}
          >
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              
              const IconComponent = item.icon;
              
              const iconColorClasses = isActive 
                ? 'text-red-700 dark:text-red-300' 
                : 'text-slate-700 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-300';

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={!isExpanded ? item.name : undefined}
                  className={`group flex items-center rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-red-50 dark:bg-red-900/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${!isExpanded ? 'justify-center p-3' : 'px-4 py-3 gap-3'}`}
                >
                  <IconComponent className={`h-5 w-5 flex-shrink-0 ${iconColorClasses}`} />
                  <span className={`transition-all duration-300 ${!isExpanded ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 whitespace-nowrap'}`}>
                    {item.name}
                  </span>
                  {isExpanded && isActive && <ChevronRight className="h-4 w-4 ml-auto text-red-700 dark:text-red-300" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer - User Info & Logout (Desktop only) */}
          <div 
            className={`border-t border-slate-200 dark:border-slate-800 p-4 transition-all duration-300`}
          >
            <div className={`w-full flex flex-col ${!isExpanded ? 'items-center' : 'items-start'}`}>
              
              {/* Botão Pin/Fixar */}
              <button
                onClick={handlePinToggle}
                className={`btn-ghost p-2 flex-shrink-0 ${isExpanded ? 'w-full flex justify-start' : 'justify-center'}`}
                title={isMenuManual ? 'Desafixar Menu (Modo Automático)' : 'Fixar Menu (Modo Manual)'}
              >
                <Pin className={`h-5 w-5 ${isMenuManual ? 'text-red-600' : 'text-slate-400'}`} />
                {isExpanded && <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Fixar Menu</span>}
              </button>
              
              {/* Botão de Sair */}
              <button
                onClick={handleLogout}
                className={`btn-ghost p-2 flex-shrink-0 ${isExpanded ? 'w-full flex justify-start' : 'justify-center'}`}
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
                {isExpanded && <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Sair</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${menuWidthClass === 'lg:w-72' ? 'lg:pl-72' : 'lg:pl-20'}`}>
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
            {/* Conteúdo removido */}
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

            {/* User Menu (Mobile/Desktop) */}
            <button
              onClick={handleLogout}
              className="btn-ghost p-2"
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
  );
};

export default Layout;