import React, { useMemo, useState, useEffect } from 'react';
import { X, User, AlertTriangle } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { Parceiro, Motorista } from '../../types';
import { formatDocument, formatContact, parseDocument, isValidCPF } from '../../utils/formatters';
import { CPFService, CPFData } from '../../services/cpfService';
import { showError } from '../../utils/toast'; // Importando showError

// Tipagem para o formulário (string para validadeCnh)
export interface MotoristaFormData extends Omit<Motorista, 'id' | 'createdAt' | 'updatedAt' | 'parceiroId' | 'validadeCnh' | 'dataNascimento'> {
  parceiroId: string;
  validadeCnh: string; // String format YYYY-MM-DD
  dataNascimentoStr?: string; // String format YYYY-MM-DD
}

interface MotoristaFormModalProps {
  isOpen: boolean;
  parceiroId: string;
  parceiros: Parceiro[];
  formData: MotoristaFormData;
  setFormData: React.Dispatch<React.SetStateAction<MotoristaFormData>>;
  editingId: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const MotoristaFormModal: React.FC<MotoristaFormModalProps> = ({
  isOpen,
  parceiroId,
  parceiros,
  formData,
  setFormData,
  editingId,
  onClose,
  onSubmit,
}) => {
  const { modalRef } = useModal({ isOpen, onClose });
  
  const parceiroProprietario = useMemo(() => parceiros.find(p => p.id === parceiroId), [parceiros, parceiroId]);
  
  // NOVO: Estados para consulta de CPF
  const [consultandoCPF, setConsultandoCPF] = useState(false);
  const [cpfConsultado, setCpfConsultado] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [lastConsultedCpf, setLastConsultedCpf] = useState('');

  // Efeito para resetar estados de consulta ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
        const cleanCpf = parseDocument(formData.cpf || '');
        if (cleanCpf.length === 11) {
            setCpfConsultado(true);
            setLastConsultedCpf(cleanCpf);
        } else {
            setCpfConsultado(false);
            setLastConsultedCpf('');
        }
        setCpfError('');
        setConsultandoCPF(false);
    }
  }, [isOpen, formData.cpf]);
  
  // --- CONSULTA API CPF ---
  const handleCPFConsultation = async (cpf: string) => {
    const cpfLimpo = parseDocument(cpf);
    setCpfError('');
    
    if (cpfLimpo.length !== 11) return;
    
    if (!isValidCPF(cpfLimpo)) {
        setCpfError('CPF inválido. Verifique os dígitos.');
        return;
    }
    
    if (cpfLimpo === lastConsultedCpf && cpfConsultado && !consultandoCPF) {
        return;
    }
    
    if (consultandoCPF) return;

    setConsultandoCPF(true);
    setCpfConsultado(false);
    
    try {
      const dados: CPFData | null = await CPFService.consultarCPF(cpf); 
      
      if (dados) {
        setFormData(prev => ({
          ...prev,
          nome: dados.nome || prev.nome,
          telefone: dados.telefone || prev.telefone,
          
          // NOVOS CAMPOS DE IDENTIFICAÇÃO PESSOAL
          dataNascimentoStr: dados.dataNascimento || prev.dataNascimentoStr,
          rg: dados.rg || prev.rg,
          orgaoEmissor: dados.orgaoEmissor || prev.orgaoEmissor,
        }));
        setCpfConsultado(true);
        setLastConsultedCpf(cpfLimpo);
        setCpfError('');
        if (dados.simulado) {
          showError('Não foi possível conectar com a API de CPF. Usando dados simulados como fallback.');
        }
      } else {
        setCpfError('CPF válido, mas não encontrado na base de dados externa.');
        setLastConsultedCpf('');
      }
    } catch (err) {
      console.error('Erro ao consultar CPF:', err);
      setCpfError(err instanceof Error ? err.message : 'Erro ao consultar CPF. Verifique o número e tente novamente.');
      setConsultandoCPF(false); // CORRIGIDO: setLastConsultandoCPF -> setConsultandoCPF
    } finally {
      setConsultandoCPF(false);
    }
  };
  
  const handleSubmitWrapper = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCpf = parseDocument(formData.cpf);
    if (!isValidCPF(cleanCpf)) {
        setCpfError('CPF inválido. Verifique os dígitos.');
        return;
    }
    
    // Ajustamos o `formData` antes de chamar `onSubmit`
    setFormData(prev => ({
        ...prev,
        cpf: cleanCpf,
        telefone: parseDocument(prev.telefone || ''),
        validadeCnh: prev.validadeCnh, // Mantido como string para o submit do pai
        dataNascimentoStr: prev.dataNascimentoStr, // Mantido como string para o submit do pai
    }));
    
    // O componente pai (Parceiros.tsx) fará a conversão final para o objeto Motorista
    // e chamará o update/create.
    
    onSubmit(e);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? 'Editar Motorista' : 'Novo Motorista'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Informação do Parceiro Proprietário (Fixo) */}
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center gap-3">
              <User className="h-5 w-5 text-green-600" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                  Parceiro Vinculado: <span className="font-semibold">{parceiroProprietario?.nome || 'N/A'}</span>
              </p>
          </div>

          <form onSubmit={handleSubmitWrapper} className="space-y-4">
            
            {/* Nome e CPF */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CPF *
                    {consultandoCPF && (
                        <span className="ml-2 text-blue-500 text-xs">Consultando...</span>
                    )}
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => {
                    const formatted = formatDocument(e.target.value, 'PF');
                    const limpo = parseDocument(formatted);
                    
                    if (limpo !== parseDocument(formData.cpf || '')) {
                        setCpfConsultado(false);
                    }
                    
                    setFormData(prev => ({ ...prev, cpf: formatted }));
                    setCpfError('');
                    
                    if (limpo.length === 11) {
                        handleCPFConsultation(formatted);
                    }
                  }}
                  className={`input-field ${consultandoCPF ? 'opacity-50' : ''}`}
                  placeholder="000.000.000-00"
                  disabled={consultandoCPF}
                  required
                />
                {cpfError && (
                    <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
                        <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                        <p className="text-xs text-red-700 dark:text-red-400">{cpfError}</p>
                    </div>
                )}
                {cpfConsultado && !cpfError && (
                    <p className="text-green-600 text-xs mt-1">✓ Dados consultados automaticamente</p>
                )}
              </div>
            </div>
            
            {/* NOVOS CAMPOS DE IDENTIFICAÇÃO PESSOAL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                <div className="md:col-span-3">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white">Identificação Pessoal</h4>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Nasc.</label>
                    <input
                        type="date"
                        value={formData.dataNascimentoStr || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, dataNascimentoStr: e.target.value }))}
                        className="input-field"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RG</label>
                    <input
                        type="text"
                        value={formData.rg || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, rg: e.target.value }))}
                        className="input-field"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Órgão Emissor</label>
                    <input
                        type="text"
                        value={formData.orgaoEmissor || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, orgaoEmissor: e.target.value }))}
                        className="input-field"
                    />
                </div>
            </div>
            
            {/* CNH e Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNH *</label>
                <input
                  type="text"
                  value={formData.cnh}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnh: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria CNH</label>
                <input
                  type="text"
                  value={formData.categoriaCnh}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoriaCnh: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Validade CNH</label>
                <input
                  type="date"
                  value={formData.validadeCnh}
                  onChange={(e) => setFormData(prev => ({ ...prev, validadeCnh: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>
            
            {/* Contato e Nacionalidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: formatContact(e.target.value) }))}
                  className="input-field"
                  placeholder="Ex: (11) 98765-4321"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nacionalidade</label>
                <select
                  value={formData.nacionalidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, nacionalidade: e.target.value as Motorista['nacionalidade'] }))}
                  className="input-field"
                >
                  <option value="Brasileiro">Brasileiro</option>
                  <option value="Estrangeiro">Estrangeiro</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-4 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1" disabled={consultandoCPF || !!cpfError}>
                {editingId ? 'Salvar alterações' : 'Adicionar Motorista'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MotoristaFormModal;