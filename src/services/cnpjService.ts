import axios from 'axios';
import { parseDocument } from '../utils/formatters';

// O token não é mais necessário para a BrasilAPI
const API_TOKEN = import.meta.env.VITE_APIBRASIL_TOKEN || ""; 

interface CNPJData {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  situacao: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  atividade: string;
  simulado?: boolean;
}

export class CNPJService {
  // ALTERADO: Usando o endpoint da BrasilAPI
  private static readonly API_URL = 'https://brasilapi.com.br/api/cnpj/v1/';
  private static readonly USE_SIMULATED_DATA = false; 

  static async consultarCNPJ(cnpj: string): Promise<CNPJData | null> {
    console.log('CNPJService: Iniciando consulta BrasilAPI para CNPJ:', cnpj);
    
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ deve ter 14 dígitos');
    }
    
    if (!this.validarCNPJ(cnpjLimpo)) {
        throw new Error('CNPJ inválido (falha na validação de dígitos).');
    }

    if (this.USE_SIMULATED_DATA) {
      throw new Error('Consulta de CNPJ desabilitada por configuração.');
    }
    
    try {
      // A BrasilAPI usa o CNPJ limpo na URL
      const response = await axios.get(
        `${this.API_URL}${cnpjLimpo}`,
        { timeout: 30000 }
      );
      
      const data = response.data;
      
      if (response.status !== 200 || data.message) {
        const errorMessage = data.message || 'CNPJ não encontrado ou inválido na BrasilAPI.';
        console.error('CNPJService: Erro na BrasilAPI:', errorMessage);
        return null;
      }

      // --- Mapeamento para a estrutura da BrasilAPI ---
      const resultado: CNPJData = {
        razaoSocial: data.razao_social || data.nome_fantasia || '',
        nomeFantasia: data.nome_fantasia || data.razao_social || '',
        cnpj: data.cnpj || cnpjLimpo,
        situacao: data.situacao_cadastral || 'ATIVA',
        endereco: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.municipio || '',
        uf: data.uf || '',
        cep: data.cep || '',
        // A BrasilAPI retorna telefones como array, pegamos o primeiro
        telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0, 2)}) ${data.ddd_telefone_1.substring(2)}` : '',
        email: data.email || '',
        atividade: data.cnae_fiscal_descricao || '',
        simulado: false
      };
      
      console.log('CNPJService: Dados processados (BrasilAPI):', resultado);
      return resultado;
      
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.warn('CNPJ não encontrado na BrasilAPI.');
          return null;
      }
      
      console.error(
        `CNPJService: Erro na requisição para BrasilAPI:`, 
        axios.isAxiosError(error) ? error.message : error
      );
      
      // --- FALLBACK DE DADOS SIMULADOS (Se a API falhar completamente) ---
      const cnpjFormatado = this.formatarCNPJ(cnpjLimpo);
      const dadosSimulados: CNPJData = {
        razaoSocial: `Razão Social Desconhecida (Simulado)`,
        nomeFantasia: `Fantasia (Simulado)`,
        cnpj: cnpjFormatado,
        situacao: 'Ativa',
        endereco: 'Rua Exemplo',
        numero: '123',
        complemento: 'Sala 1',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01000-000',
        telefone: '(11) 99999-9999',
        email: 'contato@empresa.com.br',
        atividade: 'Atividades de consultoria em gestão empresarial',
        simulado: true
      };
      
      console.log('CNPJService: Falha na API. Retornando dados simulados.');
      return dadosSimulados;
    }
  }

  static formatarCNPJ(cnpj: string): string {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  static validarCNPJ(cnpj: string): boolean {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpjLimpo)) return false;
    
    let soma = 0;
    let peso = 2;
    
    // Primeiro dígito verificador
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(cnpjLimpo.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    let digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    
    if (parseInt(cnpjLimpo.charAt(12)) !== digito1) return false;
    
    // Segundo dígito verificador
    soma = 0;
    peso = 2;
    
    for (let i = 12; i >= 0; i--) {
      soma += parseInt(cnpjLimpo.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    let digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    
    return parseInt(cnpjLimpo.charAt(13)) === digito2;
  }
}