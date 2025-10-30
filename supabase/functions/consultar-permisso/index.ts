import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// Importando Cheerio para simular raspagem de HTML (necessário para sites sem API)
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// URL do site da ANTT para consulta de placa
const ANTT_URL = 'https://scff.antt.gov.br/conPlaca.asp';

// Função de raspagem simulada (Mock)
function mockPermissoData(placa: string) {
    const placaLimpa = placa.replace(/[^A-Z0-9]/g, '');
    return {
        razaoSocial: `Transportadora Mock ${placaLimpa.slice(-3)} Ltda`,
        cnpj: `00.000.000/0001-${placaLimpa.slice(-2)}`,
        enderecoCompleto: `Rua Mock, 100 - Centro - São Paulo - Brasil`,
        simulado: true
    };
}

// Função para simular a consulta real (usando mock por segurança e complexidade de raspagem)
async function fetchPermissoData(placa: string) {
    // Em uma implementação real, você faria uma requisição POST/GET para a ANTT
    // e usaria o Cheerio para extrair os dados da tabela HTML resultante.
    
    // Exemplo de como seria a requisição (MUITO simplificada):
    /*
    const response = await fetch(ANTT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `placa=${placa}`
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Lógica de raspagem aqui...
    // const razaoSocial = $('td:contains("Razão Social")').next('td').text().trim();
    // ...
    */
    
    // Retornando dados mockados para garantir a funcionalidade do app
    return mockPermissoData(placa);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const { placa } = await req.json()
    
    if (!placa) {
      return new Response(JSON.stringify({ error: 'Placa é obrigatória' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Consultar dados do permisso (usando mock/simulação)
    const permissoData = await fetchPermissoData(placa);

    return new Response(JSON.stringify({ 
      success: true, 
      data: permissoData
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