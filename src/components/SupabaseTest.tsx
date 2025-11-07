import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabaseClient';
import { CheckCircle, XCircle, AlertTriangle, Database } from 'lucide-react';

const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error' | 'disabled'>('testing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    if (!isSupabaseEnabled) {
      setConnectionStatus('disabled');
      setErrorMessage('Supabase não está configurado. Verifique as variáveis de ambiente.');
      return;
    }

    try {
      setConnectionStatus('testing');
      
      // Testa a conexão verificando as configurações do banco
      await supabase!.auth.getSession();
      
      // Se chegou até aqui sem erro, a conexão está funcionando
      setConnectionStatus('connected');
      setErrorMessage('');
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'disabled':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <Database className="h-6 w-6 text-blue-500 animate-pulse" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado ao Supabase';
      case 'error':
        return 'Erro na conexão';
      case 'disabled':
        return 'Supabase não configurado';
      default:
        return 'Testando conexão...';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'disabled':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div>
          <h3 className="font-semibold">{getStatusText()}</h3>
          {errorMessage && (
            <p className="text-sm mt-1">{errorMessage}</p>
          )}
          {connectionStatus === 'disabled' && (
            <div className="text-sm mt-2">
              <p>Para configurar o Supabase:</p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
                <li>Crie um novo projeto ou acesse um existente</li>
                <li>Vá em Settings → API</li>
                <li>Copie a Project URL e a anon public key</li>
                <li>Cole os valores no arquivo .env.local</li>
              </ol>
            </div>
          )}
          {connectionStatus === 'connected' && (
            <p className="text-sm mt-1">
              Pronto para usar! O banco de dados está acessível.
            </p>
          )}
        </div>
      </div>
      
      <button
        onClick={testConnection}
        className="mt-3 px-3 py-1 text-sm bg-white border border-current rounded hover:bg-opacity-50 transition-colors"
      >
        Testar novamente
      </button>
    </div>
  );
};

export default SupabaseTest;