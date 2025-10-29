import { formatCurrency } from '../utils/formatters';

// Interface para os dados necessários para o PDF
export interface ContratoData {
  carga: any;
  motorista: any;
  veiculo: any;
  proprietario: any;
  valoresFrete: {
    VF: string;
    AD: string;
    PD: string;
    OE1: string;
    D1: string;
    OU: string;
    SL: number;
  };
  placasCarretas: string;
}

export class PDFService {
  
  // Simula a geração do PDF e retorna um blob URL
  static async generateContratoPDF(data: ContratoData): Promise<string> {
    console.log('--- Gerando PDF do Contrato ---');
    console.log('Dados para o PDF:', data);

    // Simulação de conteúdo do PDF
    const content = `
      CONTRATO DE FRETE - CRT: ${data.carga.crt || data.carga.id}
      
      REMETENTE: BASTOS & BASTOS TRANSPORTES LTDA
      DESTINATÁRIO: ${data.carga.destino}
      
      --- DADOS DA CARGA ---
      Origem: ${data.carga.origem}
      Destino: ${data.carga.destino}
      Valor: ${formatCurrency(data.carga.valor)}
      
      --- MOTORISTA ---
      Nome: ${data.motorista?.nome || 'N/A'}
      CPF: ${data.motorista?.cpf || 'N/A'}
      CNH: ${data.motorista?.cnh || 'N/A'}
      
      --- VEÍCULO ---
      Placa Cavalo/Truck: ${data.veiculo?.placa_cavalo || data.veiculo?.placa || 'N/A'}
      Placas Carretas: ${data.placasCarretas}
      Proprietário: ${data.proprietario?.nome || 'N/A'}
      
      --- VALORES DO FRETE ---
      Valor Frete (VF): ${data.valoresFrete.VF}
      Adiantamento (AD): ${data.valoresFrete.AD}
      Pedágio (PD): ${data.valoresFrete.PD}
      Outras Despesas (OE1): ${data.valoresFrete.OE1}
      Diárias (D1): ${data.valoresFrete.D1}
      Outros Descontos (OU): ${data.valoresFrete.OU}
      
      SALDO A RECEBER (SL): ${formatCurrency(data.valoresFrete.SL)}
      
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
    const message = `Contrato de Frete - Carga ${data.carga.crt || data.carga.id}\n\nValor Frete: ${data.valoresFrete.VF}\nSaldo a Receber: ${formatCurrency(data.valoresFrete.SL)}\n\nDetalhes completos no PDF.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    console.log('Compartilhando via WhatsApp.');
  }

  static shareEmail(data: ContratoData) {
    const subject = `Contrato de Frete - Carga ${data.carga.crt || data.carga.id}`;
    const body = `Prezado(a) ${data.motorista?.nome || 'Motorista'},\n\nSegue em anexo o resumo do contrato de frete para a carga ${data.carga.crt || data.carga.id} (${data.carga.origem} -> ${data.carga.destino}).\n\nSaldo a Receber: ${formatCurrency(data.valoresFrete.SL)}\n\nAtenciosamente,\nABSOLUT.`;
    const mailtoUrl = `mailto:${data.motorista?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    console.log('Compartilhando via Email.');
  }
}