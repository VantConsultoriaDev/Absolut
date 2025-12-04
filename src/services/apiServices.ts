// Serviços para integração com APIs externas
import axios from "axios";

// O token deve ser lido das variáveis de ambiente
const API_TOKEN = import.meta.env.VITE_APIBRASIL_TOKEN || ""; // Garante que seja uma string

// Interface para dados de CNPJ
export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao: string;
  tipo: string;
  porte: string;
  natureza_juridica: string;
  atividade_principal: {
    codigo: string;
    descricao: string;
  };
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    uf: string;
  };
  telefone?: string;
  email?: string;
  data_abertura: string;
  capital_social: number;
}

// Interface para dados de veículo
export interface VehicleData {
  placa: string;
  chassi?: string;
  renavam: string;
  marca: string;
  modelo: string;
  ano_fabricacao: number;
  ano_modelo: number;
  cor: string;
  combustivel: string;
  categoria: string;
  especie: string;
  situacao: string;
  municipio: string;
  uf: string;
}

// Classe para gerenciar as APIs
export class APIService {
  private static readonly CNPJ_API_URL = 'https://gateway.apibrasil.io/api/v2/dados/cnpj/credits';
  private static readonly VEHICLE_API_URL = 'https://gateway.apibrasil.io/api/v2/vehicles/base/000/dados';
  
  // Método para buscar dados do CNPJ
  static async fetchCNPJData(cnpj: string): Promise<CNPJData | null> {
    try {
      // REMOVIDO: if (!API_TOKEN) { throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) não está configurado.'); }
      
      // Remove formatação do CNPJ (pontos, barras, hífens)
      const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
      
      if (cleanCNPJ.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos');
      }

      const response = await axios.post(
        this.CNPJ_API_URL,
        {
          tipo: "cnpj",
          cnpj: cleanCNPJ,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
          },
          timeout: 120000, // 120 segundos
        }
      );

      if (response.data?.error) {
        throw new Error(response.data.message || "Erro ao consultar CNPJ");
      }

      // Retorna os dados do CNPJ da resposta
      return response.data.response.cnpj;
    } catch (error: any) {
      console.error('Erro ao buscar dados do CNPJ:', error.message);
      throw error;
    }
  }

  // Método para buscar dados do veículo
  static async fetchVehicleData(placa: string): Promise<VehicleData | null> {
    try {
      // REMOVIDO: if (!API_TOKEN) { throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) não está configurado.'); }
      
      // Remove formatação da placa
      const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '');
      
      if (cleanPlaca.length !== 7) {
        throw new Error('Placa deve ter 7 caracteres');
      }

      const response = await axios.post(
        this.VEHICLE_API_URL,
        {
          // API pode esperar letras maiúsculas; enviamos upper sem alterar estado local
          placa: cleanPlaca.toUpperCase(),
          homolog: false,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
          },
          timeout: 120000, // 120 segundos
        }
      );

      if (response.data?.error) {
        throw new Error(response.data.message || "Erro na consulta");
      }

      // Remove o campo chassi da resposta
      const vehicleData = response.data.data;
      if (vehicleData && vehicleData.chassi) {
        delete vehicleData.chassi;
      }

      return vehicleData;
    } catch (error: any) {
      console.error('Erro ao buscar dados do veículo:', error.message);
      throw error;
    }
  }

  // Método para validar CNPJ
  static validateCNPJ(cnpj: string): boolean {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    
    if (cleanCNPJ.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
    
    // Validação dos dígitos verificadores
    let soma = 0;
    let peso = 2;
    
    // Primeiro dígito verificador
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(cleanCNPJ.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    const resto = soma % 11;
    const dv1 = resto < 2 ? 0 : 11 - resto;
    
    if (parseInt(cleanCNPJ.charAt(12)) !== dv1) return false;
    
    // Segundo dígito verificador
    soma = 0;
    peso = 2;
    
    for (let i = 12; i >= 0; i--) {
      soma += parseInt(cleanCNPJ.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    const resto2 = soma % 11;
    const dv2 = resto2 < 2 ? 0 : 11 - resto2;
    
    return parseInt(cleanCNPJ.charAt(13)) === dv2;
  }

  // Método para validar placa (formato antigo e Mercosul)
  static validatePlaca(placa: string): boolean {
    const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '');
    
    // Formato antigo: AAA0000
    const formatoAntigo = /^[A-Z]{3}[0-9]{4}$/i;
    // Formato Mercosul: AAA0A00
    const formatoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/i;
    
    return formatoAntigo.test(cleanPlaca) || formatoMercosul.test(cleanPlaca);
  }

  // Método para formatar CNPJ
  static formatCNPJ(cnpj: string): string {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    return cleanCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  // Método para formatar placa
  static formatPlaca(placa: string): string {
    const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '');
    
    // Formato Mercosul: AAA0A00
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/i.test(cleanPlaca)) {
      return cleanPlaca.replace(/^([A-Z]{3})([0-9])([A-Z])([0-9]{2})$/i, '$1$2$3$4');
    }
    
    // Formato antigo: AAA-0000
    return cleanPlaca.replace(/^([A-Z]{3})([0-9]{4})$/i, '$1-$2');
  }
}

// Hook personalizado para usar os serviços de API
export const useAPIService = () => {
  const fetchCNPJ = async (cnpj: string) => {
    return await APIService.fetchCNPJData(cnpj);
  };

  const fetchVehicle = async (placa: string) => {
    return await APIService.fetchVehicleData(placa);
  };

  const validateCNPJ = (cnpj: string) => {
    return APIService.validateCNPJ(cnpj);
  };

  const validatePlaca = (placa: string) => {
    return APIService.validatePlaca(placa);
  };

  const formatCNPJ = (cnpj: string) => {
    return APIService.formatCNPJ(cnpj);
  };

  const formatPlaca = (placa: string) => {
    return APIService.formatPlaca(placa);
  };

  return {
    fetchCNPJ,
    fetchVehicleData: fetchVehicle,
    validateCNPJ,
    validatePlaca,
    formatCNPJ,
    formatPlaca
  };
};

// Função separada para consulta de CNPJ conforme solicitado
const API_URL_CNPJ = "https://gateway.apibrasil.io/api/v2/dados/cnpj/credits";

export async function consultarCnpj(cnpj: string) {
  try {
    // REMOVIDO: if (!API_TOKEN) { throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) não está configurado.'); }
    
    const response = await axios.post(
      API_URL_CNPJ,
      {
        tipo: "cnpj",
        cnpj,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        timeout: 120000,
      }
    );

    if (response.data?.error) {
      throw new Error(response.data.message || "Erro ao consultar CNPJ");
    }

    return response.data.response.cnpj;
  } catch (error: any) {
    console.error("Erro ao consultar CNPJ:", error.message);
    throw error;
  }
}

// Função separada para consulta de placa conforme solicitado
const API_URL_PLACA = "https://gateway.apibrasil.io/api/v2/vehicles/base/000/dados";

export async function buscarDadosPlaca(placa: string) {
  try {
    // REMOVIDO: if (!API_TOKEN) { throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) não está configurado.'); }
    
    const response = await axios.post(
      API_URL_PLACA,
      {
        placa,
        homolog: false,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        timeout: 120000, // 120 segundos
      }
    );

    if (response.data?.error) {
      throw new Error(response.data.message || "Erro na consulta");
    }

    return response.data.data;
  } catch (error: any) {
    console.error("Erro ao buscar dados do veículo:", error.message);
    throw error;
  }
}