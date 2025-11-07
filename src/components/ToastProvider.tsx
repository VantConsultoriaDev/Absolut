import React from 'react';
import { Toaster } from 'react-hot-toast';
// useTheme não é mais necessário aqui, pois o ToastContent lida com o modo escuro
// import { useTheme } from '../contexts/ThemeContext'; 

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // const { isDark } = useTheme(); // Removido
  
  return (
    <>
      <Toaster
        position="top-right"
        // Removemos toastOptions.style e duration, pois são definidos no toast.custom
        toastOptions={{
          success: {
            // Mantemos apenas as configurações de ícone, se necessário, mas o ToastContent já usa ícones Lucide
          },
          error: {
            // Mantemos apenas as configurações de ícone, se necessário
          },
        }}
      />
      {children}
    </>
  );
};

export default ToastProvider;