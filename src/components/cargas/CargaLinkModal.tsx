import React, { useMemo, useEffect } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { Motorista, Carga } from '../../types';
import { AlertTriangle, X, User, Truck, Briefcase } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { formatPlaca } from '../../utils/formatters';
import SearchableSelect, { SelectOption } from '../SearchableSelect'; // Importando o novo componente

interface CargaLinkModalProps {
  isOpen: boolean;
  linkingCarga: Carga | null;
  linkingTrajetoIndex: number | undefined;
  onClose: () => void;
  onSave: () => void;
  selectedParceiro: string;
  setSelectedParceiro: (id: string) => void;
  selectedMotorista: string;
  setSelectedMotorista: (id: string) => void;
  selectedVeiculo: string;
  setSelectedVeiculo: (id: string) => void;
  selectedCarretas: string[];
  setSelectedCarretas: React.Dispatch<React.SetStateAction<string[]>>;
}

const CargaLinkModal: React.FC<CargaLinkModalProps> = ({
  isOpen,
  linkingCarga,
  linkingTrajetoIndex,
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
  const { modalRef } = useModal({ isOpen, onClose }); 

  const trajeto = linkingCarga?.trajetos.find(t => t.index === linkingTrajetoIndex);
  
  if (!trajeto || !linkingCarga) return null; 

  // --- OPÇÕES PARA COMBOBOX ---
  
  // 1. Opções de Parceiro
  const parceiroOptions: SelectOption[] = useMemo(() => {
    return parceiros.map(p => ({
      id: p.id,
      name: p.nome || 'Parceiro sem nome',
      secondaryInfo: p.tipo === 'PJ' ? (p.nomeFantasia || p.documento) : p.documento,
      icon: p.tipo === 'PJ' ? Briefcase : User,
    }));
  }, [parceiros]);

  // 2. Opções de Motorista (Filtrado por Parceiro ou Todos)
  const filteredMotoristas: SelectOption[] = useMemo(() => {
    let list: Motorista[] = [];
    
    if (selectedParceiro) {
        // Motoristas vinculados ao parceiro
        list = motoristas.filter(m => m.parceiroId === selectedParceiro);
        
        // Verifica se o próprio parceiro é motorista (PF)
        const parceiro = parceiros.find(p => p.id === selectedParceiro);
        if (parceiro && parceiro.tipo === 'PF' && parceiro.isMotorista) {
            list.push({
                id: parceiro.id,
                parceiroId: parceiro.id,
                nome: parceiro.nome || '',
                cpf: parceiro.documento || '',
                cnh: parceiro.cnh || '',
                categoriaCnh: '',
                validadeCnh: undefined, // Deve ser undefined ou Date
                telefone: parceiro.telefone || '',
                isActive: parceiro.isActive,
                createdAt: parceiro.createdAt,
                updatedAt: new Date(),
                // CORREÇÃO TS2339: Parceiro não tem 'nacionalidade', mas Motorista tem.
                // Assumimos 'Brasileiro' para o parceiro PF que é motorista.
                nacionalidade: 'Brasileiro', 
            } as Motorista);
        }
    } else {
        // Todos os motoristas cadastrados
        list = motoristas;
    }
    
    return list.map(m => ({
      id: m.id,
      name: m.nome,
      secondaryInfo: m.cpf,
      icon: User,
    }));
  }, [selectedParceiro, motoristas, parceiros]);

  // 3. Opções de Veículo (Truck ou Cavalo, Filtrado por Parceiro ou Todos)
  const filteredVeiculos: SelectOption[] = useMemo(() => {
    // Filtra para mostrar apenas Cavalo e Truck
    const base = veiculos.filter(v => v.tipo === 'Cavalo' || v.tipo === 'Truck');
    
    let list = selectedParceiro 
      ? base.filter(v => v.parceiroId === selectedParceiro) 
      : base;
      
    return list.map(v => ({
      id: v.id,
      name: `${v.tipo} - ${formatPlaca(v.placa || v.placaCavalo || '')}`,
      secondaryInfo: `${v.fabricante} ${v.modelo} (${v.ano})`,
      icon: Truck,
    }));
  }, [selectedParceiro, veiculos]);
  
  // 4. Carretas (Apenas para Cavalo selecionado)
  const selectedVehicleInfo = useMemo(() => {
    return veiculos.find(v => v.id === selectedVeiculo);
  }, [selectedVeiculo, veiculos]);
  
  const isSelectedVehicleCavalo = selectedVehicleInfo?.tipo === 'Cavalo';

  // Carretas disponíveis para o parceiro (todas as carretas do parceiro)
  const parceiroCarretas = useMemo(() => {
    return selectedParceiro 
      ? veiculos.filter(v => v.parceiroId === selectedParceiro && v.tipo === 'Carreta') 
      : [];
  }, [selectedParceiro, veiculos]);
  
  // Efeito para carregar carretas vinculadas ao Cavalo automaticamente
  useEffect(() => {
      if (isSelectedVehicleCavalo && selectedVehicleInfo?.carretasSelecionadas) {
          // Se for Cavalo, carrega as carretas vinculadas a ele
          setSelectedCarretas(selectedVehicleInfo.carretasSelecionadas);
      } else if (!isSelectedVehicleCavalo) {
          // Se não for Cavalo, limpa a seleção de carretas
          setSelectedCarretas([]);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVeiculo, isSelectedVehicleCavalo, selectedVehicleInfo?.carretasSelecionadas]);
  
  // --- HANDLERS DE SELEÇÃO ---
  
  const handleSelectParceiro = (id: string) => {
    setSelectedParceiro(id);
    // Limpa motorista e veículo ao mudar o parceiro
    setSelectedMotorista('');
    setSelectedVeiculo('');
    setSelectedCarretas([]);
  };
  
  const handleClearParceiro = () => {
    setSelectedParceiro('');
    setSelectedMotorista('');
    setSelectedVeiculo('');
    setSelectedCarretas([]);
  };
  
  const handleClearMotorista = () => {
    setSelectedMotorista('');
  };
  
  const handleClearVeiculo = () => {
    setSelectedVeiculo('');
    setSelectedCarretas([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Vincular Trajeto {linkingTrajetoIndex}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Carga CRT: {linkingCarga.crt || linkingCarga.id} ({trajeto.ufOrigem} → {trajeto.ufDestino})
        </p>
        <div className="space-y-4">
          
          {/* 1. Parceiro */}
          <SearchableSelect
            label="Parceiro"
            placeholder="Buscar parceiro por nome ou documento"
            valueId={selectedParceiro}
            options={parceiroOptions}
            onSelect={handleSelectParceiro}
            onClear={handleClearParceiro}
            icon={Briefcase}
          />

          {/* 2. Motorista */}
          <SearchableSelect
            label="Motorista"
            placeholder={selectedParceiro ? "Buscar motorista do parceiro" : "Selecione um parceiro primeiro"}
            valueId={selectedMotorista}
            options={filteredMotoristas}
            onSelect={setSelectedMotorista}
            onClear={handleClearMotorista}
            disabled={!selectedParceiro}
            icon={User}
          />

          {/* 3. Veículo */}
          <SearchableSelect
            label="Veículo (Truck ou Cavalo)"
            placeholder={selectedParceiro ? "Buscar veículo do parceiro" : "Selecione um parceiro primeiro"}
            valueId={selectedVeiculo}
            options={filteredVeiculos}
            onSelect={setSelectedVeiculo}
            onClear={handleClearVeiculo}
            disabled={!selectedParceiro}
            icon={Truck}
          />

          {/* Seleção de Carretas quando o veículo for Cavalo */}
          {isSelectedVehicleCavalo && parceiroCarretas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Carretas Vinculadas ao Cavalo (Máx. 2)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
                {parceiroCarretas.map(carreta => (
                  <label key={carreta.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formatPlaca(carreta.placaCarreta || carreta.placa || 'Carreta sem placa')} ({carreta.fabricante} {carreta.modelo})
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
                      // Desabilita se já houver 2 carretas selecionadas E esta não for uma delas
                      disabled={!selectedCarretas.includes(carreta.id) && selectedCarretas.length >= 2}
                    />
                  </label>
                ))}
              </div>
              {selectedCarretas.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {selectedCarretas.length} carretas selecionadas para este trajeto.
                  </p>
              )}
            </div>
          )}
          
          {isSelectedVehicleCavalo && parceiroCarretas.length === 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                O veículo selecionado é um Cavalo, mas não há carretas cadastradas para este parceiro.
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salvar
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CargaLinkModal;