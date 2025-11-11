import React, { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RangeCalendar from './RangeCalendar';
import { createLocalDate } from '../utils/formatters';

interface FilterOption {
  key: string;
  label: string;
  startState: string;
  endState: string;
  setStart: (date: string) => void;
  setEnd: (date: string) => void;
}

interface DateRangeFilterProps {
  options: FilterOption[];
  className?: string;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ options, className = '' }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  
  // Estado para qual filtro está ativo (usa a key da opção)
  const [activeFilterKey, setActiveFilterKey] = useState(options[0]?.key || '');
  
  // Estados temporários para o RangeCalendar
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  
  const activeFilter = useMemo(() => options.find(o => o.key === activeFilterKey) || options[0], [options, activeFilterKey]);

  // --- Handlers do Calendário ---
  
  const handleOpenCalendar = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCalendarPosition({
      top: rect.bottom + 5,
      left: rect.left
    });
    
    // Inicializa os estados temporários com os valores atuais do filtro ativo
    const s = activeFilter.startState ? createLocalDate(activeFilter.startState) : null;
    const ed = activeFilter.endState ? createLocalDate(activeFilter.endState) : null;
    
    setTempStart(s);
    setTempEnd(ed);
    setCalendarMonth(s || new Date());
    setShowCalendar(true);
  };
  
  const handleSelectDate = (d: Date) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(d);
      setTempEnd(null);
    } else {
      if (d < tempStart) {
        setTempEnd(tempStart);
        setTempStart(d);
      } else {
        setTempEnd(d);
      }
    }
  };
  
  const handleApplyCalendar = () => {
    const startStr = tempStart ? format(tempStart, 'yyyy-MM-dd') : '';
    const endStr = tempEnd ? format(tempEnd, 'yyyy-MM-dd') : '';
    
    activeFilter.setStart(startStr);
    activeFilter.setEnd(endStr);
    setShowCalendar(false);
  };
  
  const handleClearCalendar = () => {
    activeFilter.setStart('');
    activeFilter.setEnd('');
    setTempStart(null);
    setTempEnd(null);
    setShowCalendar(false);
  };
  
  const getFilterDisplay = (startStr: string, endStr: string) => {
    if (startStr && endStr) {
      return `${format(createLocalDate(startStr), 'dd/MM/yyyy', { locale: ptBR })} - ${format(createLocalDate(endStr), 'dd/MM/yyyy', { locale: ptBR })}`;
    }
    if (startStr) {
      return `De ${format(createLocalDate(startStr), 'dd/MM/yyyy', { locale: ptBR })}`;
    }
    return 'Selecionar período';
  };

  return (
    <div className={`relative ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        {/* 1. Seleção do Tipo de Filtro */}
        <div className="no-uppercase">
          <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Tipo de Data</label>
          <select
            value={activeFilterKey}
            onChange={(e) => setActiveFilterKey(e.target.value)}
            className="input-field h-11 text-sm"
          >
            {options.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        {/* 2. Botão de Abertura do Calendário */}
        <div className="no-uppercase">
          <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Período</label>
          <button
            type="button"
            onClick={handleOpenCalendar}
            className="input-field flex items-center justify-between h-11 text-sm"
          >
            <span className="text-sm whitespace-nowrap truncate">
              {getFilterDisplay(activeFilter.startState, activeFilter.endState)}
            </span>
            <Calendar className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Calendário (overlay ancorado) */}
      {showCalendar && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
          <div
            className="fixed z-50"
            style={{ top: `${calendarPosition.top}px`, left: `${calendarPosition.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <RangeCalendar
              month={calendarMonth}
              start={tempStart}
              end={tempEnd}
              onPrev={() => setCalendarMonth(prev => subMonths(prev, 1))}
              onNext={() => setCalendarMonth(prev => addMonths(prev, 1))}
              onSelectDate={handleSelectDate}
              onClear={handleClearCalendar}
              onApply={handleApplyCalendar}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangeFilter;