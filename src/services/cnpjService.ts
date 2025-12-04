import axios from 'axios';

// O token deve ser lido das variáveis de ambiente
const API_TOKEN = import.meta.env.VITE_APIBRASIL_TOKEN || ""; // Garante que seja uma string

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
  uf: string; // RENOMEADO
  cep: string;
  telefone: string;
  email: string;
  atividade: string;
  simulado?: boolean; // Flag para indicar se os dados são simulados
}

export class CNPJService {
  private static readonly API_URL = 'https://gateway.apibrasil.io/api/v2/dados/cnpj/credits';
  private static readonly USE_SIMULATED_DATA = false; // Flag para usar API real

  static async consultarCNPJ(cnpj: string): Promise<CNPJData | null> {
    console.log('CNPJService: Iniciando consulta para CNPJ:', cnpj);
    
    // Remove formatação do CNPJ
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ deve ter 14 dígitos');
    }
    
    // NOVO: Valida o CNPJ antes de consultar a API
    if (!this.validarCNPJ(cnpjLimpo)) {
        throw new Error('CNPJ inválido (falha na validação de dígitos).');
    }

    // Formata o CNPJ para o padrão XX.XXX.XXX/XXXX-XX
    const cnpjFormatado = cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    
    // --- NOVO: Lógica de Fallback se o token não estiver configurado ---
    if (!API_TOKEN) {
      console.warn('CNPJService: VITE_APIBRASIL_TOKEN não configurado. Usando dados simulados.');
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
        uf: 'SP', // USANDO 'uf'
        cep: '01000-000',
        telefone: '(11) 99999-9999',
        email: 'contato@empresa.com.br',
        atividade: 'Atividades de consultoria em gestão empresarial',
        simulado: true
      };
      return dadosSimulados;
    }
    // --- FIM NOVO FALLBACK ---

    if (this.USE_SIMULATED_DATA) {
      throw new Error('Consulta de CNPJ desabilitada por configuração.');
    }
    
    try {
      console.log('CNPJService: Fazendo requisição para API com Axios...');
      
      const response = await axios.post(
        this.API_URL,
        {
          tipo: 'cnpj',
          cnpj: cnpjFormatado
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
          },
          timeout: 120000, // 120 segundos
        }
      );
      
      console.log('CNPJService: Status da resposta:', response.status);
      
      const data = response.data;
      
      // Muitas respostas da ApiBrasil vêm embrulhadas em response.cnpj
      const payload: any = data?.response?.cnpj || data?.response?.data || data?.data || data;
      
      // NOVO LOG: Exibe o payload bruto para diagnóstico
      console.log('CNPJService: Payload Bruto da API:', payload);

      // Verifica se a resposta contém dados válidos ou se há erro explícito
      if (!payload || payload.error || payload.message?.toLowerCase().includes('não encontrado')) {
        const errorMessage = payload?.message || payload?.error || 'CNPJ não encontrado ou inválido';
        console.error('CNPJService: Erro nos dados da API:', errorMessage);
        
        if (response.status === 401 || response.status === 403) {
             throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) é inválido ou expirado. Verifique a configuração.');
        }
        
        // Se o CNPJ não for encontrado, retorna null
        return null;
      }

      // --- NOVO MAPEAMENTO DE CAMPOS (ESTRITO) ---
      
      // 1. Razão Social: APENAS payload.empresa.razao_social
      const razaoSocialFinal = payload.empresa?.razao_social || '';
      
      // 2. Nome Fantasia: APENAS payload.response.nome_fantasia
      const nomeFantasiaFinal = payload.response?.nome_fantasia || '';
      
      // 3. Email: Lógica expandida para buscar o email
      let emailFinal = '';
      const possibleEmails = [
          payload.response?.correio_eletronico, // Prioridade 1: Campo aninhado
          payload.email,                       // Prioridade 2: Campo email no payload principal
          payload.contato?.email,              // Prioridade 3: Campo aninhado em contato
      ].filter(e => typeof e === 'string' && e.includes('@'));
      
      if (possibleEmails.length > 0) {
          emailFinal = possibleEmails[0];
      }
      
      // 4. Contato (Telefone): Prioriza ddd1 + telefone1
      const telefoneCompleto = payload.ddd1 && payload.telefone1 ? 
        `(${payload.ddd1}) ${payload.telefone1}` : 
        payload.ddd_telefone_1 ? 
        `(${payload.ddd_telefone_1.substring(0,2)}) ${payload.ddd_telefone_1.substring(2)}` : 
        payload.telefone || '';
        
      // 5. Endereço (Logradouro): Prioriza tipo_logradouro + logradouro
      const tipoLogradouro = payload.tipo_logradouro || payload.descricao_tipo_logradouro || '';
      const logradouro = payload.logradouro || '';
      
      const enderecoFinal = [
        tipoLogradouro,
        logradouro
      ].filter(item => item && item.trim()).join(' ');
      
      // 6. Número
      const numeroFinal = payload.numero || '';
      
      // 7. Complemento
      const complementoFinal = payload.complemento || '';
      
      // 8. Cidade (Município): Prioriza municipio.descricao
      const municipioNormalizado = (() => {
        const m = payload?.municipio;
        if (typeof m === 'string') return m;
        if (m && typeof m === 'object') {
          return m.descricao || m.nome || ''; // Prioriza 'descricao' conforme o novo mapeamento
        }
        return payload?.cidade || '';
      })();
      
      // 9. UF
      const ufFinal = payload.uf || payload.estado || '';
      
      // 10. CEP
      const cepFinal = payload.cep || '';
      
      // --- FIM NOVO MAPEAMENTO ---
      
      const resultado: CNPJData = {
        razaoSocial: razaoSocialFinal,
        nomeFantasia: nomeFantasiaFinal, 
        cnpj: payload.cnpj || cnpjFormatado,
        situacao: payload.descricao_situacao_cadastral || payload.situacao || 'Ativa',
        endereco: enderecoFinal, 
        numero: numeroFinal,
        complemento: complementoFinal,
        bairro: payload.bairro || '', // Mantido o campo original para bairro
        cidade: municipioNormalizado,
        uf: ufFinal, // USANDO 'uf'
        cep: cepFinal,
        telefone: telefoneCompleto,
        email: emailFinal,
        atividade: payload.cnae_fiscal_descricao || payload.atividade_principal || '',
        simulado: false
      };
      
      console.log('CNPJService: Dados processados:', resultado);
      return resultado;
      
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error(`CNPJService: Erro Axios. Status: ${error.response?.status}, Mensagem: ${error.message}, Dados:`, error.response?.data);
        
        if (error.response?.status === 401 || error.response?.status === 403) {
             // Lança o erro de autorização para ser capturado pelo componente
             throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) é inválido ou expirado. Verifique a configuração.');
        }
      } else {
        console.error(`CNPJService: Erro desconhecido na requisição da API:`, error);
      }
      
      // --- FALLBACK DE DADOS SIMULADOS ---
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
        uf: 'SP', // USANDO 'uf'
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
    // Remove caracteres não numéricos
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    // Aplica a máscara XX.XXX.XXX/XXXX-XX
    return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  static validarCNPJ(cnpj: string): boolean {
    // Remove caracteres não numéricos
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    // Verifica se tem 14 dígitos
    if (cnpjLimpo.length !== 14) {
      return false;
    }
    
    // Verifica se não são todos os dígitos iguais
    if (/^(\d)\1+$/.test(cnpjLimpo)) {
      return false;
    }
    
    // Validação dos dígitos verificadores
    let soma = 0;
    let peso = 2;
    
    // Primeiro dígito verificador
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(cnpjLimpo.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    let digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    
    if (parseInt(cnpjLimpo.charAt(12)) !== digito1) {
      return false;
    }
    
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