import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useModal } from '../../hooks/useModal';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { receita: string[]; despesa: string[] };
  addCategory: (type: 'receita' | 'despesa', category: string) => void;
  removeCategory: (type: 'receita' | 'despesa', category: string) => void;
}

const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  addCategory,
  removeCategory,
}) => {
  const { modalRef } = useModal({ isOpen, onClose });
  const [activeTab, setActiveTab] = useState<'receita' | 'despesa'>('despesa');
  const [newCategory, setNewCategory] = useState('');

  const currentCategories = useMemo(() => categories[activeTab], [categories, activeTab]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.trim()) {
      addCategory(activeTab, newCategory.trim());
      setNewCategory('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Gerenciar Categorias
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('despesa')}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'despesa'
                  ? 'border-b-2 border-red-600 text-red-600 dark:text-red-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <TrendingDown className="h-4 w-4" /> Despesas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('receita')}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'receita'
                  ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <TrendingUp className="h-4 w-4" /> Receitas
            </button>
          </div>

          {/* Add New Category Form */}
          <form onSubmit={handleAdd} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder={`Nova categoria de ${activeTab}...`}
              className="input-field flex-1"
              required
            />
            <button type="submit" className="btn-primary px-4 py-2">
              <Plus className="h-5 w-5" />
            </button>
          </form>

          {/* List of Categories */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currentCategories.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma categoria cadastrada.</p>
            ) : (
              currentCategories.map(cat => (
                <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{cat}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(activeTab, cat)}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                    title="Remover categoria"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoriesModal;