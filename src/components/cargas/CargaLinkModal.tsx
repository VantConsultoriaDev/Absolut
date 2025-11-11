import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { Motorista, Carga, Parceiro, Veiculo } from '../../types';
import { AlertTriangle, X, Search, User, Truck, Briefcase } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { formatPlaca } from '../../utils/formatters';

interface CargaLinkModalProps {
  isOpen: boolean;
  linkingCarga: Carga | null;
  linkingTrajetoIndex: number | undefined;
  onClose: () => void;
  onSave: () => void;
  selectedParceiro: string;
  setSelectedParceiro: (id: string) => void;
  selectedMotorista: string;
  setSelectedMotorista: (id: string) => void;
  selectedVeiculo: string;
  setSelectedVeiculo: (id: string) => void;
  selectedCarretas: string[];
  setSelectedCarretas: React.Dispatch<React.SetStateAction<string[]>>;
}

// Componente auxiliar para o Combobox de busca
interface ComboboxInputProps {
    label: string;
    placeholder: string;
    valueId: string;
    options: { id: string; name: string; secondaryInfo?: string; icon: React.ElementType }[];
    onSelect: (id: string) => void;
    onClear: () => void;
    disabled?: boolean;
    icon: React.ElementType;
}

const ComboboxInput: React.FC<ComboboxInputProps> = ({
    label,
    placeholder,
    valueId,
    options,
    onSelect,
    onClear,
    disabled = false,
    icon: Icon,
}) => {
    const { parceiros, motoristas, veiculos } = useDatabase();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Determina o nome atual para exibição no input
    const currentName = useMemo(() => {
        if (!valueId) return '';
        
        // Tenta encontrar o nome na lista de opções (Parceiro, Motorista, Veículo)
        const selectedOption = options.find(o => o.id === valueId);
        if (selectedOption) return selectedOption.name;
        
        // Fallback para buscar o nome no contexto (necessário se a opção não estiver na lista filtrada)
        const parceiro = parceiros.find(p => p.id === valueId);
        if (parceiro) return parceiro.nome || '';
        const motorista = motoristas.find(m => m.id === valueId);
        if (motorista) return motorista.nome || '';
        const veiculo = veiculos.find(v => v.id === valueId);
        if (veiculo) return `${v.tipo} - ${formatPlaca(v.placa || v.placaCavalo || v.placaCarreta || '')}`;
        
        return '';
    }, [valueId, options, parceiros, motoristas, veiculos]);
    
    // Sincroniza a query com o nome atual quando o ID muda (ex: ao selecionar)
    useEffect(() => {
        setQuery(currentName);
    }, [currentName]);

    // Lógica de filtragem
    const filteredOptions = useMemo(() => {
        if (!query.trim()) return options;
        const q = query.trim().toLowerCase();
        
        return options.filter(o => 
            o.name.toLowerCase().includes(q) || 
            (o.secondaryInfo || '').toLowerCase().includes(q)
        );
    }, [query, options]);

    // Lógica para fechar o dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const handleSelect = (id: string, name: string) => {
        onSelect(id);
        setQuery(name);
        setIsOpen(false);
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setIsOpen(true);
        // Se o usuário está digitando, desvincula o ID atual
        if (valueId && e.target.value !== currentName) {
            onClear();
        }
    };
    
    const handleInputFocus = () => {
        setIsOpen(true);
        // Ao focar, se houver um valor selecionado, mostra todas as opções
        if (valueId) {
            setQuery('');
        }
    };
    
    const handleInputBlur = () => {
        // Pequeno delay para permitir o clique no item do dropdown
        setTimeout(() => {
            if (!dropdownRef.current?.contains(document.activeElement)) {
                setIsOpen(false);
                // Se o usuário digitou algo e não selecionou, restaura o nome anterior ou limpa
                if (valueId && query !== currentName) {
                    setQuery(currentName);
                } else if (!valueId && query.trim()) {
                    setQuery('');
                }
            }
        }, 100);
    };
    
    const showDropdown = isOpen && (filteredOptions.length > 0 || query.trim());

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
            </label>
            <div className="relative">
                <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={placeholder}
                    className="input-field pl-10 h-11 text-sm"
                    disabled={disabled}
                />
                {valueId && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                            setQuery('');
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
                        title="Limpar seleção"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {showDropdown && (
                <div 
                    ref={dropdownRef}
                    className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                    {filteredOptions.length === 0 && query.trim() ? (
                        <div className="p-3 text-sm text-slate-500 dark:text-slate-400">
                            Nenhum resultado encontrado.
                        </div>
                    ) : (
                        filteredOptions.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelect(option.id, option.name)}
                                className="w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                            >
                                <option.icon className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="truncate font-medium">{option.name}</span>
                                    {option.secondaryInfo && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{option.secondaryInfo}</span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};


const CargaLinkModal: React.FC<CargaLinkModalProps> = ({
  isOpen,
  linkingCarga,
  linkingTrajetoIndex,
  onClose,
  onSave,
  selectedParceiro,
  setSelectedParceiro,
  selectedMotorista,
  setSelectedMotorista,
  selectedVeiculo,
  setSelectedVeiculo,
  selectedCarretas,
  setSelectedCarretas,
}) => {
  const { parceiros, motoristas, veiculos } = useDatabase();
  const { modalRef } = useModal({ isOpen, onClose }); 

  const trajeto = linkingCarga?.trajetos.find(t => t.index === linkingTrajetoIndex);
  
  if (!trajeto || !linkingCarga) return null; 

  // --- OPÇÕES PARA COMBOBOX ---
  
  // 1. Opções de Parceiro
  const parceiroOptions = useMemo(() => {
    return parceiros.map(p => ({
      id: p.id,
      name: p.nome || 'Parceiro sem nome',
      secondaryInfo: p.tipo === 'PJ' ? (p.nomeFantasia || p.documento) : p.documento,
      icon: p.tipo === 'PJ' ? Briefcase : User,
    }));
  }, [parceiros]);

  // 2. Opções de Motorista (Filtrado por Parceiro ou Todos)
  const filteredMotoristas = useMemo(() => {
    let list: Motorista[] = [];
    
    if (selectedParceiro) {
        // Motoristas vinculados ao parceiro
        list = motoristas.filter(m => m.parceiroId === selectedParceiro);
        
        // Verifica se o próprio parceiro é motorista (PF)
        const parceiro = parceiros.find(p => p.id === selectedParceiro);
        if (parceiro && parceiro.tipo === 'PF' && parceiro.isMotorista) {
            list.push({
                id: parceiro.id,
                parceiroId: parceiro.id,
                nome: parceiro.nome || '',
                cpf: parceiro.documento || '',
                cnh: parceiro.cnh || '',
                categoriaCnh: '',
                validadeCnh: new Date(),
                telefone: parceiro.telefone || '',
                isActive: parceiro.isActive,
                createdAt: parceiro.createdAt,
                updatedAt: new Date(),
                nacionalidade: parceiro.nacionalidade || 'Brasileiro',
            } as Motorista);
        }
    } else {
        // Todos os motoristas cadastrados
        list = motoristas;
    }
    
    return list.map(m => ({
      id: m.id,
      name: m.nome,
      secondaryInfo: m.cpf,
      icon: User,
    }));
  }, [selectedParceiro, motoristas, parceiros]);

  // 3. Opções de Veículo (Truck ou Cavalo, Filtrado por Parceiro ou Todos)
  const filteredVeiculos = useMemo(() => {
    const base = veiculos.filter(v => v.tipo !== 'Carreta');
    
    let list = selectedParceiro 
      ? base.filter(v => v.parceiroId === selectedParceiro) 
      : base;
      
    return list.map(v => ({
      id: v.id,
      name: `${v.tipo} - ${formatPlaca(v.placa || v.placaCavalo || '')}`,
      secondaryInfo: `${v.fabricante} ${v.modelo} (${v.ano})`,
      icon: Truck,
    }));
  }, [selectedParceiro, veiculos]);
  
  // 4. Carretas (Apenas para Cavalo selecionado)
  const isSelectedVehicleCavalo = useMemo(() => {
    if (!selectedVeiculo) return false;
    const veiculo = veiculos.find(v => v.id === selectedVeiculo);
    return veiculo?.tipo === 'Cavalo';
  }, [selectedVeiculo, veiculos]);

  const filteredCarretas = useMemo(() => {
    return selectedParceiro 
      ? veiculos.filter(v => v.parceiroId === selectedParceiro && v.tipo === 'Carreta') 
      : [];
  }, [selectedParceiro, veiculos]);
  
  // --- HANDLERS DE SELEÇÃO ---
  
  const handleSelectParceiro = (id: string) => {
    setSelectedParceiro(id);
    // Limpa motorista e veículo ao mudar o parceiro
    setSelectedMotorista('');
    setSelectedVeiculo('');
    setSelectedCarretas([]);
  };
  
  const handleClearParceiro = () => {
    setSelectedParceiro('');
    setSelectedMotorista('');
    setSelectedVeiculo('');
    setSelectedCarretas([]);
  };
  
  const handleClearMotorista = () => {
    setSelectedMotorista('');
  };
  
  const handleClearVeiculo = () => {
    setSelectedVeiculo('');
    setSelectedCarretas([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Vincular Trajeto {linkingTrajetoIndex}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Carga CRT: {linkingCarga.crt || linkingCarga.id} ({trajeto.ufOrigem} → {trajeto.ufDestino})
        </p>
        <div className="space-y-4">
          
          {/* 1. Parceiro */}
          <ComboboxInput
            label="Parceiro"
            placeholder="Buscar parceiro por nome ou documento"
            valueId={selectedParceiro}
            options={parceiroOptions}
            onSelect={handleSelectParceiro}
            onClear={handleClearParceiro}
            icon={Briefcase}
          />

          {/* 2. Motorista */}
          <ComboboxInput
            label="Motorista"
            placeholder={selectedParceiro ? "Buscar motorista do parceiro" : "Selecione um parceiro primeiro"}
            valueId={selectedMotorista}
            options={filteredMotoristas}
            onSelect={setSelectedMotorista}
            onClear={handleClearMotorista}
            disabled={!selectedParceiro}
            icon={User}
          />

          {/* 3. Veículo */}
          <ComboboxInput
            label="Veículo (Truck ou Cavalo)"
            placeholder={selectedParceiro ? "Buscar veículo do parceiro" : "Selecione um parceiro primeiro"}
            valueId={selectedVeiculo}
            options={filteredVeiculos}
            onSelect={setSelectedVeiculo}
            onClear={handleClearVeiculo}
            disabled={!selectedParceiro}
            icon={Truck}
          />

          {/* Seleção de Carretas quando o veículo for Cavalo */}
          {isSelectedVehicleCavalo && filteredCarretas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Carretas do Parceiro (selecione uma ou mais)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
                {filteredCarretas.map(carreta => (
                  <label key={carreta.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {carreta.placaCarreta || carreta.placa || 'Carreta sem placa'}
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedCarretas.includes(carreta.id)}
                      onChange={() => {
                        setSelectedCarretas(prev => prev.includes(carreta.id)
                          ? prev.filter(id => id !== carreta.id)
                          : [...prev, carreta.id]
                        );
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {isSelectedVehicleCavalo && filteredCarretas.length === 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                O veículo selecionado é um Cavalo, mas não há carretas cadastradas para este parceiro.
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CargaLinkModal;