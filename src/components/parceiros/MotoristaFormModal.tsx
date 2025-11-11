import React, { useState, useEffect, useMemo } from 'react';
import { X, User, AlertTriangle, Truck } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { Parceiro, Motorista, Veiculo } from '../../types';
import { formatDocument, formatContact, parseDocument, isValidCPF } from '../../utils/formatters';
import { CPFService, CPFData } from '../../services/cpfService';
import { showError } from '../../utils/toast'; // Importando showError
import SearchableSelect, { SelectOption } from '../SearchableSelect'; // NOVO: Importando SearchableSelect

// Tipagem para o formulário (string para validadeCnh)
export interface MotoristaFormData extends Omit<Motorista, 'id' | 'createdAt' | 'updatedAt' | 'parceiroId' | 'validadeCnh' | 'dataNascimento'> {
  parceiroId: string;
  validadeCnh: string; // String format YYYY-MM-DD
  dataNascimentoStr?: string; // String format YYYY-MM-DD
  veiculoVinculado: string; // NOVO: ID do veículo vinculado
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
  parceiroVeiculos: Veiculo[]; // NOVO: Lista de veículos Cavalo/Truck do parceiro
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
  parceiroVeiculos, // NOVO
}) => {
  const { modalRef } = useModal({ isOpen, onClose });
  
  const parceiroProprietario = useMemo(() => parceiros.find(p => p.id === parceiroId), [parceiros, parceiroId]);
  
  // NOVO: Estados para consulta de CPF
  const [consultandoCPF, setConsultandoCPF] = useState(false);
  const [cpfConsultado, setCpfConsultado] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [lastConsultedCpf, setLastConsultedCpf] = useState('');
  
  // Opções de Veículo para o SearchableSelect
  const veiculoOptions: SelectOption[] = useMemo(() => {
    return parceiroVeiculos.map(v => ({
      id: v.id,
      name: `${v.tipo} - ${formatPlaca(v.placa || v.placaCavalo || '')}`,
      secondaryInfo: `${v.fabricante} ${v.modelo} (${v.ano})`,
      icon: Truck,
    }));
  }, [parceiroVeiculos]);

  // Efeito para resetar estados de consulta ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
        const cleanCpf = parseDocument(formData.cpf || '');
        if (formData.nacionalidade === 'Brasileiro' && cleanCpf.length === 11) {
            setCpfConsultado(true);
            setLastConsultedCpf(cleanCpf);
        } else {
            setCpfConsultado(false);
            setLastConsultedCpf('');
        }
        setCpfError('');
        setConsultandoCPF(false);
    }
  }, [isOpen, formData.cpf, formData.nacionalidade]);
  
  // --- CONSULTA API CPF ---
  const handleCPFConsultation = async (cpf: string) => {
    if (formData.nacionalidade === 'Estrangeiro') return;
    
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
      setConsultandoCPF(false);
    } finally {
      setConsultandoCPF(false);
    }
  };
  
  const handleSubmitWrapper = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCpf = parseDocument(formData.cpf);
    
    // NOVO: Validação condicional
    if (formData.nacionalidade === 'Brasileiro') {
        if (cleanCpf.length !== 11) {
            setCpfError('CPF inválido.');
            return;
        }
        if (!isValidCPF(cleanCpf)) {
            setCpfError('CPF inválido. Verifique os dígitos.');
            return;
        }
    } else {
        // Estrangeiro: Apenas verifica se o campo Documento está preenchido
        if (!formData.cpf.trim()) {
            setCpfError('O campo Documento é obrigatório para motoristas estrangeiros.');
            return;
        }
    }
    
    // Ajustamos o `formData` antes de chamar `onSubmit`
    setFormData(prev => ({
        ...prev,
        // Para estrangeiros, o CPF é o valor bruto do documento
        cpf: formData.nacionalidade === 'Estrangeiro' ? prev.cpf.trim() : cleanCpf,
        telefone: parseDocument(prev.telefone || ''),
        validadeCnh: prev.validadeCnh, // Mantido como string para o submit do pai
        dataNascimentoStr: prev.dataNascimentoStr, // Mantido como string para o submit do pai
        veiculoVinculado: prev.veiculoVinculado, // NOVO: Mantido o ID do veículo
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
            
            {/* NOVO: Nacionalidade (Primeiro Campo) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nacionalidade *</label>
                <select
                  value={formData.nacionalidade}
                  onChange={(e) => {
                    const newNacionalidade = e.target.value as Motorista['nacionalidade'];
                    setFormData(prev => ({ 
                        ...prev, 
                        nacionalidade: newNacionalidade,
                        // Limpa o campo de documento/cpf ao mudar a nacionalidade
                        cpf: '', 
                    }));
                    setCpfError('');
                    setCpfConsultado(false);
                    setLastConsultedCpf('');
                  }}
                  className="input-field"
                  required
                >
                  <option value="Brasileiro">Brasileiro</option>
                  <option value="Estrangeiro">Estrangeiro</option>
                </select>
            </div>
            
            {/* Nome e CPF/Documento */}
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
              
              {/* CPF / Documento Estrangeiro */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {formData.nacionalidade === 'Estrangeiro' ? 'Documento *' : 'CPF *'}
                    {formData.nacionalidade === 'Brasileiro' && consultandoCPF && (
                        <span className="ml-2 text-blue-500 text-xs">Consultando...</span>
                    )}
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => {
                    const isEstrangeiro = formData.nacionalidade === 'Estrangeiro';
                    let newValue = e.target.value;
                    
                    if (!isEstrangeiro) {
                        // Aplica formatação e consulta apenas para Brasileiro (CPF)
                        const formatted = formatDocument(newValue, 'PF');
                        const limpo = parseDocument(formatted);
                        
                        if (limpo !== parseDocument(formData.cpf || '')) {
                            setCpfConsultado(false);
                        }
                        
                        setFormData(prev => ({ ...prev, cpf: formatted }));
                        setCpfError('');
                        
                        if (limpo.length === 11) {
                            handleCPFConsultation(formatted);
                        }
                    } else {
                        // Estrangeiro: Sem formatação, apenas atualiza o valor bruto
                        setFormData(prev => ({ ...prev, cpf: newValue }));
                        setCpfError('');
                        setCpfConsultado(false); // Garante que o status de consulta seja limpo
                    }
                  }}
                  className={`input-field ${formData.nacionalidade === 'Brasileiro' && consultandoCPF ? 'opacity-50' : ''}`}
                  placeholder={formData.nacionalidade === 'Estrangeiro' ? 'Documento de Identificação' : '000.000.000-00'}
                  disabled={formData.nacionalidade === 'Brasileiro' && consultandoCPF}
                  required
                />
                
                {/* Mensagens de Erro/Status (Apenas para Brasileiro) */}
                {formData.nacionalidade === 'Brasileiro' && cpfError && (
                    <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center">
                        <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                        <p className="text-xs text-red-700 dark:text-red-400">{cpfError}</p>
                    </div>
                )}
                {formData.nacionalidade === 'Brasileiro' && cpfConsultado && !cpfError && (
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
            
            {/* Contato */}
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
            </div>
            
            {/* NOVO: Vínculo de Veículo */}
            <div>
                <SearchableSelect
                    label="Veículo Vinculado (Cavalo/Truck)"
                    placeholder="Opcional: Vincular motorista a um veículo"
                    valueId={formData.veiculoVinculado}
                    options={veiculoOptions}
                    onSelect={(id) => setFormData(prev => ({ ...prev, veiculoVinculado: id }))}
                    onClear={() => setFormData(prev => ({ ...prev, veiculoVinculado: '' }))}
                    icon={Truck}
                />
                {formData.veiculoVinculado && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">Este veículo será sugerido automaticamente ao vincular o motorista a uma carga.</p>
                )}
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