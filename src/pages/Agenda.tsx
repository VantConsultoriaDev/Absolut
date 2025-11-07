import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, ListTodo, Plus, Trash2 } from 'lucide-react';
import { AgendaProvider, useAgenda } from '../agenda/AgendaContext';
import AgendaList from '../agenda/AgendaList';
import AgendaCalendar from '../agenda/AgendaCalendar';
import AgendaFormModal from '../agenda/AgendaFormModal';
import NotificationModal from '../agenda/NotificationModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { AgendaItem, initialAgendaItem } from '../agenda/types';
import { format } from 'date-fns';

// Componente principal que usa o Provider
const AgendaPage: React.FC = () => {
    return (
        <AgendaProvider>
            <AgendaContent />
        </AgendaProvider>
    );
};

// Componente de Conteúdo (usa o Context)
const AgendaContent: React.FC = () => {
    const location = useLocation();
    const { items, addItem, updateItem, deleteItem } = useAgenda();
    
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string } | null>(null);

    // Reset para tela inicial quando navegado via menu lateral
    useEffect(() => {
        if (location.state?.resetModule) {
            setShowForm(false);
            setEditingItem(null);
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
        }
    }, [location.state]);
    
    // --- Handlers ---
    
    const handleOpenForm = (date?: Date) => {
        setEditingItem(null);
        setShowForm(true);
        
        // Preenche a data se vier do calendário
        if (date) {
            setEditingItem({
                ...initialAgendaItem,
                id: '', // ID temporário
                createdAt: new Date(),
                updatedAt: new Date(),
                isCompleted: false,
                dueDate: date,
            } as AgendaItem);
        }
    };
    
    const handleEdit = (item: AgendaItem) => {
        setEditingItem(item);
        setShowForm(true);
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
        if (editingItem) {
            updateItem(editingItem.id, data);
        } else {
            addItem(data);
        }
        setEditingItem(null);
        setShowForm(false);
    };
    
    // --- Renderização ---
    
    // Calcula o total de itens por dia para o calendário
    const itemsByDay = useMemo(() => {
        const map = new Map<string, AgendaItem[]>();
        items.forEach(item => {
            if (item.dueDate && !item.isCompleted) {
                const key = format(item.dueDate, 'yyyy-MM-dd');
                if (!map.has(key)) {
                    map.set(key, []);
                }
                map.get(key)!.push(item);
            }
        });
        return map;
    }, [items]);

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
                    <div className="card p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <ListTodo className="h-5 w-5" />
                            Tarefas e Compromissos
                        </h2>
                        <AgendaList onEdit={handleEdit} onDelete={handleDelete} />
                    </div>
                </div>
                
                {/* Coluna 3: Calendário e Eventos */}
                <div className="lg:col-span-1 space-y-6">
                    <AgendaCalendar onSelectDate={handleOpenForm} />
                    
                    {/* Eventos do Dia Selecionado (Simulado) */}
                    <div className="card p-4 space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Eventos do Dia
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Clique em uma data no calendário para adicionar um compromisso.
                        </p>
                        {/* Aqui poderíamos listar os eventos do dia selecionado */}
                    </div>
                </div>
            </div>
            
            {/* Modal de Formulário */}
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
            
            {/* Modal de Notificação (Sempre ativo) */}
            <NotificationModal />
        </div>
    );
};

export default AgendaPage;