import React from 'react';
import { Package, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { STATUS_CONFIG } from '../../utils/cargasConstants';

interface CargasStatsProps {
  stats: {
    total: number;
    aColetar: number;
    emTransito: number;
    armazenadas: number;
    entregues: number;
    valorTotal: number;
  };
}

const CargasStats: React.FC<CargasStatsProps> = ({ stats }) => {
  const statusDisplay = [
    { key: 'a_coletar', count: stats.aColetar, config: STATUS_CONFIG.a_coletar },
    { key: 'em_transito', count: stats.emTransito, config: STATUS_CONFIG.em_transito },
    { key: 'armazenada', count: stats.armazenadas, config: STATUS_CONFIG.armazenada },
    { key: 'entregue', count: stats.entregues, config: STATUS_CONFIG.entregue },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Total */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      {statusDisplay.map(item => (
        <div key={item.key} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${item.config.bgColor}`}>
              <item.config.icon className={`h-5 w-5 ${item.config.textColor}`} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{item.config.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{item.count}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Valor Total */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Valor Total</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(stats.valorTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CargasStats;