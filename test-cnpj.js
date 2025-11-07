// Script de teste para verificar o funcionamento da API de CNPJ
// Execute este script no console do navegador para testar

const TEST_API_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZ2F0ZXdheS5hcGlicmFzaWwuaW8vYXBpL3YyL2F1dGgvbG9naW4iLCJpYXQiOjE3NjExNDIxMjUsImV4cCI6MTc5MjY3ODEyNSwibmJmIjoxNzYxMTQyMTI1LCJqdGkiOiJkbDVHVUp4cTJETHBzc1pkIiwic3ViIjoiMTc4NDIiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.voI-fsBG_mQWsZounrv8KeiKRMFzkYdE4ACqra2NrSQ";

async function testarCNPJ(cnpj) {
  console.log('=== TESTE DE CNPJ ===');
  console.log('CNPJ a ser testado:', cnpj);
  
  try {
    // Simula a chamada da API como no serviço
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const cnpjFormatado = cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    
    console.log('CNPJ limpo:', cnpjLimpo);
    console.log('CNPJ formatado:', cnpjFormatado);
    
    const response = await fetch('https://gateway.apibrasil.io/api/v2/dados/cnpj/credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_API_TOKEN}`
      },
      body: JSON.stringify({ cnpj: cnpjFormatado })
    });
    
    console.log('Status da resposta:', response.status);
    console.log('Response OK:', response.ok);
    
    const data = await response.json();
    console.log('Dados recebidos da API:', data);
    
    if (response.ok && data) {
      const resultado = {
        razaoSocial: data.razao_social || data.nome || '',
        nomeFantasia: data.nome_fantasia || data.fantasia || '',
        cnpj: data.cnpj || cnpjFormatado,
        situacao: data.situacao || data.status || '',
        endereco: data.logradouro || data.endereco || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.municipio || data.cidade || '',
        uf: data.uf || data.estado || '',
        cep: data.cep || '',
        telefone: data.telefone || data.ddd_telefone_1 || '',
        email: data.email || '',
        atividade: data.atividade_principal || data.cnae_fiscal_descricao || ''
      };
      
      console.log('Dados processados:', resultado);
      console.log('✅ API funcionando corretamente!');
      return resultado;
    } else {
      throw new Error(data?.message || 'CNPJ não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro na API:', error);
    
    // Dados simulados em caso de erro
    const dadosSimulados = {
      razaoSocial: `Empresa Simulada ${cnpjLimpo.slice(-4)}`,
      nomeFantasia: `Fantasia ${cnpjLimpo.slice(-4)}`,
      cnpj: cnpjFormatado,
      situacao: 'Ativa',
      endereco: 'Rua Exemplo',
      numero: '123',
      complemento: '',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01000-000',
      telefone: '(11) 99999-9999',
      email: 'contato@empresa.com.br',
      atividade: 'Atividades de consultoria em gestão empresarial'
    };
    
    console.log('🔄 Retornando dados simulados:', dadosSimulados);
    return dadosSimulados;
  }
}

// Testes com diferentes CNPJs
console.log('Para testar, execute:');
console.log('testarCNPJ("31.357.341/0001-4")');
console.log('testarCNPJ("11.222.333/0001-81")');
console.log('testarCNPJ("38.471.372/0001-7")');