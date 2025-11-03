import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, FileBadge } from 'lucide-react';
import CrtScreen from './crt-mic/CrtScreen';
import MicScreen from './crt-mic/MicScreen';

const CrtMic: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'crt' | 'mic'>('crt');

  // Reset para tela inicial quando navegado via menu lateral
  useEffect(() => {
    if (location.state?.resetModule) {
      setActiveTab('crt');
    }
  }, [location.state]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-3">
          <FileBadge className="h-8 w-8 text-red-600" />
          Emissão de Documentos Internacionais
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Gerenciamento de Certificado de Registro de Transportador (CRT) e Manifesto Internacional de Carga (MIC).
        </p>
      </div>

      {/* Abas de Navegação */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('crt')}
          className={`px-4 py-2 text-lg font-medium transition-colors ${
            activeTab === 'crt'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          } flex items-center gap-2`}
        >
          <FileText className="h-5 w-5" />
          CRT
        </button>
        <button
          onClick={() => setActiveTab('mic')}
          className={`px-4 py-2 text-lg font-medium transition-colors ${
            activeTab === 'mic'
              ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          } flex items-center gap-2`}
        >
          <FileText className="h-5 w-5" />
          MIC
        </button>
      </div>

      {/* Conteúdo da Aba */}
      <div className="pt-4">
        {activeTab === 'crt' && <CrtScreen />}
        {activeTab === 'mic' && <MicScreen />}
      </div>
    </div>
  );
};

export default CrtMic;