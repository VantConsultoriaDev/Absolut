import { formatCurrency } from '../utils/formatters';
import { format } from 'date-fns';

// Interface para os dados necessários para o PDF (34 campos)
export interface ContratoData {
  // 1-2: Permisso
  permissoRazaoSocial: string;
  permissoCnpj: string;
  // 3: Veículo Placas
  placasVeiculoPrincipal: string;
  placasCarretas: string;
  // 4-5: Veículo Detalhes
  veiculoMarca: string;
  veiculoAno: number | string;
  // 6-12: Proprietário/Parceiro
  parceiroNome: string;
  parceiroDocumento: string;
  parceiroEndereco: string;
  parceiroCep: string;
  parceiroCidade: string;
  parceiroEstado: string;
  parceiroTelefone: string;
  // 13-16: Motorista
  motoristaNome: string;
  motoristaCpf: string;
  motoristaTelefone: string;
  motoristaCnh: string;
  // 17-22, 27-30: Carga Detalhes
  cargaOrigem: string;
  cargaDataColeta: string;
  cargaCrt: string;
  cargaDestino: string;
  cargaDataEntrega: string;
  cargaValor: number;
  cargaObservacoes: string;
  cargaClienteNome: string;
  cargaPeso: number;
  // 23-26: Financeiro
  financeiroAdiantamento: number;
  financeiroDespesasAdicionais: number;
  financeiroDiarias: number;
  financeiroSaldo: number;
  // 31-32: Vinculação
  cargaParceiroNome: string;
  cargaMotoristaNome: string;
  // 33-34: Contrato Metadata
  contratoNumeroSequencial: string;
  contratoDataEmissao: string;
}

export class PDFService {
  
  // Simula a geração do PDF e retorna um blob URL
  static async generateContratoPDF(data: ContratoData): Promise<string> {
    console.log('--- Gerando PDF do Contrato ---');
    console.log('Dados para o PDF:', data);

    // Helper para formatar moeda
    const fc = (value: number) => formatCurrency(value);
    // Helper para formatar data
    const fd = (dateStr: string) => dateStr ? format(new Date(dateStr), 'dd/MM/yyyy') : 'N/A';

    // Simulação de conteúdo do PDF preenchido com os 34 campos
    const content = `
      CONTRATO DE FRETE - CRT: ${data.cargaCrt || 'N/A'}
      NÚMERO SEQUENCIAL (33): ${data.contratoNumeroSequencial}
      DATA DE EMISSÃO (34): ${fd(data.contratoDataEmissao)}
      
      --- DADOS DO PROPRIETÁRIO (PARCEIRO) ---
      1. Razão Social (Permisso): ${data.permissoRazaoSocial}
      2. CNPJ (Permisso): ${data.permissoCnpj}
      6. Nome Parceiro: ${data.parceiroNome}
      7. Documento Parceiro: ${data.parceiroDocumento}
      8. Endereço: ${data.parceiroEndereco}
      9. CEP: ${data.parceiroCep}
      10. Cidade: ${data.parceiroCidade}
      11. Estado: ${data.parceiroEstado}
      12. Contato: ${data.parceiroTelefone}
      
      --- DADOS DO VEÍCULO ---
      3. Placas: ${data.placasVeiculoPrincipal} ${data.placasCarretas ? `+ Carretas: ${data.placasCarretas}` : ''}
      4. Marca: ${data.veiculoMarca}
      5. Ano: ${data.veiculoAno}
      
      --- DADOS DO MOTORISTA ---
      13. Nome Motorista: ${data.motoristaNome}
      14. CPF: ${data.motoristaCpf}
      15. Telefone: ${data.motoristaTelefone}
      16. CNH: ${data.motoristaCnh}
      
      --- DADOS DA CARGA ---
      19/28. CRT: ${data.cargaCrt}
      29. Cliente: ${data.cargaClienteNome}
      30. Peso: ${data.cargaPeso} toneladas
      31. Parceiro Vinculado: ${data.cargaParceiroNome}
      32. Motorista Vinculado: ${data.cargaMotoristaNome}
      27. Observações: ${data.cargaObservacoes}
      
      --- ROTA E DATAS ---
      17. Origem: ${data.cargaOrigem}
      18. Data Coleta: ${fd(data.cargaDataColeta)}
      20. Destino: ${data.cargaDestino}
      21. Data Entrega: ${fd(data.cargaDataEntrega)}
      
      --- VALORES FINANCEIROS ---
      22. Valor Total Carga: ${fc(data.cargaValor)}
      23. Adiantamento: ${fc(data.financeiroAdiantamento)}
      24. Despesas Adicionais: ${fc(data.financeiroDespesasAdicionais)}
      25. Diárias: ${fc(data.financeiroDiarias)}
      26. Saldo a Receber: ${fc(data.financeiroSaldo)}
      
      --- ASSINATURAS ---
      _________________________
      Motorista
      
      _________________________
      Contratante
    `;

    // Simula a criação de um Blob e URL
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    return url;
  }

  static downloadPDF(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log(`PDF ${filename} baixado.`);
  }

  static shareWhatsApp(data: ContratoData) {
    const message = `Contrato de Frete - Carga ${data.cargaCrt || 'N/A'}\n\nValor Frete: ${formatCurrency(data.cargaValor)}\nSaldo a Receber: ${formatCurrency(data.financeiroSaldo)}\n\nDetalhes completos no PDF.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    console.log('Compartilhando via WhatsApp.');
  }

  static shareEmail(data: ContratoData) {
    const subject = `Contrato de Frete - Carga ${data.cargaCrt || 'N/A'}`;
    const body = `Prezado(a) ${data.motoristaNome || 'Motorista'},\n\nSegue em anexo o resumo do contrato de frete para a carga ${data.cargaCrt || 'N/A'} (${data.cargaOrigem} -> ${data.cargaDestino}).\n\nSaldo a Receber: ${formatCurrency(data.financeiroSaldo)}\n\nAtenciosamente,\nABSOLUT.`;
    const mailtoUrl = `mailto:${data.motoristaTelefone || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    console.log('Compartilhando via Email.');
  }
}