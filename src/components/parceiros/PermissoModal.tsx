import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { formatCNPJ, parseDocument } from '../../utils/formatters';
import { Veiculo } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

interface PermissoData {
  razaoSocial: string;
  nomeFantasia?: string; // NOVO
  cnpj: string;
  enderecoCompleto: string;
  simulado?: boolean;
}

interface PermissoModalProps {
  isOpen: boolean;
  veiculo: Veiculo;
  onClose: () => void;
  onSave: (veiculoId: string, data: PermissoData) => void;
  existingPermisso: PermissoData | null;
}

const PermissoModal: React.FC<PermissoModalProps> = ({ isOpen, veiculo, onClose, onSave, existingPermisso }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<PermissoData>({
    razaoSocial: '',
    nomeFantasia: '', // NOVO
    cnpj: '',
    enderecoCompleto: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSimulated, setIsSimulated] = useState(false);

  const { modalRef } = useModal({ isOpen, onClose });

  useEffect(() => {
    if (isOpen) {
      if (existingPermisso) {
        setFormData({
          razaoSocial: existingPermisso.razaoSocial || '',
          nomeFantasia: existingPermisso.nomeFantasia || '', // NOVO
          cnpj: existingPermisso.cnpj || '',
          enderecoCompleto: existingPermisso.enderecoCompleto || '',
        });
        setIsSimulated(existingPermisso.simulado || false);
      } else {
        setFormData({
          razaoSocial: '',
          nomeFantasia: '', // NOVO
          cnpj: '',
          enderecoCompleto: '',
        });
        setIsSimulated(false);
      }
      setError('');
    }
  }, [isOpen, existingPermisso]);

  const handleFetchPermisso = async () => {
    if (!supabase || !user) {
      setError('Usuário não autenticado ou Supabase não configurado.');
      return;
    }
    
    const placa = veiculo.placa || veiculo.placaCavalo || veiculo.placaCarreta;
    if (!placa) {
      setError('Placa do veículo não encontrada.');
      return;
    }

    setLoading(true);
    setError('');
    setIsSimulated(false);

    try {
      const projectRef = 'qoeocxprlioianbordjt'; // Supabase Project ID
      const edgeFunctionUrl = `https://${projectRef}.supabase.co/functions/v1/consultar-permisso`;
      
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ placa }),
      });
      
      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Falha ao consultar permisso na Edge Function.');
      }

      const data: PermissoData = result.data;
      
      if (data) {
        setFormData({
          razaoSocial: data.razaoSocial || '',
          nomeFantasia: data.nomeFantasia || '', // NOVO: Preenche nome fantasia se vier da API
          cnpj: formatCNPJ(parseDocument(data.cnpj || '')),
          enderecoCompleto: data.enderecoCompleto || '',
        });
        setIsSimulated(data.simulado || false);
      } else {
        setError('Nenhum dado de permisso encontrado para esta placa.');
      }

    } catch (err) {
      console.error('Erro na consulta do permisso:', err);
      setError(`Erro ao buscar dados: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!formData.razaoSocial || !formData.cnpj) {
      setError('Razão Social e CNPJ são obrigatórios.');
      return;
    }
    onSave(veiculo.id, {
      ...formData,
      cnpj: parseDocument(formData.cnpj), // Salva CNPJ limpo
      simulado: isSimulated
    });
    onClose();
  };

  if (!isOpen) return null;

  const placaDisplay = veiculo.placa || veiculo.placaCavalo || veiculo.placaCarreta;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Permisso Internacional (ANTT/TRIC)
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Consultar dados do Permisso para a placa: <span className="font-bold">{placaDisplay}</span>
            </p>
            {existingPermisso && (
                <p className="text-xs mt-1 text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" /> Dados já cadastrados.
                </p>
            )}
          </div>

          {error && (
            <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          
          {isSimulated && (
            <div className="p-3 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                A consulta retornou dados simulados. A Edge Function não conseguiu acessar a ANTT.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleFetchPermisso}
              disabled={loading || !placaDisplay}
              className="btn-primary w-full justify-center"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Consultando ANTT...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Atualizar Dados do Permisso
                </>
              )}
            </button>

            {/* Formulário de Edição */}
            <form className="space-y-4 pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Razão Social *
                </label>
                <input
                  type="text"
                  value={formData.razaoSocial}
                  onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              
              {/* NOVO CAMPO: Nome Fantasia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome Fantasia (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.nomeFantasia}
                  onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CNPJ *
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                  className="input-field"
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Endereço Completo
                </label>
                <textarea
                  value={formData.enderecoCompleto}
                  onChange={(e) => setFormData({ ...formData, enderecoCompleto: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>
            </form>
          </div>

          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !formData.razaoSocial || !formData.cnpj}
              className="btn-primary flex-1"
            >
              Salvar Permisso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissoModal;