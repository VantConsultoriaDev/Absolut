// Removido: interface CNPJResponse

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
  // Token da API ativo
  private static readonly BEARER_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZ2F0ZXdheS5hcGlicmFzaWwuaW8vYXBpL3YyL2F1dGgvbG9naW4iLCJpYXQiOjE3NjExNDIxMjUsImV4cCI6MTc5MjY3ODEyNSwibmJmIjoxNzYxMTQyMTI1LCJqdGkiOiJkbDVHVUp4cTJETHBzc1pkIiwic3ViIjoiMTc4NDIiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NjY3In0.voI-fsBG_mQWsZounrv8KeiKRMFzkYdE4ACqra2NrSQ';
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

    // Se a flag de dados simulados estiver ativada, usar dados simulados diretamente
    if (this.USE_SIMULATED_DATA) {
      console.log('CNPJService: Usando dados simulados (API temporariamente desabilitada)');
      return this.gerarDadosSimulados(cnpjFormatado);
    }
    
    // Configuração do AbortController com timeout de 120 segundos
    const controller = new AbortController();
    let timeoutId: number | undefined = setTimeout(() => controller.abort("Timeout excedido"), 120000) as unknown as number; // Explicitly cast to number
    
    try {
      console.log('CNPJService: Fazendo requisição para API...');
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.BEARER_TOKEN}`
        },
        body: JSON.stringify({
          tipo: 'cnpj',
          cnpj: cnpjFormatado
        }),
        signal: controller.signal
      });
      
      // Limpa o timeout se a requisição foi bem-sucedida
      clearTimeout(timeoutId);
      timeoutId = undefined;
      
      console.log('CNPJService: Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('CNPJService: Erro HTTP:', response.status, errorText);
        throw new Error(`Erro na consulta do CNPJ: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('CNPJService: Dados recebidos da API (brutos):', data);
      
      // Muitas respostas da ApiBrasil vêm embrulhadas em response.cnpj
      const payload: any = data?.response?.cnpj || data?.response?.data || data?.data || data;
      console.log('CNPJService: Payload normalizado:', payload);
      console.log('CNPJService: Tipo do payload:', typeof payload);
      console.log('CNPJService: Payload é válido?', !!payload && !payload?.error);
      console.log('CNPJService: Campos disponíveis no payload:', Object.keys(payload || {}));
      console.log('CNPJService: razao_social:', payload?.razao_social);
      console.log('CNPJService: nome_fantasia:', payload?.nome_fantasia);
      console.log('CNPJService: municipio:', payload?.municipio);
      console.log('CNPJService: uf:', payload?.uf);
      console.log('CNPJService: cep:', payload?.cep);

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
      
    } catch (error: unknown) { // Catch error as unknown
      // Limpa o timeout em caso de erro
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Identifica o tipo de erro
      let tipoErro = 'Erro desconhecido';
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        tipoErro = 'Erro de conectividade ou CORS';
      } else if (error instanceof Error && error.name === 'AbortError') { // Check if error is an instance of Error
        tipoErro = 'Timeout da requisição';
      }
      
      console.error(`CNPJService: ${tipoErro}:`, error);
      console.log('CNPJService: Usando dados simulados como fallback');
      
      // Fallback para dados simulados em caso de erro
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      const cnpjFormatado = cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
      
      // Dados simulados seguindo a mesma estrutura da API real
      const nomeFantasiaSimulado = `Empresa Simulada ${cnpjLimpo.slice(-4)} Ltda`;
      const enderecoSimulado = 'Rua Exemplo, 123'; // Já montado no formato correto
      
      const dadosSimulados = {
        razaoSocial: nomeFantasiaSimulado,                        // ✅ "nome_fantasia" → Nome Empresarial
        nomeFantasia: nomeFantasiaSimulado,
        cnpj: cnpjFormatado,
        situacao: 'Ativa',
        endereco: enderecoSimulado,                               // ✅ Endereço já montado
        numero: '123',
        complemento: '',
        bairro: 'Centro',
        cidade: 'São Paulo',                                      // ✅ "municipio" → Cidade
        uf: 'SP',                                                 // ✅ "uf" → Estado
        cep: '01000-000',                                         // ✅ "cep"→ CEP
        telefone: '(11) 99999-9999',                              // ✅ Telefone → Contato
        email: 'contato@empresa.com.br',
        atividade: 'Atividades de consultoria em gestão empresarial',
        simulado: true
      };
      
      console.log('CNPJService: Retornando dados simulados:', dadosSimulados);
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

  private static gerarDadosSimulados(cnpjFormatado: string): CNPJData {
    // Extrai os últimos 4 dígitos do CNPJ para criar um nome único
    const cnpjLimpo = cnpjFormatado.replace(/\D/g, '');
    const sufixo = cnpjLimpo.slice(-4);
    
    const nomeFantasiaSimulado = `Empresa Simulada ${sufixo} Ltda`;
    const enderecoSimulado = 'Rua Exemplo, 123';
    
    return {
      razaoSocial: nomeFantasiaSimulado,                        // ✅ "nome_fantasia" → Nome Empresarial
      nomeFantasia: nomeFantasiaSimulado,
      cnpj: cnpjFormatado,
      situacao: 'Ativa',
      endereco: enderecoSimulado,                               // ✅ Endereço já montado
      numero: '123',
      complemento: '',
      bairro: 'Centro',
      cidade: 'São Paulo',                                      // ✅ "municipio" → Cidade
      uf: 'SP',                                                 // ✅ "uf" → Estado
      cep: '01000-000',                                         // ✅ "cep"→ CEP
      telefone: '(11) 99999-9999',                              // ✅ Telefone → Contato
      email: 'contato@empresa.com.br',
      atividade: 'Atividades de consultoria em gestão empresarial',
      simulado: true
    };
  }
}