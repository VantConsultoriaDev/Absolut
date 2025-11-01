import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função auxiliar para simular o preenchimento do PDF
function simulatePdfFilling(data: any): string {
  // Em uma implementação real, você usaria uma biblioteca como pdf-lib (Deno)
  // ou chamaria um serviço externo para preencher o PDF modelo.
  
  const content = `
    CONTRATO DE FRETE GERADO AUTOMATICAMENTE
    NÚMERO SEQUENCIAL (33): ${data.contratoNumeroSequencial}
    DATA DE EMISSÃO (34): ${data.contratoDataEmissao}
    
    --- DADOS DO PROPRIETÁRIO (PARCEIRO) ---
    1. Permisso Razão Social: ${data.permissoRazaoSocial}
    2. Permisso CNPJ: ${data.permissoCnpj}
    6. Nome Parceiro: ${data.parceiroNome}
    7. Documento Parceiro: ${data.parceiroDocumento}
    12. Contato: ${data.parceiroTelefone}
    
    --- DADOS DO VEÍCULO ---
    3. Placas: ${data.placasVeiculoPrincipal} ${data.placasCarretas ? `+ Carretas: ${data.placasCarretas}` : ''}
    4. Marca: ${data.veiculoMarca}
    5. Ano: ${data.veiculoAno}
    
    --- DADOS DO MOTORISTA ---
    13. Nome Motorista: ${data.motoristaNome}
    14. CPF: ${data.motoristaCpf}
    16. CNH: ${data.motoristaCnh}
    
    --- DADOS DA CARGA ---
    17. Origem: ${data.cargaOrigem}
    20. Destino: ${data.cargaDestino}
    22. Valor Total Carga: ${data.cargaValor}
    29. Cliente: ${data.cargaClienteNome}
    30. Peso: ${data.cargaPeso}
    
    --- VALORES FINANCEIROS ---
    23. Adiantamento: ${data.financeiroAdiantamento}
    26. Saldo a Receber: ${data.financeiroSaldo}
    
    [FIM DA SIMULAÇÃO]
  `;
  
  // Retorna o conteúdo como um Blob simulado (Base64 ou texto)
  return btoa(content); // Retorna Base64 do conteúdo
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  // Cria o cliente Supabase usando a Service Role Key para ignorar RLS
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', 
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    }
  )

  try {
    const { cargaId, userId } = await req.json()
    
    console.log(`[GENERATE_CONTRACT] Received request for Carga ID: ${cargaId} by User ID: ${userId}`);
    
    if (!cargaId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing cargaId or userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Buscar dados da Carga
    const { data: carga, error: cargaError } = await supabaseClient
      .from('cargas')
      .select('*')
      .eq('id', cargaId)
      .single()
    
    if (cargaError || !carga) {
        console.error(`[GENERATE_CONTRACT] Erro ao buscar carga ${cargaId}:`, cargaError?.message || 'Carga não encontrada');
        throw new Error('Carga não encontrada no banco de dados Supabase.');
    }
    
    // 2. Buscar Relações (Parceiro, Motorista, Cliente, Veículo)
    const [parceiro, motorista, cliente, veiculo] = await Promise.all([
        carga.parceiro_id ? supabaseClient.from('parceiros').select('*').eq('id', carga.parceiro_id).single().then(res => res.data) : Promise.resolve(null),
        carga.motorista_id ? supabaseClient.from('motoristas').select('*').eq('id', carga.motorista_id).single().then(res => res.data) : Promise.resolve(null),
        carga.cliente_id ? supabaseClient.from('clientes').select('nome').eq('id', carga.cliente_id).single().then(res => res.data) : Promise.resolve(null),
        carga.veiculo_id ? supabaseClient.from('veiculos').select('*').eq('id', carga.veiculo_id).single().then(res => res.data) : Promise.resolve(null),
    ]);

    // 3. Buscar Permisso Internacional (se houver veículo)
    let permissoData = null;
    if (veiculo?.id) {
        const { data: pData, error: pError } = await supabaseClient
            .from('permisso_internacional')
            .select('razao_social, cnpj')
            .eq('veiculo_id', veiculo.id)
            .single();
        
        if (pError && pError.code !== 'PGRST116') { 
            console.warn('[GENERATE_CONTRACT] Error fetching permisso:', pError.message);
        }
        permissoData = pData;
    }

    // 4. Buscar Movimentações Financeiras
    const { data: movData, error: movError } = await supabaseClient
      .from('movimentacoes_financeiras')
      .select('tipo, categoria, valor, descricao')
      .eq('carga_id', cargaId)

    if (movError) {
      console.error('[GENERATE_CONTRACT] Erro ao buscar movimentações:', movError.message);
      throw new Error(movError.message)
    }

    // 5. Classificar valores financeiros (23, 24, 25, 26)
    let adiantamento = 0; // 23
    let despesasAdicionais = 0; // 24
    let diarias = 0; // 25
    let saldo = 0; // 26
    let hasSplit = false;
    
    movData.forEach(m => {
        const valor = m.valor || 0;
        
        if (m.descricao.startsWith('Adto -')) {
            adiantamento += valor;
            hasSplit = true;
        } else if (m.descricao.startsWith('Saldo -')) {
            saldo += valor;
            hasSplit = true;
        } else if (m.categoria?.toUpperCase() === 'DIARIA') {
            diarias += valor;
        } else if (m.categoria?.toUpperCase() === 'OUTRAS DESPESAS') {
            despesasAdicionais += valor;
        } else if (m.descricao.startsWith('Frete -') && !hasSplit) {
            // Se for lançamento único de frete, o valor total é o saldo
            saldo += valor;
        }
    });
    
    // Se houve split, o valor total da carga (22) é Adiantamento + Saldo - Extras
    // Se não houve split, o saldo (26) é o valor da carga (22)
    const extrasTotal = despesasAdicionais + diarias;
    const cargaValorTotal = hasSplit ? (adiantamento + saldo - extrasTotal) : (carga.valor || 0);
    
    if (!hasSplit && saldo === 0) {
        saldo = cargaValorTotal;
    }

    // 6. Montar Placas (3)
    let placasVeiculoPrincipal = veiculo?.placa || veiculo?.placa_cavalo || 'N/A';
    let placasCarretas = '';
    
    if (veiculo?.carretas_vinculadas && veiculo.carretas_vinculadas.length > 0) {
        // Busca as placas das carretas vinculadas
        const { data: carretasData } = await supabaseClient
            .from('veiculos')
            .select('placa, placa_carreta')
            .in('id', veiculo.carretas_vinculadas);
            
        if (carretasData) {
            placasCarretas = carretasData.map(c => c.placa_carreta || c.placa).join(', ');
        }
    }
    
    // 7. Gerar Número Sequencial (33)
    const date = new Date();
    const datePart = date.toISOString().substring(2, 4) + date.toISOString().substring(5, 7);
    const contractNumber = `${carga.crt || 'CRT-NA'}-${datePart}-01`; // Simplificado

    // 8. Montar o objeto de dados completo (34 campos)
    const contractData = {
        // 1-2: Permisso
        permissoRazaoSocial: permissoData?.razao_social || 'N/A',
        permissoCnpj: permissoData?.cnpj || 'N/A',
        // 3: Veículo Placas
        placasVeiculoPrincipal: placasVeiculoPrincipal,
        placasCarretas: placasCarretas,
        // 4-5: Veículo Detalhes
        veiculoMarca: veiculo?.fabricante || 'N/A',
        veiculoAno: veiculo?.ano || 'N/A',
        // 6-12: Proprietário/Parceiro
        parceiroNome: parceiro?.nome || 'N/A',
        parceiroDocumento: parceiro?.documento || 'N/A',
        parceiroEndereco: parceiro?.endereco || 'N/A',
        parceiroCep: parceiro?.cep || 'N/A',
        parceiroCidade: parceiro?.cidade || 'N/A',
        parceiroEstado: parceiro?.estado || 'N/A',
        parceiroTelefone: parceiro?.telefone || 'N/A',
        // 13-16: Motorista
        motoristaNome: motorista?.nome || 'N/A',
        motoristaCpf: motorista?.cpf || 'N/A',
        motoristaTelefone: motorista?.telefone || 'N/A',
        motoristaCnh: motorista?.cnh || 'N/A',
        // 17-22, 27-30: Carga Detalhes
        cargaOrigem: carga.origem,
        cargaDataColeta: carga.data_coleta,
        cargaCrt: carga.crt || 'N/A',
        cargaDestino: carga.destino,
        cargaDataEntrega: carga.data_entrega,
        cargaValor: cargaValorTotal, // 22
        cargaObservacoes: carga.observacoes || '', // 27
        cargaClienteNome: cliente?.nome || 'N/A', // 29
        cargaPeso: carga.peso || 0, // 30
        // 23-26: Financeiro
        financeiroAdiantamento: adiantamento, // 23
        financeiroDespesasAdicionais: despesasAdicionais, // 24
        financeiroDiarias: diarias, // 25
        financeiroSaldo: saldo, // 26
        // 31-32: Vinculação
        cargaParceiroNome: parceiro?.nome || 'N/A', // 31
        cargaMotoristaNome: motorista?.nome || 'N/A', // 32
        // 33-34: Contrato Metadata
        contratoNumeroSequencial: contractNumber, // 33
        contratoDataEmissao: date.toISOString(), // 34
    };

    // 9. Simular preenchimento do PDF (retorna Base64 do conteúdo)
    const pdfContentBase64 = simulatePdfFilling(contractData);
    const pdfFileName = `contrato_${carga.crt || cargaId}.pdf`;
    
    // 10. Salvar no Supabase Storage
    const { error: storageError } = await supabaseClient.storage
      .from('contratos')
      .upload(pdfFileName, new TextEncoder().encode(pdfContentBase64), {
        contentType: 'application/pdf',
        upsert: true, // Permite substituir ao regerar
      })

    if (storageError) {
      console.error('[GENERATE_CONTRACT] Erro ao salvar no Storage:', storageError.message);
      throw new Error(storageError.message)
    }
    
    // CORREÇÃO: Usar o URL base do Supabase para construir o link público
    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/contratos/${pdfFileName}`;

    // 11. Registrar/Atualizar na tabela contratos_frete
    const { data: contractRecord, error: recordError } = await supabaseClient
      .from('contratos_frete')
      .upsert({
        carga_id: cargaId,
        user_id: userId,
        pdf_url: publicUrl,
        motorista_nome: motorista?.nome,
        parceiro_nome: parceiro?.nome,
        crt: carga.crt,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (recordError) {
      console.error('[GENERATE_CONTRACT] Erro ao registrar contrato:', recordError.message);
      throw new Error(recordError.message)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      pdfUrl: publicUrl,
      contractId: contractRecord.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})