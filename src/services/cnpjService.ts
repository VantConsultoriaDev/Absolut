import axios from 'axios';

// O token deve ser lido das variáveis de ambiente
const API_TOKEN = import.meta.env.VITE_APIBRASIL_TOKEN;

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

    // Formata o CNPJ para o padrão XX.XXX.XXX/XXXX-XX
    const cnpjFormatado = cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    console.log('CNPJService: CNPJ formatado:', cnpjFormatado);

    if (!API_TOKEN) {
      console.error('CNPJService: VITE_APIBRASIL_TOKEN não configurado. Usando dados simulados.');
      return this.gerarDadosSimulados(cnpjFormatado);
    }

    if (this.USE_SIMULATED_DATA) {
      console.log('CNPJService: Usando dados simulados (API temporariamente desabilitada)');
      return this.gerarDadosSimulados(cnpjFormatado);
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

      // Verifica se a resposta contém dados válidos
      if (!payload || payload.error) {
        const errorMessage = payload?.message || payload?.error || 'CNPJ não encontrado ou inválido';
        console.error('CNPJService: Erro nos dados da API:', errorMessage);
        throw new Error(errorMessage);
      }

      // Monta o endereço completo conforme especificação: "tipo_logradouro"+"logradouro"+"numero"
      const enderecoCompleto = [
        payload.descricao_tipo_logradouro,
        payload.logradouro,
        payload.numero
      ].filter(item => item && item.trim()).join(' ');

      // Monta o telefone com DDD
      const telefoneCompleto = payload.ddd_telefone_1 ? 
        `(${payload.ddd_telefone_1.substring(0,2)}) ${payload.ddd_telefone_1.substring(2)}` : '';

      // Normaliza municipio em string (algumas respostas podem trazer objeto)
      const municipioNormalizado = (() => {
        const m = payload?.municipio;
        if (typeof m === 'string') return m;
        if (m && typeof m === 'object') {
          return m.nome || m.descricao || '';
        }
        // Fallbacks para outras estruturas
        if (typeof payload?.endereco?.municipio === 'string') return payload.endereco.municipio;
        return payload?.cidade || '';
      })();

      const resultado = {
        razaoSocial: payload.razao_social || payload.nome_fantasia || payload.nome || '',
        nomeFantasia: payload.nome_fantasia || payload.razao_social || '',
        cnpj: payload.cnpj || cnpjFormatado,
        situacao: payload.descricao_situacao_cadastral || payload.situacao || 'Ativa',
        endereco: enderecoCompleto || payload.endereco || '',
        numero: payload.numero || '',
        complemento: payload.complemento || '',
        bairro: payload.bairro || '',
        cidade: municipioNormalizado,
        uf: payload.uf || payload.estado || '',
        cep: payload.cep || '',
        telefone: telefoneCompleto || payload.telefone || '',
        email: payload.email || '',
        atividade: payload.cnae_fiscal_descricao || payload.atividade_principal || '',
        simulado: false
      };
      
      console.log('CNPJService: Dados processados:', resultado);
      return resultado;
      
    } catch (error: unknown) {
      // Loga o erro detalhado para diagnóstico
      if (axios.isAxiosError(error)) {
        console.error(`CNPJService: Erro Axios. Status: ${error.response?.status}, Mensagem: ${error.message}, Dados:`, error.response?.data);
      } else {
        console.error(`CNPJService: Erro desconhecido na requisição da API:`, error);
      }
      
      console.log('CNPJService: Usando dados simulados como fallback.');
      
      // Fallback para dados simulados em caso de erro
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      const cnpjFormatado = cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
      
      return this.gerarDadosSimulados(cnpjFormatado);
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

  private static gerarDadosSimulados(cnpjFormatado: string): CNPJData {
    // Extrai os últimos 4 dígitos do CNPJ para criar um nome único
    const cnpjLimpo = cnpjFormatado.replace(/\D/g, '');
    const sufixo = cnpjLimpo.slice(-4);
    
    const nomeFantasiaSimulado = `Empresa Simulada ${sufixo} Ltda`;
    const enderecoSimulado = 'Rua Exemplo, 123';
    
    return {
      razaoSocial: nomeFantasiaSimulado,
      nomeFantasia: nomeFantasiaSimulado,
      cnpj: cnpjFormatado,
      situacao: 'Ativa',
      endereco: enderecoSimulado,
      numero: '123',
      complemento: '',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01000-000',
      telefone: '(11) 99999-9999',
      email: 'contato@empresa.com.br',
      atividade: 'Atividades de consultoria em gestão empresarial',
      simulado: true
    };
  }
}