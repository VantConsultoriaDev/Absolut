import axios from 'axios';
import { formatContact, parseDocument } from '../utils/formatters';

// O token deve ser lido das variáveis de ambiente
const API_TOKEN = import.meta.env.VITE_APIBRASIL_TOKEN;

export interface CPFData {
  nome: string;
  dataNascimento: string; // YYYY-MM-DD string for input type="date"
  rg?: string;
  orgaoEmissor?: string; // Ex: SSP MG
  email?: string;
  telefone?: string;
  simulado?: boolean;
}

export class CPFService {
  private static readonly API_URL = 'https://gateway.apibrasil.io/api/v2/consulta/cpf/credits';
  private static readonly USE_SIMULATED_DATA = false;

  static async consultarCPF(cpf: string): Promise<CPFData | null> {
    const cpfLimpo = parseDocument(cpf);

    if (cpfLimpo.length !== 11) {
      throw new Error('CPF deve ter 11 dígitos');
    }

    if (!API_TOKEN) {
      console.error('CPFService: VITE_APIBRASIL_TOKEN não configurado.');
      throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) não está configurado.');
    }

    if (this.USE_SIMULATED_DATA) {
      // Fallback de dados simulados
      return {
        nome: `Motorista Simulado ${cpfLimpo.slice(-4)}`,
        dataNascimento: '1990-01-01',
        rg: '12345678',
        orgaoEmissor: 'SSP SP',
        email: 'simulado@email.com',
        telefone: '11987654321',
        simulado: true,
      };
    }

    try {
      const response = await axios.post(
        this.API_URL,
        {
          cpf: cpfLimpo,
          tipo: 'dados-cadastrais',
          homolog: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
          },
          timeout: 120000,
        }
      );

      const data = response.data;
      const payload = data?.response?.cpf || data?.data || data;

      if (!payload || payload.error || payload.message?.toLowerCase().includes('não encontrado')) {
        const errorMessage = payload?.message || payload?.error || 'CPF não encontrado ou inválido';
        console.error('CPFService: Erro nos dados da API:', errorMessage);
        
        if (response.status === 401 || response.status === 403) {
             throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) é inválido ou expirou. Verifique a configuração.');
        }
        
        return null;
      }
      
      // --- Mapeamento dos campos ---
      
      // 1. Nome
      const nome = payload.nome || '';
      
      // 2. Data de Nascimento (DD/MM/YYYY -> YYYY-MM-DD)
      let dataNascimento = '';
      if (payload.data_nascimento) {
          const parts = payload.data_nascimento.split('/');
          if (parts.length === 3) {
              dataNascimento = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
      }
      
      // 3. RG e Órgão Emissor
      let rg = '';
      let orgaoEmissor = '';
      
      const outrosDocs = payload.outros_documentos || {};
      if (outrosDocs.rg) {
          rg = outrosDocs.rg;
          // Tenta construir o órgão emissor (Ex: SSP MG)
          if (outrosDocs.orgaoEmissor || outrosDocs.uf) {
              orgaoEmissor = [outrosDocs.orgaoEmissor, outrosDocs.uf].filter(Boolean).join(' ').trim();
          }
      }
      
      // 4. Email e Telefone (Busca em 'conteudo' array)
      let email = '';
      let telefone = '';
      
      if (Array.isArray(payload.conteudo)) {
          payload.conteudo.forEach((item: any) => {
              if (item.tipo === 'EMAIL' && item.valor && !email) {
                  email = item.valor;
              }
              if (item.tipo === 'TELEFONE' && item.valor && !telefone) {
                  // O valor do telefone pode vir no formato 5547988303099 (Código País + DDD + Número)
                  // Formatamos para o padrão local (DDD + Número)
                  if (item.valor.startsWith('55')) {
                      telefone = item.valor.substring(2); // Remove 55
                  } else {
                      telefone = item.valor;
                  }
              }
          });
      }
      
      const resultado: CPFData = {
        nome: nome,
        dataNascimento: dataNascimento,
        rg: rg || undefined,
        orgaoEmissor: orgaoEmissor || undefined,
        telefone: telefone ? formatContact(telefone) : undefined,
        email: email || undefined,
        simulado: false
      };
      
      return resultado;

    } catch (error: any) {
      console.error('Erro ao consultar CPF:', error.message);
      
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) é inválido ou expirado. Verifique a configuração.');
      }
      
      // Retorna null em caso de falha na API
      return null;
    }
  }
}