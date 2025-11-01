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
    CRT: ${data.cargaCrt || 'N/A'}
    NÚMERO SEQUENCIAL: ${data.contratoNumeroSequencial}
    
    [SIMULAÇÃO DE CONTEÚDO PDF PREENCHIDO COM 34 CAMPOS]
    
    1. Permisso Razão Social: ${data.permissoRazaoSocial}
    26. Saldo a Receber: ${data.financeiroSaldo}
  `;
  
  // Retorna o conteúdo como um Blob simulado (Base64 ou texto)
  return btoa(content); // Retorna Base64 do conteúdo
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Usando Service Role Key para acesso seguro
  )

  try {
    const { cargaId, userId } = await req.json()
    
    if (!cargaId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing cargaId or userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Buscar dados da Carga e todas as relações necessárias
    const { data: cargaData, error: cargaError } = await supabaseClient
      .from('cargas')
      .select(`
        id, crt, origem, destino, valor, peso, observacoes, data_coleta, data_entrega,
        cliente:clientes(nome),
        motorista:motoristas(nome, cpf, cnh, telefone),
        parceiro:parceiros(nome, documento, endereco, cep, cidade, estado, telefone),
        veiculo:veiculos(id, placa, placa_cavalo, placa_carreta, tipo, fabricante, ano, carretas_vinculadas)
      `)
      .eq('id', cargaId)
      .single()

    if (cargaError || !cargaData) {
      throw new Error(cargaError?.message || 'Carga não encontrada.')
    }
    
    // 2. Buscar Permisso Internacional (se houver veículo)
    let permissoData = null;
    if (cargaData.veiculo?.id) {
        const { data: pData, error: pError } = await supabaseClient
            .from('permisso_internacional')
            .select('razao_social, cnpj')
            .eq('veiculo_id', cargaData.veiculo.id)
            .single();
        
        if (pError && pError.code !== 'PGRST116') { // PGRST116 = No rows found
            console.warn('Error fetching permisso:', pError.message);
        }
        permissoData = pData;
    }

    // 3. Buscar Movimentações Financeiras
    const { data: movData, error: movError } = await supabaseClient
      .from('movimentacoes_financeiras')
      .select('tipo, categoria, valor, descricao')
      .eq('carga_id', cargaId)

    if (movError) {
      throw new Error(movError.message)
    }

    // 4. Classificar valores financeiros (23, 24, 25, 26)
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
    const cargaValorTotal = hasSplit ? (adiantamento + saldo - extrasTotal) : (cargaData.valor || 0);
    
    if (!hasSplit && saldo === 0) {
        saldo = cargaValorTotal;
    }

    // 5. Montar Placas (3)
    let placasVeiculoPrincipal = cargaData.veiculo?.placa || cargaData.veiculo?.placa_cavalo || 'N/A';
    let placasCarretas = '';
    
    if (cargaData.veiculo?.carretas_vinculadas && cargaData.veiculo.carretas_vinculadas.length > 0) {
        // Busca as placas das carretas vinculadas
        const { data: carretasData } = await supabaseClient
            .from('veiculos')
            .select('placa, placa_carreta')
            .in('id', cargaData.veiculo.carretas_vinculadas);
            
        if (carretasData) {
            placasCarretas = carretasData.map(c => c.placa_carreta || c.placa).join(', ');
        }
    }
    
    // 6. Gerar Número Sequencial (33)
    // Simulação: CRT + Data (YYMM) + Sequencial (01)
    const date = new Date();
    const datePart = date.toISOString().substring(2, 4) + date.toISOString().substring(5, 7);
    const contractNumber = `${cargaData.crt || 'CRT-NA'}-${datePart}-01`; // Simplificado

    // 7. Montar o objeto de dados completo
    const contractData = {
        // 1-2: Permisso
        permissoRazaoSocial: permissoData?.razao_social || 'N/A',
        permissoCnpj: permissoData?.cnpj || 'N/A',
        // 3: Veículo Placas
        placasVeiculoPrincipal: placasVeiculoPrincipal,
        placasCarretas: placasCarretas,
        // 4-5: Veículo Detalhes
        veiculoMarca: cargaData.veiculo?.fabricante || 'N/A',
        veiculoAno: cargaData.veiculo?.ano || 'N/A',
        // 6-12: Proprietário/Parceiro
        parceiroNome: cargaData.parceiro?.nome || 'N/A',
        parceiroDocumento: cargaData.parceiro?.documento || 'N/A',
        parceiroEndereco: cargaData.parceiro?.endereco || 'N/A',
        parceiroCep: cargaData.parceiro?.cep || 'N/A',
        parceiroCidade: cargaData.parceiro?.cidade || 'N/A',
        parceiroEstado: cargaData.parceiro?.estado || 'N/A',
        parceiroTelefone: cargaData.parceiro?.telefone || 'N/A',
        // 13-16: Motorista
        motoristaNome: cargaData.motorista?.nome || 'N/A',
        motoristaCpf: cargaData.motorista?.cpf || 'N/A',
        motoristaTelefone: cargaData.motorista?.telefone || 'N/A',
        motoristaCnh: cargaData.motorista?.cnh || 'N/A',
        // 17-22, 27-30: Carga Detalhes
        cargaOrigem: cargaData.origem,
        cargaDataColeta: cargaData.data_coleta,
        cargaCrt: cargaData.crt || 'N/A',
        cargaDestino: cargaData.destino,
        cargaDataEntrega: cargaData.data_entrega,
        cargaValor: cargaValorTotal, // 22
        cargaObservacoes: cargaData.observacoes || '',
        cargaClienteNome: cargaData.cliente?.nome || 'N/A', // 29
        cargaPeso: cargaData.peso || 0, // 30
        // 23-26: Financeiro
        financeiroAdiantamento: adiantamento, // 23
        financeiroDespesasAdicionais: despesasAdicionais, // 24
        financeiroDiarias: diarias, // 25
        financeiroSaldo: saldo, // 26
        // 31-32: Vinculação
        cargaParceiroNome: cargaData.parceiro?.nome || 'N/A', // 31
        cargaMotoristaNome: cargaData.motorista?.nome || 'N/A', // 32
        // 33-34: Contrato Metadata
        contratoNumeroSequencial: contractNumber, // 33
        contratoDataEmissao: date.toISOString(), // 34
    };

    // 8. Simular preenchimento do PDF (retorna Base64 do conteúdo)
    const pdfContentBase64 = simulatePdfFilling(contractData);
    const pdfFileName = `contrato_${cargaData.crt || cargaId}.pdf`;
    
    // 9. Salvar no Supabase Storage
    // Nota: O bucket 'contratos' deve ser criado manualmente no Supabase Storage.
    const { data: storageData, error: storageError } = await supabaseClient.storage
      .from('contratos')
      .upload(pdfFileName, new TextEncoder().encode(pdfContentBase64), {
        contentType: 'application/pdf',
        upsert: true, // Permite substituir ao regerar
      })

    if (storageError) {
      throw new Error(storageError.message)
    }
    
    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/contratos/${pdfFileName}`;

    // 10. Registrar/Atualizar na tabela contratos_frete
    const { data: contractRecord, error: recordError } = await supabaseClient
      .from('contratos_frete')
      .upsert({
        carga_id: cargaId,
        user_id: userId,
        pdf_url: publicUrl,
        motorista_nome: cargaData.motorista?.nome,
        parceiro_nome: cargaData.parceiro?.nome,
        crt: cargaData.crt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'carga_id' })
      .select()
      .single()

    if (recordError) {
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