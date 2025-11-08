import axios from 'axios';
import { formatCNPJ, parseDocument } from '../utils/formatters';

// Interface para a resposta da API externa
export interface PermissoApiData {
  razaoSocial: string;
  nomeFantasia?: string; // NOVO
  cnpj: string;
  enderecoCompleto: string;
  chassi: string; // Novo campo para o CHASSI
}

// Interface para a resposta da API de ANTT Veículo
export interface AnttVeiculoApiData {
  razaoSocial: string;
  nomeFantasia?: string; // ADICIONADO
  cnpj: string;
  chassi: string;
  renavam: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  // Outros campos que podem ser úteis
  capacidade?: number;
  carroceria?: string;
  // Adicionando campos que podem vir na resposta bruta
  endereco?: string; 
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

export class PermissoService {
  // ALTERADO: Usando caminhos relativos para o proxy do Vite
  private static readonly API_URL_PERMISSO = '/api-permisso/api/permisso';
  private static readonly API_URL_ANTT = '/api-permisso/api/antt-veiculo';

  static async consultarPermisso(placa: string): Promise<PermissoApiData | null> {
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (placaLimpa.length < 7) {
      throw new Error('Placa inválida para consulta.');
    }
    
    try {
      const response = await axios.get(this.API_URL_PERMISSO, {
        params: { placa: placaLimpa },
        timeout: 30000, // Aumentado para 30 segundos
      });

      const data = response.data;

      if (!data || data.error) {
        throw new Error(data?.error || 'Nenhum permisso encontrado para esta placa.');
      }
      
      // Normaliza o CNPJ e retorna os dados
      return {
        razaoSocial: data.razaoSocial || '',
        nomeFantasia: data.nomeFantasia || '',
        cnpj: formatCNPJ(parseDocument(data.cnpj || '')),
        enderecoCompleto: data.enderecoCompleto || '',
        chassi: data.chassi || '',
      };

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('AXIOS ERROR DETAILS (Permisso):', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          config: error.config,
        });
      }
      console.error('Erro ao consultar Permisso:', error.message);
      throw new Error(error.response?.data?.error || error.message || 'Falha na comunicação com a API de Permisso.');
    }
  }
  
  static async consultarAnttVeiculo(placa: string): Promise<AnttVeiculoApiData & { enderecoCompleto: string } | null> {
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (placaLimpa.length < 7) {
      throw new Error('Placa inválida para consulta.');
    }

    // Construção da URL com a placa
    const url = `${this.API_URL_ANTT}/${placaLimpa}`;
    
    try {
      // Simplificando a chamada para GET sem configurações extras, exceto timeout
      const response = await axios.get(url, {
        timeout: 30000, // Aumentado para 30 segundos
      });

      const data = response.data;

      if (!data || data.error) {
        throw new Error(data?.error || 'Nenhum dado ANTT encontrado para esta placa.');
      }
      
      // Lógica de mapeamento de endereço:
      let enderecoCompleto = '';
      
      // 1. Prioriza o campo 'endereco' se existir (como no exemplo fornecido pelo usuário)
      if (data.endereco) {
          enderecoCompleto = data.endereco;
      } else {
          // 2. Constrói a partir de campos granulares se o campo 'endereco' não existir
          const enderecoParts = [
            data.logradouro,
            data.numero,
            data.complemento,
            data.bairro,
            data.municipio,
            data.uf,
            data.cep
          ].filter(p => p && typeof p === 'string' && p.trim() !== '');
          
          enderecoCompleto = enderecoParts.join(', ');
      }
      
      // Se o endereço ainda estiver vazio, tenta o logradouro
      if (!enderecoCompleto && data.logradouro) {
          enderecoCompleto = data.logradouro;
      }

      // Retorna os dados brutos da ANTT
      return {
        razaoSocial: data.razaoSocial || '',
        nomeFantasia: data.nomeFantasia || '', // ADICIONADO
        cnpj: data.cnpj || '',
        chassi: data.chassi || '', // GARANTINDO QUE O CHASSI ESTEJA AQUI
        renavam: data.renavam || '',
        placa: data.placa || placaLimpa,
        marca: data.marca || '',
        modelo: data.modelo || '',
        ano: data.ano || 0,
        capacidade: data.capacidade,
        carroceria: data.carroceria,
        // Adicionando o endereço completo mapeado
        enderecoCompleto: enderecoCompleto,
      } as AnttVeiculoApiData & { enderecoCompleto: string };

    } catch (error: any) {
      // Loga o erro completo do Axios para diagnóstico no console
      if (axios.isAxiosError(error)) {
        console.error('AXIOS ERROR DETAILS (ANTT Veiculo):', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          config: error.config,
        });
      }
      
      // Captura o erro de rede ou CORS e lança a mensagem completa
      const errorMessage = error.response?.data?.error || error.message || 'Falha na comunicação com a API ANTT.';
      throw new Error(errorMessage);
    }
  }
}