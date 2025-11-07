import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { formatCNPJ, parseDocument, formatDocument } from '../../utils/formatters';
import { Veiculo } from '../../types';
import { PermissoService, AnttVeiculoApiData } from '../../services/permissoService'; // Importando o novo tipo AnttVeiculoApiData
// import { showError } from '../../utils/toast'; // Importando showError

export interface PermissoData {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  enderecoCompleto?: string; // CORRIGIDO: Tornando opcional para compatibilidade com PermissoInternacional
  simulado?: boolean;
}

interface PermissoModalProps {
  isOpen: boolean;
  veiculo: Veiculo;
  onClose: () => void;
  onSave: (veiculoId: string, data: PermissoData, chassi?: string) => void; // onSave usa PermissoData
  existingPermisso: PermissoData | null; // existingPermisso usa PermissoData
}

const PermissoModal: React.FC<PermissoModalProps> = ({ isOpen, veiculo, onClose, onSave, existingPermisso }) => {
  const [formData, setFormData] = useState<PermissoData>({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    enderecoCompleto: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSimulated, setIsSimulated] = useState(false);
  const [newChassi, setNewChassi] = useState<string | undefined>(undefined); // Estado para o novo CHASSI

  const { modalRef } = useModal({ isOpen, onClose });

  useEffect(() => {
    if (isOpen) {
      if (existingPermisso) {
        setFormData({
          razaoSocial: existingPermisso.razaoSocial || '',
          nomeFantasia: existingPermisso.nomeFantasia || '',
          // CORREÇÃO: Formata o CNPJ para exibição no formulário
          cnpj: formatDocument(existingPermisso.cnpj || '', 'PJ'),
          enderecoCompleto: existingPermisso.enderecoCompleto || '',
          simulado: existingPermisso.simulado,
        });
        setIsSimulated(existingPermisso.simulado || false);
      } else {
        setFormData({
          razaoSocial: '',
          nomeFantasia: '',
          cnpj: '',
          enderecoCompleto: '',
        });
        setIsSimulated(false);
      }
      setNewChassi(undefined);
      setError('');
    }
  }, [isOpen, existingPermisso]);

  const handleFetchPermisso = async () => {
    // Obtém a placa principal (Cavalo ou Truck)
    const placa = veiculo.placa || veiculo.placaCavalo || veiculo.placaCarreta;
    if (!placa) {
      setError('Placa do veículo não encontrada.');
      return;
    }
    
    // Remove traços e formatação para a consulta
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');

    setLoading(true);
    setError('');
    setIsSimulated(false);

    try {
      // Usando consultarAnttVeiculo
      const data: AnttVeiculoApiData & { enderecoCompleto?: string } | null = await PermissoService.consultarAnttVeiculo(placaLimpa);
      
      if (data) {
        setFormData({
          // Mapeia os dados da ANTT para o formulário de Permisso
          razaoSocial: data.razaoSocial || '',
          nomeFantasia: data.nomeFantasia || '', // Mapeando nome fantasia (se a API retornar)
          cnpj: formatCNPJ(parseDocument(data.cnpj || '')), // CNPJ formatado
          enderecoCompleto: data.enderecoCompleto || '', // AGORA CAPTURA O ENDEREÇO
        });
        
        // 1. Atualiza o CHASSI se for diferente do atual
        if (data.chassi && data.chassi !== veiculo.chassis) {
            setNewChassi(data.chassi);
        } else {
            setNewChassi(undefined);
        }
        
        setIsSimulated(false);
      } else {
        setError('Nenhum dado ANTT encontrado para esta placa.');
      }

    } catch (err) {
      // Loga o erro completo para diagnóstico
      console.error('Erro na consulta do permisso (detalhes):', err);
      
      // Exibe a mensagem de erro completa retornada pelo serviço
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      
      // Se for um erro de rede genérico (como timeout ou CORS), exibe uma mensagem mais amigável
      if (errorMessage.includes('Network Error') || errorMessage.includes('timeout')) {
          setError('Falha de comunicação com a API externa. Tente novamente ou verifique sua conexão.');
      } else {
          setError(errorMessage);
      }
      
      setIsSimulated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!formData.razaoSocial || !formData.cnpj) {
      setError('Razão Social e CNPJ são obrigatórios.');
      return;
    }
    
    // Chama onSave, passando o novo CHASSI se ele foi encontrado
    onSave(veiculo.id, {
      ...formData,
      // Não limpa o CNPJ aqui, pois o componente pai (Parceiros.tsx) fará isso.
      // Apenas garante que o CNPJ esteja no formato de exibição (se for o caso)
      cnpj: formData.cnpj, 
      simulado: isSimulated
    }, newChassi);
    
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
              Permisso Internacional (Consulta Externa)
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
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
              <pre className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap font-mono">{error}</pre>
            </div>
          )}
          
          {newChassi && (
            <div className="p-3 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                CHASSI atualizado! O novo CHASSI ({newChassi}) será salvo no veículo.
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
                  Consultando ANTT Veículo...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Atualizar Dados do Permisso (ANTT)
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
                  onChange={(e) => setFormData({ ...formData, cnpj: formatDocument(e.target.value, 'PJ') })}
                  className="input-field"
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Endereço
                </label>
                <textarea
                  value={formData.enderecoCompleto}
                  onChange={(e) => setFormData({ ...formData, enderecoCompleto: e.target.value })}
                  className="input-field resize-y"
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