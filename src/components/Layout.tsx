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
  Menu as MenuIcon,
  Pin // Importando o novo ícone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import StandardCheckbox from './StandardCheckbox'; // Importando o checkbox

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Estado para mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Estado para desktop (auto)
  const [isHovering, setIsHovering] = useState(false);
  
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, isMenuManual, toggleMenuManual } = useTheme(); // Usando isMenuManual
  const location = useLocation();

  // Efeito para controlar a retração automática (apenas se não for manual)
  useEffect(() => {
    if (!isMenuManual && !isHovering) {
      // Retrai imediatamente
      setSidebarCollapsed(true);
    }
  }, [isHovering, isMenuManual]);
  
  // Efeito para sincronizar o estado de abertura/colapso no modo manual
  useEffect(() => {
    if (isMenuManual) {
        // No modo manual, o estado de abertura do mobile (sidebarOpen) é usado para controlar o estado de colapso do desktop.
        // Se sidebarOpen for true, o menu deve estar expandido (collapsed=false).
        setSidebarCollapsed(!sidebarOpen);
    }
  }, [isMenuManual, sidebarOpen]);

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
  
  // Função para alternar o estado do menu no modo manual (desktop)
  const toggleManualMenu = () => {
    // No modo manual, alternamos o estado de abertura (que controla o colapso via useEffect)
    setSidebarOpen(prev => !prev);
  };
  
  // Determina se o menu deve estar expandido (para desktop)
  const isExpanded = isMenuManual ? sidebarOpen : !sidebarCollapsed;
  
  // Determina se o menu está no modo automático (expansão por hover)
  const isAutoMode = !isMenuManual;
  
  // CORREÇÃO: A largura do menu depende diretamente de isExpanded
  const menuWidthClass = isExpanded ? 'lg:w-72' : 'lg:w-20';

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
        className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${menuWidthClass} z-50 overflow-x-hidden`}
        onMouseEnter={() => {
          if (isAutoMode) {
            setIsHovering(true);
            setSidebarCollapsed(false);
          }
        }}
        onMouseLeave={() => {
          if (isAutoMode) {
            setIsHovering(false);
            setSidebarCollapsed(true); // Retrai imediatamente
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
            
            {/* Botão de Toggle Manual (Visível apenas no modo manual) */}
            {isMenuManual && (
                <button
                    onClick={toggleManualMenu}
                    className={`btn-ghost p-2 flex-shrink-0 ${isExpanded ? 'ml-auto' : 'hidden'}`}
                    title={isExpanded ? 'Recolher Menu' : 'Expandir Menu'}
                >
                    <MenuIcon className="h-5 w-5" />
                </button>
            )}
          </div>
          
          {/* Botão de Toggle Manual (Visível quando colapsado no modo manual) */}
          {isMenuManual && !isExpanded && (
            <div className="p-3 flex justify-center">
                <button
                    onClick={toggleManualMenu}
                    className={`btn-ghost p-3`}
                    title={'Expandir Menu'}
                >
                    <MenuIcon className="h-5 w-5" />
                </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
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
          {/* Adicionando altura mínima para o contêiner do Menu Manual para estabilizar o footer */}
          <div className={`border-t border-slate-200 dark:border-slate-800 p-4 transition-all duration-300 ${!isExpanded ? 'flex flex-col items-center' : ''}`}>
            <div className={`w-full ${!isExpanded ? 'flex flex-col items-center space-y-2' : 'space-y-3'}`}>
              
              {/* Checkbox Menu Manual - Envolvido em um div com altura fixa para estabilizar a linha divisória */}
              <div className={`w-full transition-all duration-300 ${!isExpanded ? 'flex justify-center' : ''} h-10 flex items-center`}>
                {isExpanded ? (
                    <StandardCheckbox
                        label="Menu Manual"
                        checked={isMenuManual}
                        onChange={toggleMenuManual}
                        className="w-full"
                    />
                ) : (
                    <button
                        onClick={toggleMenuManual}
                        className={`btn-ghost p-3`}
                        title="Menu Manual"
                    >
                        <Pin className={`h-5 w-5 ${isMenuManual ? 'text-red-600' : 'text-slate-400'}`} />
                    </button>
                )}
              </div>
              
              {/* Botão de Sair */}
              <button
                onClick={handleLogout}
                className={`btn-ghost w-full justify-center ${!isExpanded ? 'p-3' : 'px-4 py-2'}`}
              >
                <LogOut className="h-5 w-5" />
                {isExpanded && <span className="ml-2">Sair</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isExpanded ? 'lg:pl-72' : 'lg:pl-20'}`}>
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