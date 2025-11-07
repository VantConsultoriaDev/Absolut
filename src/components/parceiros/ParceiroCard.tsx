import React from 'react';
import { Briefcase, User, Truck, Building2, Lock, Unlock } from 'lucide-react';
import { Parceiro } from '../../types';
import { formatDocument } from '../../utils/formatters';

interface ParceiroCardProps {
  parceiro: Parceiro;
  veiculosCount: number;
  motoristasCount: number;
  onClick: (parceiro: Parceiro) => void;
  onToggleBlock: (parceiro: Parceiro) => void; // NOVO: Handler para bloquear/desbloquear
}

const ParceiroCard: React.FC<ParceiroCardProps> = ({ parceiro, veiculosCount, motoristasCount, onClick, onToggleBlock }) => {
  const displayTitle = parceiro.tipo === 'PJ' && parceiro.nomeFantasia ? parceiro.nomeFantasia : parceiro.nome;
  const secondaryTitle = parceiro.tipo === 'PJ' && parceiro.nomeFantasia ? parceiro.nome : undefined;
  
  const isPJ = parceiro.tipo === 'PJ';
  const icon = isPJ ? Building2 : User;
  const iconColor = isPJ ? 'bg-blue-500' : 'bg-green-500';
  const isBlocked = parceiro.isActive === false; // Consideramos bloqueado se isActive for false

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-0.5 flex flex-col p-5 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500">
      <div className="flex-grow">
        <div className="flex items-start justify-between">
          <button 
            onClick={() => onClick(parceiro)}
            className="flex items-start gap-4 flex-1 text-left"
          >
            {/* Ícone/Avatar */}
            <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor} text-white shadow-md`}>
              {React.createElement(icon, { className: "h-6 w-6" })}
            </div>
            
            {/* Títulos */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{displayTitle}</h3>
              {secondaryTitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{secondaryTitle}</p>
              )}
              <p className="text-xs text-gray-600 dark:text-gray-300 font-mono tracking-tight leading-tight mt-1">
                {formatDocument(parceiro.documento || 'N/A', parceiro.tipo)}
              </p>
            </div>
          </button>
          
          {/* Botão de Bloqueio/Desbloqueio */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Evita abrir o modal de detalhes
              onToggleBlock(parceiro);
            }}
            className={`p-2 rounded-full transition-colors ${
              isBlocked 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
            title={isBlocked ? 'Desbloquear Parceiro' : 'Bloquear Parceiro'}
          >
            {isBlocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
          </button>
        </div>
        
        {/* Estatísticas */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Truck className="h-4 w-4 text-amber-500" />
            <span className="font-semibold">{veiculosCount}</span> Veículos
          </div>
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <User className="h-4 w-4 text-green-500" />
            <span className="font-semibold">{motoristasCount}</span> Motoristas
          </div>
          {parceiro.isMotorista && (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 col-span-2">
              <Briefcase className="h-4 w-4 text-blue-500" />
              Motorista Próprio
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParceiroCard;