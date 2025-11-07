import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';
import { extrairUfECidade } from '../utils/cargasConstants'; // Importando a função
import { Carga } from '../types'; // Importando o tipo Carga para tipagem

export interface ImportResult {
  success: boolean;
  data?: any[];
  errors: string[];
  successCount: number;
  errorCount: number;
  totalRows: number;
}

export interface ImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export class ImportService {
  private static readonly REQUIRED_FIELDS = ['origem', 'destino'];
  private static readonly DATE_FORMATS = [
    'yyyy-MM-dd',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'dd-MM-yyyy',
    'MM-dd-yyyy',
    'yyyy/MM/dd'
  ];
  
  // Mapeamento de texto de status para a chave interna
  private static readonly STATUS_MAP: Record<string, Carga['status']> = {
    'a coletar': 'a_coletar',
    'a_coletar': 'a_coletar',
    'coletar': 'a_coletar',
    'pendente': 'a_coletar',
    
    'em transito': 'em_transito',
    'em_transito': 'em_transito',
    'transito': 'em_transito',
    'transporte': 'em_transito',
    
    'armazenada': 'armazenada',
    'armazenado': 'armazenada',
    'storage': 'armazenada',
    
    'entregue': 'entregue',
    'finalizado': 'entregue',
    'delivered': 'entregue',
    
    'cancelada': 'cancelada',
    'cancelado': 'cancelada', // CORREÇÃO: Alterado de 'cancelado' para 'cancelada'
    'canceled': 'cancelada',
  };

  static async processFile(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      data: [],
      errors: [],
      successCount: 0,
      errorCount: 0,
      totalRows: 0
    };

    try {
      let data: any[][] = [];

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        data = await this.parseCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        data = await this.parseExcel(file);
      } else {
        result.errors.push('Formato de arquivo não suportado. Use CSV, TXT ou Excel (.xlsx, .xls)');
        return result;
      }

      if (data.length < 2 || data[0].length === 0) {
        result.errors.push('Arquivo deve conter pelo menos uma linha de cabeçalho e uma linha de dados');
        return result;
      }

      // CORREÇÃO: Garante que os cabeçalhos sejam limpos e minúsculos
      const headers = data[0].map(h => String(h).trim().toLowerCase());
      const rows = data.slice(1);
      result.totalRows = rows.length;

      // Mapear colunas
      const columnMap = this.mapColumns(headers);
      console.log('[ImportService] Headers detectados:', headers);
      console.log('[ImportService] Mapeamento de Colunas:', columnMap);
      
      // Verificar se campos obrigatórios foram mapeados
      const missingRequired = this.REQUIRED_FIELDS.filter(field => columnMap[field] === undefined);
      if (missingRequired.length > 0) {
          result.errors.push(`Campos obrigatórios não encontrados no cabeçalho: ${missingRequired.join(', ')}`);
          result.errorCount = rows.length; // Marca todas as linhas como erro se o cabeçalho estiver errado
          return result;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 porque começamos da linha 2 (após cabeçalho)
        
        // Ignora linhas vazias (onde todos os campos são strings vazias)
        if (row.every(cell => String(cell).trim() === '')) {
            result.totalRows--;
            continue;
        }

        try {
          const cargaData = this.parseRow(row, columnMap);
          const validation = this.validateRow(cargaData, rowNumber);

          if (validation.isValid) {
            result.data!.push(cargaData);
            result.successCount++;
          } else {
            result.errors.push(...validation.errors);
            result.errorCount++;
          }
        } catch (error) {
          // Captura o erro de referência e o lança com a linha correta
          result.errors.push(`Linha ${rowNumber}: Erro ao processar dados - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          result.errorCount++;
        }
      }

      result.success = result.successCount > 0;
      return result;

    } catch (error) {
      result.errors.push(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return result;
    }
  }

  // REMOVIDO: detectSeparator
  
  private static async parseCSV(file: File): Promise<any[][]> {
    const arrayBuffer = await file.arrayBuffer();
    
    // Tenta ler como binário, usando codepage 1252 (Latin-1) para melhor compatibilidade com CSVs brasileiros
    const workbook = XLSX.read(arrayBuffer, { 
        type: 'array', 
        codepage: 1252, 
        raw: true, // Mantém valores brutos (útil para datas e números)
        cellDates: false // Não tenta converter datas automaticamente
    });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Converte para array de arrays, usando defval para garantir que células vazias sejam strings vazias
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: '',
        raw: false, // Permite que o XLSX lide com a formatação básica de números/datas
    });
    
    return jsonData as any[][];
  }

  private static async parseExcel(file: File): Promise<any[][]> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Converter para array de arrays
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    return jsonData as any[][];
  }

  private static mapColumns(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    
    // Mapeamento flexível de colunas
    const mappings = {
      crt: ['crt', 'codigo', 'número', 'numero', 'id'],
      origem: ['origem', 'origin', 'de', 'from'],
      destino: ['destino', 'destination', 'para', 'to'],
      dataColeta: ['datacoleta', 'data_coleta', 'coleta', 'pickup', 'data coleta'],
      dataEntrega: ['dataentrega', 'data_entrega', 'entrega', 'delivery', 'data entrega'],
      valor: ['valor', 'price', 'preco', 'preço', 'amount', 'vlr'],
      peso: ['peso', 'weight', 'kg', 'toneladas'],
      observacoes: ['observacoes', 'observações', 'obs', 'notes', 'comentarios', 'comentários'],
      // NOVO: Mapeamento de Status
      status: ['status', 'situacao', 'situação'],
    };

    for (const [field, variations] of Object.entries(mappings)) {
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        // CORREÇÃO: Verifica se o cabeçalho é IGUAL a uma variação, ou se INCLUI a variação
        if (variations.some(variation => header === variation || header.includes(variation))) {
          // Prioriza o primeiro match
          if (map[field] === undefined) {
             map[field] = i;
          }
          // Não usamos break aqui para permitir que o log mostre todos os matches, mas o map[field] só é definido uma vez.
        }
      }
    }

    return map;
  }
  
  private static normalizeStatus(statusStr: string): Carga['status'] {
    if (!statusStr) return 'a_coletar'; // Padrão se vazio
    
    const cleanStr = statusStr.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    
    // Tenta encontrar o status normalizado no mapa
    for (const key in this.STATUS_MAP) {
        if (cleanStr.includes(key)) {
            return this.STATUS_MAP[key];
        }
    }
    
    // Tenta encontrar o status normalizado no mapa (comparação exata)
    if (this.STATUS_MAP[cleanStr]) {
        return this.STATUS_MAP[cleanStr];
    }
    
    return 'a_coletar'; // Padrão se não for reconhecido
  }

  private static parseRow(row: any[], columnMap: Record<string, number>): any {
    const getValue = (field: string): string => {
      const index = columnMap[field];
      return index !== undefined ? String(row[index] || '').trim() : '';
    };

    const valorStr = getValue('valor');
    const pesoStr = getValue('peso');
    const statusStr = getValue('status');
    
    // Extrai UF e Cidade/Local dos valores brutos
    const origemBruta = getValue('origem');
    const destinoBruta = getValue('destino'); // CORREÇÃO: Variável definida aqui
    
    const origemInfo = extrairUfECidade(origemBruta);
    const destinoInfo = extrairUfECidade(destinoBruta);
    
    // LOG para verificar o que está sendo extraído
    console.log(`[ImportService] Origem Bruta: ${origemBruta} -> UF: ${origemInfo.uf}, Cidade: ${origemInfo.cidade}`);

    return {
      crt: getValue('crt'),
      // A origem e destino da CARGA (consolidada) são os valores brutos
      origem: origemBruta,
      destino: destinoBruta,
      dataColeta: this.parseDate(getValue('dataColeta')) || format(new Date(), 'yyyy-MM-dd'),
      dataEntrega: this.parseDate(getValue('dataEntrega')) || format(new Date(), 'yyyy-MM-dd'),
      valor: this.parseNumber(valorStr),
      peso: this.parseNumber(pesoStr),
      observacoes: getValue('observacoes'),
      // NOVO: Normaliza o status
      status: this.normalizeStatus(statusStr),
      // Adiciona dados de trajeto único por padrão
      transbordo: 'sem_transbordo' as const,
      trajetos: [{
          index: 1,
          ufOrigem: origemInfo.uf,
          cidadeOrigem: origemInfo.cidade,
          ufDestino: destinoInfo.uf,
          cidadeDestino: destinoInfo.cidade,
          valor: this.parseNumber(valorStr),
          dataColeta: this.parseDate(getValue('dataColeta')) || format(new Date(), 'yyyy-MM-dd'),
          dataEntrega: this.parseDate(getValue('dataEntrega')) || format(new Date(), 'yyyy-MM-dd'),
      }]
    };
  }

  private static parseDate(dateStr: string): string | null {
    if (!dateStr) return null;

    // Tenta parsear como número de dias do Excel (se for um número inteiro grande)
    const numValue = parseFloat(dateStr);
    if (!isNaN(numValue) && numValue > 10000 && numValue < 60000) {
        try {
            // Converte número de dias do Excel para data (base 1900)
            const date = XLSX.SSF.parse_date_code(numValue);
            const jsDate = new Date(date.y, date.m - 1, date.d);
            if (isValid(jsDate)) {
                return format(jsDate, 'yyyy-MM-dd');
            }
        } catch {
            // Ignora erro de parsing do Excel
        }
    }

    // Tentar diferentes formatos de data
    for (const formatStr of this.DATE_FORMATS) {
      try {
        const parsed = parse(dateStr, formatStr, new Date());
        if (isValid(parsed)) {
          return format(parsed, 'yyyy-MM-dd');
        }
      } catch {
        continue;
      }
    }

    // Tentar parsing automático
    try {
      const parsed = new Date(dateStr);
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch {
      // Ignorar erro
    }

    return null;
  }

  private static parseNumber(numStr: string): number {
    if (!numStr) return 0;
    
    // 1. Remove R$, espaços e outros símbolos
    let cleaned = numStr.replace(/[^0-9.,]/g, '');
    
    // 2. Detecta separador decimal:
    // Se tiver vírgula E ponto, assume que o ponto é separador de milhares (formato americano)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, ''); // Remove pontos de milhar
      cleaned = cleaned.replace(/,/g, '.'); // Troca vírgula por ponto decimal
    } 
    // Se tiver apenas vírgula, assume que é separador decimal (formato brasileiro)
    else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/,/g, '.');
    }
    
    return parseFloat(cleaned) || 0;
  }

  private static validateRow(data: any, rowNumber: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar campos obrigatórios
    for (const field of this.REQUIRED_FIELDS) {
      if (!data[field] || data[field].trim() === '') {
        errors.push(`Linha ${rowNumber}: Campo '${field}' é obrigatório`);
      }
    }

    // Validar valores numéricos
    if (data.valor < 0) {
      errors.push(`Linha ${rowNumber}: Valor deve ser maior ou igual a zero`);
    }

    if (data.peso < 0) {
      errors.push(`Linha ${rowNumber}: Peso deve ser maior ou igual a zero`);
    }

    // Validar datas
    if (data.dataColeta && data.dataEntrega) {
      const coleta = new Date(data.dataColeta);
      const entrega = new Date(data.dataEntrega);
      
      if (entrega < coleta) {
        errors.push(`Linha ${rowNumber}: Data de entrega não pode ser anterior à data de coleta`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}