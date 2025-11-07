import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
// Removido: import { useModal } from '../hooks/useModal';

interface StatusOption {
  key: string;
  label: string;
  color: string;
}

interface MultiSelectStatusProps {
  label: string;
  options: StatusOption[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  className?: string;
}

const MultiSelectStatus: React.FC<MultiSelectStatusProps> = ({
  label,
  options,
  selectedKeys,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Gerenciamento manual do clique fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);


  const handleToggle = (key: string) => {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter(k => k !== key));
    } else {
      onChange([...selectedKeys, key]);
    }
  };
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setIsOpen(false);
  };

  const displayLabel = selectedKeys.length === 0 
    ? label 
    : selectedKeys.length === options.length
      ? 'Todos selecionados'
      : `${selectedKeys.length} selecionado(s)`;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="input-field flex items-center justify-between h-11 text-sm w-full"
      >
        <span className="text-sm text-slate-900 dark:text-slate-50 truncate">
          {displayLabel}
        </span>
        <div className="flex items-center gap-1">
            {selectedKeys.length > 0 && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                    title="Limpar seleção"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 space-y-1">
            {options.map(option => {
              const isSelected = selectedKeys.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleToggle(option.key)}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full mr-3 ${option.color}`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="flex-1 text-left">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectStatus;