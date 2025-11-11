import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';

export interface SelectOption {
    id: string;
    name: string;
    secondaryInfo?: string;
    icon?: React.ElementType;
}

interface SearchableSelectProps {
    label: string;
    placeholder: string;
    valueId: string;
    options: SelectOption[];
    onSelect: (id: string) => void;
    onClear: () => void;
    disabled?: boolean;
    icon?: React.ElementType; // Optional icon for the input field
    required?: boolean;
    className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    label,
    placeholder,
    valueId,
    options,
    onSelect,
    onClear,
    disabled = false,
    icon: InputIcon,
    required = false,
    className = '',
}) => {
    
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Determines the current name for display in the input
    const currentName = useMemo(() => {
        if (!valueId) return '';
        const selectedOption = options.find(o => o.id === valueId);
        return selectedOption ? selectedOption.name : '';
    }, [valueId, options]);
    
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
        // Se o usuário está digitando e o valor não corresponde ao nome atual, limpa o ID
        if (valueId && e.target.value !== currentName) {
            onClear();
        }
    };
    
    const handleInputFocus = () => {
        setIsOpen(true);
        // Ao focar, se houver um valor selecionado, mostra todas as opções
        if (valueId) {
            setQuery(currentName); // Mantém o nome, mas permite que o filtro comece a funcionar
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
    const IconComponent = InputIcon || Search;

    return (
        <div className={`relative ${className}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label} {required && '*'}
            </label>
            <div className="relative">
                <IconComponent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
                    required={required && !valueId}
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
                    className="absolute z-50 mt-1 w-full min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
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
                                {option.icon && React.createElement(option.icon, { className: "h-4 w-4 mr-2 text-blue-500 flex-shrink-0" })}
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

export default SearchableSelect;