import React from 'react';
import { format, getDay, getDate, getMonth, getYear, isSameDay, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createLocalDate } from '../utils/formatters'; // Importando a função auxiliar

interface RangeCalendarProps {
  month: Date;
  start: Date | null;
  end: Date | null;
  onPrev: () => void;
  onNext: () => void;
  onSelectDate: (d: Date) => void;
  onApply: () => void;
  onClear: () => void;
}

const RangeCalendar: React.FC<RangeCalendarProps> = ({ month, start, end, onPrev, onNext, onSelectDate, onApply, onClear }) => {
  const year = getYear(month);
  const m = getMonth(month);
  const firstWeekday = getDay(new Date(year, m, 1)); // 0=Dom,...6=Sab
  const daysInMonth = getDate(new Date(year, m + 1, 0));

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  const inRange = (d: Date) => {
    if (!start || !end) return false;
    
    // Cria datas locais para comparação, garantindo que o fuso horário não interfira
    const s = start < end ? createLocalDate(format(start, 'yyyy-MM-dd')) : createLocalDate(format(end, 'yyyy-MM-dd'));
    const e = end > start ? createLocalDate(format(end, 'yyyy-MM-dd')) : createLocalDate(format(start, 'yyyy-MM-dd'));
    const dd = createLocalDate(format(d, 'yyyy-MM-dd'));
    
    // Verifica se todas as datas são válidas antes de comparar
    if (!dd || !s || !e || !isValid(dd) || !isValid(s) || !isValid(e)) return false;
    
    return dd >= s && dd <= e;
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg w-80 p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </div>
        <button type="button" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-center mb-1">
        {weekLabels.map(d => (
          <div key={d} className="text-slate-500 dark:text-slate-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {rows.map((row, ri) => (
          row.map((cell, ci) => (
            cell ? (
              <button
                key={`${ri}-${ci}`}
                type="button"
                onClick={() => onSelectDate(cell)}
                className={`py-2 rounded text-sm transition-colors ${
                  (start && isSameDay(cell, start)) || (end && isSameDay(cell, end))
                    ? 'bg-blue-600 text-white'
                    : inRange(cell)
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {getDate(cell)}
              </button>
            ) : (
              <div key={`${ri}-${ci}`} />
            )
          ))
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button type="button" className="btn-secondary flex-1" onClick={onClear}>Limpar</button>
        <button type="button" className="btn-primary flex-1" onClick={onApply}>Aplicar</button>
      </div>
    </div>
  );
};

export default RangeCalendar;