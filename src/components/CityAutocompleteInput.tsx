import React, { useState, useRef, useEffect } from 'react';
import { useCityAutocomplete } from '../hooks/useCityAutocomplete';
import { Loader2, MapPin } from 'lucide-react';
// import { useModal } from '../hooks/useModal'; // Importando useModal para gerenciar o clique fora

interface CityAutocompleteInputProps {
  uf: string; // UF selecionada (ex: 'SP')
  value: string; // Valor atual do input (nome da cidade)
  onChange: (city: string) => void; // Callback para atualizar o nome da cidade
  disabled: boolean;
  placeholder: string;
  className?: string;
}

const CityAutocompleteInput: React.FC<CityAutocompleteInputProps> = ({
  uf,
  value,
  onChange,
  disabled,
  placeholder,
  className = '',
}) => {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Hook de lógica de busca
  const { filteredCities, isLoading } = useCityAutocomplete(uf, query);
  
  // Sincroniza o valor externo com a query interna
  useEffect(() => {
    setQuery(value);
  }, [value]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue); // Atualiza o estado do formulário imediatamente
    setIsOpen(true);
  };

  const handleSelectCity = (city: string) => {
    setQuery(city);
    onChange(city);
    setIsOpen(false);
  };
  
  const showDropdown = isOpen && (isLoading || filteredCities.length > 0);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
            // Pequeno delay para permitir o clique no item do dropdown
            setTimeout(() => {
                if (!dropdownRef.current?.contains(document.activeElement)) {
                    setIsOpen(false);
                }
            }, 100);
        }}
        placeholder={placeholder}
        className="input-field"
        disabled={disabled}
      />

      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading && (
            <div className="p-3 text-sm text-slate-500 dark:text-slate-400 flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando cidades...
            </div>
          )}
          
          {!isLoading && filteredCities.length === 0 && query.length >= 2 && (
            <div className="p-3 text-sm text-slate-500 dark:text-slate-400">
              Nenhuma cidade encontrada.
            </div>
          )}

          {!isLoading && filteredCities.map(city => (
            <button
              key={city.id}
              type="button"
              onClick={() => handleSelectCity(city.nome)}
              className="w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
            >
              <MapPin className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
              <span className="flex-1">{city.nome}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CityAutocompleteInput;