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
    CRT: ${data.carga.crt || 'N/A'}
    Origem: ${data.carga.origem}
    Destino: ${data.carga.destino}
    Motorista: ${data.motorista?.nome || 'N/A'}
    Valor Frete: ${data.valores.VF}
    Adiantamento: ${data.valores.AD}
    Saldo: ${data.valores.VS}
    Diárias: ${data.valores.D1}
    Despesas Adicionais: ${data.valores.OE1}
    
    [SIMULAÇÃO DE CONTEÚDO PDF PREENCHIDO]
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

    // 1. Buscar dados da Carga e Movimentações (usando Service Role Key para ignorar RLS)
    const { data: cargaData, error: cargaError } = await supabaseClient
      .from('cargas')
      .select(`
        id, crt, origem, destino, valor, data_coleta, data_entrega,
        motorista:motoristas(nome, cpf, cnh),
        parceiro:parceiros(nome),
        veiculo:veiculos(placa, placa_cavalo, placa_carreta, tipo, carroceria)
      `)
      .eq('id', cargaId)
      .single()

    if (cargaError || !cargaData) {
      throw new Error(cargaError?.message || 'Carga não encontrada.')
    }
    
    const { data: movData, error: movError } = await supabaseClient
      .from('movimentacoes_financeiras')
      .select('tipo, categoria, valor, descricao')
      .eq('carga_id', cargaId)

    if (movError) {
      throw new Error(movError.message)
    }

    // 2. Classificar valores financeiros (VF, AD, VS, D1, OE1)
    let VF = 0, AD = 0, VS = 0, D1 = 0, OE1 = 0;
    let hasAdiantamento = false;
    
    movData.forEach(m => {
        const valor = m.valor || 0;
        if (m.descricao.startsWith('Adto')) {
            AD += valor;
            hasAdiantamento = true;
        } else if (m.descricao.startsWith('Saldo')) {
            VS += valor;
            hasAdiantamento = true;
        } else if (m.categoria?.toUpperCase() === 'FRETE' && !hasAdiantamento) {
            VF += valor;
        } else if (m.categoria?.toUpperCase() === 'DIARIA') {
            D1 += valor;
        } else if (m.categoria?.toUpperCase() === 'OUTRAS DESPESAS') {
            OE1 += valor;
        }
    });
    
    // Se houve split (AD/VS), o VF é a soma deles. Se não, VF é o valor total.
    if (hasAdiantamento) {
        VF = AD + VS;
    } else if (VF === 0) {
        VF = cargaData.valor || 0; // Fallback para valor da carga se não houver mov. de frete
    }

    const contractData = {
        carga: cargaData,
        motorista: cargaData.motorista,
        parceiro: cargaData.parceiro,
        veiculo: cargaData.veiculo,
        valores: {
            VF: VF.toFixed(2),
            AD: AD.toFixed(2),
            VS: VS.toFixed(2),
            D1: D1.toFixed(2),
            OE1: OE1.toFixed(2),
            hasAdiantamento
        }
    };

    // 3. Simular preenchimento do PDF (retorna Base64 do conteúdo)
    const pdfContentBase64 = simulatePdfFilling(contractData);
    const pdfFileName = `contrato_${cargaData.crt || cargaId}.pdf`;
    
    // 4. Salvar no Supabase Storage
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

    // 5. Registrar/Atualizar na tabela contratos_frete
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