import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, ListTodo, Plus, Clock, Check, Edit } from 'lucide-react';
import { useAgenda } from '../agenda/AgendaContext';
import AgendaList from '../agenda/AgendaList';
import AgendaCalendar from '../agenda/AgendaCalendar';
import AgendaFormModal from '../agenda/AgendaFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import TaskDetailModal from '../agenda/TaskDetailModal'; // NOVO
import CalendarDayModal from '../agenda/CalendarDayModal'; // NOVO
import { AgendaItem, initialAgendaItem } from '../agenda/types';
import { format, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showError } from '../utils/toast';

// Componente de Conteúdo (usa o Context)
const AgendaContent: React.FC = () => {
    const location = useLocation();
    const { items, addItem, updateItem, deleteItem, toggleCompletion } = useAgenda();
    
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string } | null>(null);
    
    // NOVO ESTADO: Modal de Detalhes da Tarefa
    const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
    const [detailTargetItem, setDetailTargetItem] = useState<AgendaItem | null>(null);
    
    // NOVO ESTADO: Modal de Detalhes do Dia do Calendário
    const [showCalendarDayModal, setShowCalendarDayModal] = useState(false);
    const [calendarDayTargetDate, setCalendarDayTargetDate] = useState<Date | null>(null);
    
    // NOVO ESTADO: Data selecionada no calendário (padrão: hoje)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Reset para tela inicial quando navegado via menu lateral
    useEffect(() => {
        if (location.state?.resetModule) {
            setShowForm(false);
            setEditingItem(null);
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
            setSelectedDate(new Date());
            setShowTaskDetailModal(false);
            setDetailTargetItem(null);
            setShowCalendarDayModal(false);
            setCalendarDayTargetDate(null);
        }
    }, [location.state]);
    
    // --- Handlers ---
    
    const handleOpenForm = (date?: Date) => {
        // 1. Limpa o item de edição
        setEditingItem(null);
        
        // 2. Se uma data for fornecida, pré-preenche o formulário com essa data
        if (date) {
            // Define a data selecionada
            setSelectedDate(date);
            // Cria um item temporário para preencher o formulário
            setEditingItem({
                ...initialAgendaItem,
                id: '', // ID temporário
                createdAt: new Date(),
                updatedAt: new Date(),
                isCompleted: false,
                dueDate: date,
            } as AgendaItem);
        }
        
        // 3. Abre o formulário
        setShowForm(true);
    };
    
    const handleEdit = (item: AgendaItem) => {
        setEditingItem(item);
        setShowForm(true);
        
        // Fecha modais de visualização se estiverem abertos
        setShowTaskDetailModal(false);
        setShowCalendarDayModal(false);
    };
    
    const handleDelete = (id: string, title: string) => {
        setDeleteTarget({ id, title });
        setShowDeleteConfirm(true);
    };
    
    const confirmDelete = () => {
        if (deleteTarget) {
            deleteItem(deleteTarget.id);
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
        }
    };

    const handleSubmit = (data: Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted'>) => {
        if (editingItem && editingItem.id) {
            updateItem(editingItem.id, data);
        } else {
            addItem(data);
        }
        setEditingItem(null);
        setShowForm(false);
    };
    
    // NOVO: Handler para abrir o modal de detalhes da tarefa
    const handleOpenTaskDetail = (item: AgendaItem) => {
        setDetailTargetItem(item);
        setShowTaskDetailModal(true);
    };
    
    // NOVO: Handler para adiar a tarefa
    const handlePostpone = (id: string, newDate: Date) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        
        // Mantém a hora, mas atualiza a data
        updateItem(id, { 
            dueDate: newDate,
            // Se a tarefa estava concluída, volta para pendente ao adiar
            isCompleted: false, 
        });
        showError(`Tarefa "${item.title}" adiada para ${format(newDate, 'dd/MM/yyyy', { locale: ptBR })}.`);
    };
    
    // NOVO: Handler para duplo clique no calendário
    const handleDoubleClickDay = (date: Date) => {
        setCalendarDayTargetDate(date);
        setShowCalendarDayModal(true);
    };
    
    // --- Eventos do Dia Selecionado (Mantido) ---
    const eventsForSelectedDay = useMemo(() => {
        return items
            .filter(item => item.dueDate && isSameDay(item.dueDate, selectedDate))
            .sort((a, b) => {
                // Ordena por hora (se houver) e depois por urgência
                if (a.dueTime && b.dueTime) {
                    return a.dueTime.localeCompare(b.dueTime);
                }
                if (a.dueTime) return -1;
                if (b.dueTime) return 1;
                
                const urgencyOrder = { Urgente: 1, Normal: 2, Leve: 3 };
                return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            });
    }, [items, selectedDate]);
    
    const handleSelectDate = (date: Date) => {
        setSelectedDate(date);
    };
    
    const renderEventItem = (item: AgendaItem) => {
        // CORREÇÃO: Usa fuchsia-600 para Urgente
        const urgencyColor = item.urgency === 'Urgente' ? 'text-fuchsia-600' : item.urgency === 'Normal' ? 'text-amber-600' : 'text-blue-600';
        
        return (
            <div 
                key={item.id} 
                onClick={() => handleOpenTaskDetail(item)} // NOVO: Abre modal de detalhes
                className={`p-3 rounded-lg transition-colors border cursor-pointer ${item.isCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 hover:border-blue-400'}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {item.isCompleted ? (
                            <Check className="h-4 w-4 text-green-600" />
                        ) : (
                            <Clock className={`h-4 w-4 ${urgencyColor}`} />
                        )}
                        <span className={`text-sm font-medium ${item.isCompleted ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                            {item.title}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {item.dueTime && (
                            <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                {item.dueTime}
                            </span>
                        )}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(item);
                            }} 
                            className="text-blue-500 hover:text-blue-700 p-1" 
                            title="Editar"
                        >
                            <Edit className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">{item.description}</p>
                )}
                {!item.isCompleted && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleCompletion(item.id);
                        }}
                        className="mt-2 text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                    >
                        <Check className="h-3 w-3" /> Marcar como concluído
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-3">
                        <Calendar className="h-8 w-8 text-blue-600" />
                        Agenda
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Gerencie suas tarefas e compromissos.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    className="btn-primary"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Item
                </button>
            </div>

            {/* Layout em Colunas (Lista e Calendário) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Coluna 1 & 2: Lista de Tarefas */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Compromissos do Dia Selecionado */}
                    <div className="card p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            Compromissos em {isToday(selectedDate) ? 'Hoje' : format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                        </h2>
                        
                        {eventsForSelectedDay.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Nenhum compromisso agendado para esta data.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {eventsForSelectedDay.map(renderEventItem)}
                            </div>
                        )}
                        
                        <button
                            onClick={() => handleOpenForm(selectedDate)}
                            className="btn-secondary w-full justify-center mt-3"
                        >
                            <Plus className="h-4 w-4" /> Adicionar Compromisso
                        </button>
                    </div>
                    
                    {/* Lista Geral de Tarefas */}
                    <div className="card p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-50 flex items-center gap-2">
                            <ListTodo className="h-5 w-5" />
                            Tarefas e Pendências
                        </h2 >
                        <AgendaList 
                            onEdit={handleEdit} 
                            onDelete={handleDelete} 
                            onOpenDetail={handleOpenTaskDetail} // NOVO
                        />
                    </div>
                </div>
                
                {/* Coluna 3: Calendário */}
                <div className="lg:col-span-1 space-y-6">
                    <AgendaCalendar 
                        onSelectDate={handleSelectDate} 
                        selectedDate={selectedDate} 
                        onDoubleClickDay={handleDoubleClickDay} // NOVO
                    />
                </div>
            </div>
            
            {/* Modal de Formulário (Edição/Criação) */}
            {showForm && (
                <AgendaFormModal
                    isOpen={showForm}
                    editingItem={editingItem}
                    onClose={() => {
                        setShowForm(false);
                        setEditingItem(null);
                    }}
                    onSubmit={handleSubmit}
                />
            )}
            
            {/* Modal de Detalhes da Tarefa (NOVO) */}
            {showTaskDetailModal && detailTargetItem && (
                <TaskDetailModal
                    isOpen={showTaskDetailModal}
                    item={detailTargetItem}
                    onClose={() => {
                        setShowTaskDetailModal(false);
                        setDetailTargetItem(null);
                    }}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleCompletion={toggleCompletion}
                    onPostpone={handlePostpone}
                />
            )}
            
            {/* Modal de Detalhes do Dia do Calendário (NOVO) */}
            {showCalendarDayModal && calendarDayTargetDate && (
                <CalendarDayModal
                    isOpen={showCalendarDayModal}
                    date={calendarDayTargetDate}
                    items={items}
                    onClose={() => {
                        setShowCalendarDayModal(false);
                        setCalendarDayTargetDate(null);
                    }}
                    onEdit={(item) => {
                        setShowCalendarDayModal(false); // Fecha o modal do dia
                        handleEdit(item); // Abre o modal de formulário para edição
                    }}
                    onToggleCompletion={toggleCompletion}
                    onAdd={(date) => {
                        setShowCalendarDayModal(false); // Fecha o modal do dia
                        handleOpenForm(date); // Abre o modal de formulário para criação
                    }}
                />
            )}
            
            {/* Modal de Confirmação de Exclusão */}
            {showDeleteConfirm && deleteTarget && (
                <ConfirmationModal
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={confirmDelete}
                    title="Excluir Item da Agenda"
                    message={`Tem certeza que deseja excluir o item "${deleteTarget.title}"?`}
                    confirmText="Excluir"
                    variant="danger"
                />
            )}
        </div>
    );
};

export default AgendaContent;