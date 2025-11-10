import axios from 'axios';
import { formatCNPJ, parseDocument } from '../utils/formatters';

// Interface para a resposta da API externa
export interface PermissoApiData {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  enderecoCompleto: string;
  chassi: string;
  simulado?: boolean;
}

// Interface para a resposta da API de ANTT Veículo (Mantida para tipagem interna, mas não usada para consulta direta)
export interface AnttVeiculoApiData {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  chassi: string;
  renavam: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  capacidade?: number;
  carroceria?: string;
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
  // ALTERADO: Usando o novo caminho de API
  private static readonly API_URL_PERMISSO = '/api-permisso/api';
  
  // Dados de fallback para a placa EVO9081
  private static readonly FALLBACK_DATA: Record<string, Partial<PermissoApiData>> = {
      'EVO9081': {
          razaoSocial: 'COOPERATIVA DOS TRANSPORTADORES AUTÔNOMOS DE CARGAS CAARÓ LTDA',
          nomeFantasia: 'COTRACAARO',
          cnpj: '08189329000154', // Limpo
          chassi: '9BSG4X200D3814052',
          enderecoCompleto: 'RUA JOSÉ INÁCIO WELTER, 967, LAGO AZUL, CAIBATÉ -RS, BRASIL',
          simulado: true,
      }
  };

  /**
   * Consulta dados de Permisso e Chassi usando a nova API.
   * @param placa Placa limpa (7 caracteres).
   * @returns Dados do Permisso e Chassi.
   */
  static async consultarPermisso(placa: string): Promise<PermissoApiData | null> {
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (placaLimpa.length < 7) {
      throw new Error('Placa inválida para consulta.');
    }
    
    try {
      // NOVO ENDPOINT: /api/PLACA
      const response = await axios.get(`${this.API_URL_PERMISSO}/${placaLimpa}`, {
        timeout: 30000,
      });

      const data = response.data;

      if (!data || data.error) {
        throw new Error(data?.error || 'Nenhum permisso encontrado para esta placa.');
      }
      
      // --- Lógica para construir o Endereço Completo ---
      // 1. Tenta usar o campo completo (enderecoCompleto ou endereco_completo)
      let enderecoCompleto = data.enderecoCompleto || data.endereco_completo || '';
      
      // 2. Tenta usar o campo 'endereco' como fallback
      if (!enderecoCompleto) {
          enderecoCompleto = data.endereco || '';
      }

      // 3. Se ainda estiver vazio, tenta construir a partir de partes
      if (!enderecoCompleto) {
          const logradouro = data.logradouro || '';
          const numero = data.numero || '';
          const complemento = data.complemento || '';
          const bairro = data.bairro || '';
          const cidade = data.municipio || '';
          const uf = data.uf || '';
          
          if (logradouro) {
              enderecoCompleto = `${logradouro}${numero ? `, ${numero}` : ''}`;
              if (complemento) enderecoCompleto += ` (${complemento})`;
              if (bairro) enderecoCompleto += ` - ${bairro}`;
              if (cidade && uf) enderecoCompleto += `, ${cidade}/${uf}`;
              else if (cidade) enderecoCompleto += `, ${cidade}`;
          }
      }
      // --- Fim Lógica de Endereço ---
      
      // Mapeamento dos dados da resposta (assumindo que a resposta é um objeto plano com os campos)
      return {
        razaoSocial: data.razaoSocial || data.razao_social || '',
        nomeFantasia: data.nomeFantasia || data.nome_fantasia || '',
        cnpj: formatCNPJ(parseDocument(data.cnpj || '')),
        enderecoCompleto: enderecoCompleto,
        chassi: data.chassi || '',
        simulado: false,
      };

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('AXIOS ERROR DETAILS (Permisso):', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      console.error('Erro ao consultar Permisso:', error.message);
      
      // Fallback para dados simulados se a API falhar
      const fallback = this.FALLBACK_DATA[placaLimpa];
      if (fallback) {
          console.warn(`[FALLBACK] Usando dados simulados para Permisso: ${placaLimpa}`);
          return {
              razaoSocial: fallback.razaoSocial || '',
              nomeFantasia: fallback.nomeFantasia || '',
              cnpj: formatCNPJ(parseDocument(fallback.cnpj || '')),
              enderecoCompleto: fallback.enderecoCompleto || '',
              chassi: fallback.chassi || '',
              simulado: true,
          } as PermissoApiData;
      }
      
      throw new Error(error.response?.data?.error || error.message || 'Falha na comunicação com a API de Permisso.');
    }
  }
  
  // REMOVIDO: A função consultarAnttVeiculo não é mais necessária, pois a nova API consolida a consulta.
  static async consultarAnttVeiculo(_placa: string): Promise<AnttVeiculoApiData & { enderecoCompleto: string } | null> {
      return null;
  }
}