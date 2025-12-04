import axios from 'axios';
import { formatContact, parseDocument } from '../utils/formatters';

// O token deve ser lido das variáveis de ambiente
const API_TOKEN = import.meta.env.VITE_APIBRASIL_TOKEN || ""; // Garante que seja uma string

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
      // O payload principal está aninhado em response.content
      const content = data?.response?.content;

      if (!content || data.error || data.message?.toLowerCase().includes('não encontrado')) {
        const errorMessage = data?.message || data?.error || 'CPF não encontrado ou inválido';
        console.error('CPFService: Erro nos dados da API:', errorMessage);
        
        if (response.status === 401 || response.status === 403) {
             throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) é inválido ou expirado. Verifique a configuração.');
        }
        
        return null;
      }
      
      // --- Mapeamento dos campos (usando o novo payload 'content') ---
      
      // 1. Nome e Data de Nascimento (Aninhados em content.nome.conteudo)
      const nomePayload = content.nome?.conteudo;
      const nome = nomePayload?.nome || '';
      
      // 2. Data de Nascimento (DD/MM/YYYY -> YYYY-MM-DD)
      let dataNascimento = '';
      if (nomePayload?.data_nascimento) {
          const parts = nomePayload.data_nascimento.split('/');
          if (parts.length === 3) {
              dataNascimento = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
      }
      
      // 3. RG e Órgão Emissor (Aninhados em content.outros_documentos)
      const outrosDocsPayload = content.outros_documentos;
      const rg = outrosDocsPayload?.rg || '';
      
      let orgaoEmissor = '';
      const rgFull = outrosDocsPayload?.rg_full;
      if (rgFull?.orgaoEmissor || rgFull?.uf) {
          orgaoEmissor = [rgFull.orgaoEmissor, rgFull.uf].filter(Boolean).join(' ').trim();
      }
      
      // 4. Email e Telefone (Prioriza Contato Preferencial)
      let email = '';
      let telefone = '';
      
      // Prioridade 1: Contato Preferencial
      const contatoPreferencial = content.contato_preferencial?.conteudo;
      if (Array.isArray(contatoPreferencial)) {
          contatoPreferencial.forEach((item: any) => {
              if (item.tipo === 'EMAIL' && item.valor && !email) {
                  email = item.valor;
              }
              if (item.tipo === 'TELEFONE' && item.valor && !telefone) {
                  // Remove 55 (código país) se presente
                  telefone = item.valor.startsWith('55') ? item.valor.substring(2) : item.valor;
              }
          });
      }
      
      // Prioridade 2: Lista de Emails (se o preferencial não tiver)
      if (!email && Array.isArray(content.emails?.conteudo) && content.emails.conteudo.length > 0) {
          email = content.emails.conteudo[0];
      }
      
      // Prioridade 3: Lista de Telefones (se o preferencial não tiver)
      if (!telefone && Array.isArray(content.pesquisa_telefones?.conteudo) && content.pesquisa_telefones.conteudo.length > 0) {
          const telItem = content.pesquisa_telefones.conteudo.find((t: any) => t.numero);
          if (telItem) {
              telefone = telItem.numero.startsWith('55') ? telItem.numero.substring(2) : telItem.numero;
          }
      }
      
      const resultado: CPFData = {
        nome: nome,
        dataNascimento: dataNascimento,
        rg: rg || undefined,
        orgaoEmissor: orgaoEmissor || undefined,
        // Aplica formatação de contato no final
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