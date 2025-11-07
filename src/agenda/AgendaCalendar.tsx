import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAgenda } from './AgendaContext';

interface AgendaCalendarProps {
  onSelectDate: (date: Date) => void;
  selectedDate: Date; // NOVO: Data atualmente selecionada
}

const AgendaCalendar: React.FC<AgendaCalendarProps> = ({ onSelectDate, selectedDate }) => {
  const { items } = useAgenda();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = 'd';
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // Mapeia todos os dias do mês e verifica se há eventos
  const days = useMemo(() => {
    const rows = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        // Verifica se há eventos neste dia (apenas não concluídos)
        const hasEvent = items.some(item => item.dueDate && isSameDay(item.dueDate, cloneDay) && !item.isCompleted);

        rows.push({
          date: cloneDay,
          formattedDate,
          isSameMonth: isSameMonth(day, monthStart),
          hasEvent,
        });
        day = addDays(day, 1);
      }
    }
    return rows;
  }, [startDate, endDate, monthStart, items]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="card p-4 space-y-4">
      {/* Header do Mês */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <div className="flex space-x-1">
          <button onClick={handlePrevMonth} className="btn-ghost p-2">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={handleNextMonth} className="btn-ghost p-2">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Dias da Semana */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
        {weekDays.map((day, index) => (
          <div key={index} className="py-1">{day}</div>
        ))}
      </div>

      {/* Dias do Mês */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
            const isTodayDay = isSameDay(day.date, new Date());
            const isSelected = isSameDay(day.date, selectedDate);
            
            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelectDate(day.date)}
                className={`p-1 h-10 w-full flex flex-col items-center justify-center rounded-lg transition-colors relative 
                  ${!day.isSameMonth ? 'text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-700/50' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'}
                  ${isTodayDay ? 'border-2 border-blue-500 bg-blue-100 dark:bg-blue-900/30' : ''}
                  ${isSelected && !isTodayDay ? 'bg-blue-200 dark:bg-blue-800 border border-blue-500' : ''}
                  ${isSelected && isTodayDay ? 'bg-blue-300 dark:bg-blue-700' : ''}
                `}
              >
                <span className={`text-sm font-medium ${!day.isSameMonth ? 'opacity-60' : ''}`}>
                  {day.formattedDate}
                </span>
                {/* Indicador visual de evento */}
                {day.hasEvent && (
                  <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : isTodayDay ? 'bg-blue-700' : 'bg-red-500'}`} />
                )}
              </button>
            );
        })}
      </div>
    </div>
  );
};

export default AgendaCalendar;