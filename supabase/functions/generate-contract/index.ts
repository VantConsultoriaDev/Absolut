import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// Biblioteca para manipular PDFs (Deno/ESM)
import { PDFDocument, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'
  
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função auxiliar: cria um PDF fallback com texto dos dados
async function createFallbackPdf(data: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  const fontSize = 10;
  const margin = 40;
  page.setFont(font);
  page.setFontSize(fontSize);
  let cursorY = height - margin;
  const lines = [
    `CONTRATO DE FRETE (CRT: ${data.cargaCrt || 'N/A'})`,
    `NÚMERO SEQUENCIAL (33): ${data.contratoNumeroSequencial}`,
    `DATA DE EMISSÃO (34): ${data.contratoDataEmissao}`,
    ``,
    `--- DADOS DO PROPRIETÁRIO (PARCEIRO) ---`,
    `1. Razão Social (Permisso): ${data.permissoRazaoSocial}`,
    `2. CNPJ (Permisso): ${data.permissoCnpj}`,
    `6. Nome Parceiro: ${data.parceiroNome}`,
    `7. Documento Parceiro: ${data.parceiroDocumento}`,
    `12. Contato: ${data.parceiroTelefone}`,
    ``,
    `--- DADOS DO VEÍCULO ---`,
    `3. Placas: ${data.placasVeiculoPrincipal}${data.placasCarretas ? `, Carretas: ${data.placasCarretas}` : ''}`,
    `4. Marca: ${data.veiculoMarca}`,
    `5. Ano: ${data.veiculoAno}`,
    ``,
    `--- DADOS DO MOTORISTA ---`,
    `13. Nome: ${data.motoristaNome}`,
    `14. CPF: ${data.motoristaCpf}`,
    `16. CNH: ${data.motoristaCnh}`,
    ``,
    `--- DADOS DA CARGA ---`,
    `17. Origem: ${data.cargaOrigem}`,
    `20. Destino: ${data.cargaDestino}`,
    `22. Valor Total: ${data.cargaValor}`,
    `29. Cliente: ${data.cargaClienteNome}`,
    `30. Peso: ${data.cargaPeso}`,
    ``,
    `--- VALORES FINANCEIROS ---`,
    `23. Adiantamento: ${data.financeiroAdiantamento}`,
    `26. Saldo a Receber: ${data.financeiroSaldo}`,
  ];
  for (const line of lines) {
    page.drawText(line, { x: margin, y: cursorY });
    cursorY -= fontSize + 6;
  }
  return await pdfDoc.save();
}

// Função auxiliar: baixa template e mapeamento do Storage
async function getTemplateAndMap(supabaseClient: any): Promise<{ templateBytes: Uint8Array | null, fieldMap: Record<string, string> | null }> {
  // Bucket e caminhos padrão (você pode tornar isso configurável por env)
  const bucket = 'contratos_modelos';
  const templatePath = 'modelo_contrato.pdf';
  const mapPath = 'modelo_contrato.json';

  // Tenta baixar o PDF template
  const tplRes = await supabaseClient.storage.from(bucket).download(templatePath);
  let templateBytes: Uint8Array | null = null;
  if (tplRes?.data) {
    const ab = await tplRes.data.arrayBuffer();
    templateBytes = new Uint8Array(ab);
  }

  // Tenta baixar JSON de mapeamento de campos
  const mapRes = await supabaseClient.storage.from(bucket).download(mapPath);
  let fieldMap: Record<string, string> | null = null;
  if (mapRes?.data) {
    try {
      const text = new TextDecoder().decode(new Uint8Array(await mapRes.data.arrayBuffer()));
      fieldMap = JSON.parse(text);
    } catch (_) {
      fieldMap = null;
    }
  }

  return { templateBytes, fieldMap };
}

// Preenche o template PDF usando pdf-lib e mapeamento de campos
async function fillContratoTemplate(templateBytes: Uint8Array, data: Record<string, any>, fieldMap?: Record<string, string> | null): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // Se não houver mapeamento, tenta nome idêntico (campo PDF == chave data)
  const entries = fieldMap ? Object.entries(fieldMap) : Object.keys(data).map((k) => [k, k]);

  for (const [pdfFieldName, dataKey] of entries) {
    const value = data[dataKey];
    const text = value == null ? '' : String(value);
    try {
      // Tenta como campo de texto
      const tf = form.getTextField(pdfFieldName);
      tf.setText(text);
      continue;
    } catch (_) {}
    try {
      // Tenta como checkbox (marca quando valor "truthy")
      const cb = form.getCheckBox(pdfFieldName);
      if (value) cb.check(); else cb.uncheck();
      continue;
    } catch (_) {}
    try {
      // Tenta como radio group (seleciona valor)
      const rg = form.getRadioGroup(pdfFieldName);
      if (text) rg.select(text);
      continue;
    } catch (_) {}
    // Silenciosamente ignora se campo não existir; evita quebra
  }

  form.updateFieldAppearances();
  return await pdfDoc.save();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  // Valida segredos obrigatórios
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    const msg = 'Edge Function misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.'
    console.error('[GENERATE_CONTRACT] ' + msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Cria o cliente Supabase usando a Service Role Key para ignorar RLS
  const supabaseClient = createClient(
    supabaseUrl,
    serviceRoleKey, 
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

    // 9. Tentar preencher o PDF modelo do Storage; caso não exista, gerar fallback
    const { templateBytes, fieldMap } = await getTemplateAndMap(supabaseClient);
    let finalPdfBytes: Uint8Array;
    try {
      if (templateBytes) {
        finalPdfBytes = await fillContratoTemplate(templateBytes, contractData, fieldMap);
      } else {
        finalPdfBytes = await createFallbackPdf(contractData);
      }
    } catch (e) {
      console.warn('[GENERATE_CONTRACT] Falha ao preencher template, usando fallback:', e?.message || e);
      finalPdfBytes = await createFallbackPdf(contractData);
    }

    const pdfFileName = `contrato_${carga.crt || cargaId}.pdf`;

    // 10. Garantir que o bucket 'contratos' exista e seja público
    try {
      const { data: bucketInfo, error: getBucketError } = await supabaseClient.storage.getBucket('contratos')
      if (getBucketError || !bucketInfo) {
        const { error: createBucketError } = await supabaseClient.storage.createBucket('contratos', { public: true })
        if (createBucketError) {
          console.warn('[GENERATE_CONTRACT] Falha ao criar bucket contratos:', createBucketError.message)
        } else {
          console.log('[GENERATE_CONTRACT] Bucket contratos criado com sucesso')
        }
      }
    } catch (e) {
      console.warn('[GENERATE_CONTRACT] Erro ao garantir bucket contratos:', (e as any)?.message || e)
    }

    // 11. Salvar no Supabase Storage (como Blob)
    const pdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' })
    const { error: storageError } = await supabaseClient.storage
      .from('contratos')
      .upload(pdfFileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true, // Permite substituir ao regerar
      })

    if (storageError) {
      console.error('[GENERATE_CONTRACT] Erro ao salvar no Storage:', storageError.message);
      throw new Error(storageError.message)
    }
    
    // 11.1 Verificar arquivo após upload
    try {
      const verify = await supabaseClient.storage.from('contratos').download(pdfFileName)
      if (!verify?.data) {
        throw new Error('Arquivo não disponível após upload.')
      }
      const buf = new Uint8Array(await verify.data.arrayBuffer())
      const header = new TextDecoder().decode(buf.slice(0, 5))
      console.log('[GENERATE_CONTRACT] PDF salvo. Tamanho(bytes):', buf.length, 'Header:', header)
      if (!header.startsWith('%PDF')) {
        console.warn('[GENERATE_CONTRACT] Header inesperado; o arquivo pode estar corrompido.')
      }
    } catch (e) {
      console.warn('[GENERATE_CONTRACT] Falha ao verificar PDF após upload:', (e as any)?.message || e)
    }
    
    // 12. Obter URL pública via SDK (evita construir manualmente)
    const { data: publicUrlData } = supabaseClient.storage
      .from('contratos')
      .getPublicUrl(pdfFileName)
    const publicUrl = publicUrlData.publicUrl

    // 13. Registrar/Atualizar na tabela contratos_frete
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
    const msg = (error as any)?.message || String(error)
    console.error('[GENERATE_CONTRACT] Edge Function Error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})