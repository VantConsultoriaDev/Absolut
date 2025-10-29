import React, { useMemo } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { Motorista, Carga } from '../../types';
import { AlertTriangle } from 'lucide-react';

interface CargaLinkModalProps {
  isOpen: boolean;
  linkingCarga: Carga | null;
  onClose: () => void;
  onSave: () => void;
  selectedParceiro: string;
  setSelectedParceiro: (id: string) => void;
  selectedMotorista: string;
  setSelectedMotorista: (id: string) => void;
  selectedVeiculo: string;
  setSelectedVeiculo: (id: string) => void;
  selectedCarretas: string[];
  setSelectedCarretas: React.Dispatch<React.SetStateAction<string[]>>; // Corrigido: Tipagem para setter de estado
}

const CargaLinkModal: React.FC<CargaLinkModalProps> = ({
  isOpen,
  linkingCarga,
  onClose,
  onSave,
  selectedParceiro,
  setSelectedParceiro,
  selectedMotorista,
  setSelectedMotorista,
  selectedVeiculo,
  setSelectedVeiculo,
  selectedCarretas,
  setSelectedCarretas,
}) => {
  const { parceiros, motoristas, veiculos } = useDatabase();

  if (!isOpen || !linkingCarga) return null;

  const filteredMotoristas = useMemo(() => {
    if (!selectedParceiro) {
      // Retorna motoristas + parceiros PF que são motoristas
      const parceiroMotoristas = parceiros
        .filter(p => p.tipo === 'PF' && p.isMotorista)
        .map(p => ({
          id: p.id,
          parceiroId: p.id,
          nome: p.nome || '',
          cpf: p.documento || '',
          cnh: p.cnh || '',
          categoriaCnh: '',
          validadeCnh: new Date(),
          telefone: p.telefone || '',
          isActive: p.isActive,
          createdAt: p.createdAt,
          updatedAt: new Date()
        } as Motorista));
      return [...motoristas, ...parceiroMotoristas];
    }
    
    // Se um parceiro específico foi selecionado
    const motoristasDoParceiro = motoristas.filter(m => m.parceiroId === selectedParceiro);
    
    // Verifica se o próprio parceiro é motorista
    const parceiro = parceiros.find(p => p.id === selectedParceiro);
    if (parceiro && parceiro.tipo === 'PF' && parceiro.isMotorista) {
      const parceiroComoMotorista = {
        id: parceiro.id,
        parceiroId: parceiro.id,
        nome: parceiro.nome || '',
        cpf: parceiro.documento || '',
        cnh: parceiro.cnh || '',
        categoriaCnh: '',
        validadeCnh: new Date(),
        telefone: parceiro.telefone || '',
        isActive: parceiro.isActive,
        createdAt: parceiro.createdAt,
        updatedAt: new Date()
      } as Motorista;
      return [...motoristasDoParceiro, parceiroComoMotorista];
    }
    
    return motoristasDoParceiro;
  }, [selectedParceiro, motoristas, parceiros]);

  const filteredVeiculos = useMemo(() => {
    // Filtra apenas Truck e Cavalo para a seleção principal de veículo
    const base = selectedParceiro 
      ? veiculos.filter(v => v.parceiroId === selectedParceiro && v.tipo !== 'Carreta') 
      : veiculos.filter(v => v.tipo !== 'Carreta');
    return base;
  }, [selectedParceiro, veiculos]);

  const filteredCarretas = useMemo(() => {
    // Filtra apenas Carretas para a seleção secundária
    return selectedParceiro 
      ? veiculos.filter(v => v.parceiroId === selectedParceiro && v.tipo === 'Carreta') 
      : [];
  }, [selectedParceiro, veiculos]);

  // Verifica se o veículo selecionado é um Cavalo
  const isSelectedVehicleCavalo = useMemo(() => {
    if (!selectedVeiculo) return false;
    const veiculo = veiculos.find(v => v.id === selectedVeiculo);
    return veiculo?.tipo === 'Cavalo';
  }, [selectedVeiculo, veiculos]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Vincular Parceiro/Motorista/Veículo
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Parceiro
            </label>
            <select
              value={selectedParceiro}
              onChange={(e) => {
                setSelectedParceiro(e.target.value);
                setSelectedMotorista('');
                setSelectedVeiculo('');
                setSelectedCarretas([]);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Selecione um parceiro</option>
              {parceiros.map(parceiro => (
                <option key={parceiro.id} value={parceiro.id}>
                  {parceiro.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Motorista
            </label>
            <select
              value={selectedMotorista}
              onChange={(e) => setSelectedMotorista(e.target.value)}
              disabled={!selectedParceiro}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
            >
              <option value="">Selecione um motorista</option>
              {filteredMotoristas.map(motorista => (
                <option key={motorista.id} value={motorista.id}>
                  {motorista.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Veículo (Truck ou Cavalo)
            </label>
            <select
              value={selectedVeiculo}
              onChange={(e) => {
                setSelectedVeiculo(e.target.value);
                setSelectedCarretas([]); // Limpa carretas ao mudar o veículo principal
              }}
              disabled={!selectedParceiro}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
            >
              <option value="">Selecione um veículo</option>
              {filteredVeiculos.map(veiculo => (
                <option key={veiculo.id} value={veiculo.id}>
                  {veiculo.tipo === 'Truck' ? veiculo.placa : (veiculo.placaCavalo || veiculo.placa)} ({veiculo.tipo})
                </option>
              ))}
            </select>
          </div>

          {/* Seleção de Carretas quando o veículo for Cavalo */}
          {isSelectedVehicleCavalo && filteredCarretas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Carretas do Parceiro (selecione uma ou mais)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
                {filteredCarretas.map(carreta => (
                  <label key={carreta.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {carreta.placaCarreta || carreta.placa || 'Carreta sem placa'}
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedCarretas.includes(carreta.id)}
                      onChange={() => {
                        setSelectedCarretas(prev => prev.includes(carreta.id)
                          ? prev.filter(id => id !== carreta.id)
                          : [...prev, carreta.id]
                        );
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {isSelectedVehicleCavalo && filteredCarretas.length === 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                O veículo selecionado é um Cavalo, mas não há carretas cadastradas para este parceiro.
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CargaLinkModal;