import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';

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

      if (file.name.endsWith('.csv')) {
        data = await this.parseCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        data = await this.parseExcel(file);
      } else {
        result.errors.push('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls)');
        return result;
      }

      if (data.length < 2) {
        result.errors.push('Arquivo deve conter pelo menos uma linha de cabeçalho e uma linha de dados');
        return result;
      }

      const headers = data[0].map(h => String(h).trim().toLowerCase());
      const rows = data.slice(1);
      result.totalRows = rows.length;

      // Mapear colunas
      const columnMap = this.mapColumns(headers);
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 porque começamos da linha 2 (após cabeçalho)

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

  private static async parseCSV(file: File): Promise<any[][]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      // Melhor parsing de CSV que lida com vírgulas dentro de aspas
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    });
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
      valor: ['valor', 'price', 'preco', 'preço', 'amount'],
      peso: ['peso', 'weight', 'kg'],
      observacoes: ['observacoes', 'observações', 'obs', 'notes', 'comentarios', 'comentários']
    };

    for (const [field, variations] of Object.entries(mappings)) {
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (variations.some(variation => header.includes(variation))) {
          map[field] = i;
          break;
        }
      }
    }

    return map;
  }

  private static parseRow(row: any[], columnMap: Record<string, number>): any {
    const getValue = (field: string): string => {
      const index = columnMap[field];
      return index !== undefined ? String(row[index] || '').trim() : '';
    };

    return {
      crt: getValue('crt'),
      origem: getValue('origem'),
      destino: getValue('destino'),
      dataColeta: this.parseDate(getValue('dataColeta')) || format(new Date(), 'yyyy-MM-dd'),
      dataEntrega: this.parseDate(getValue('dataEntrega')) || format(new Date(), 'yyyy-MM-dd'),
      valor: this.parseNumber(getValue('valor')),
      peso: this.parseNumber(getValue('peso')),
      observacoes: getValue('observacoes'),
      status: 'a_coletar' as const
    };
  }

  private static parseDate(dateStr: string): string | null {
    if (!dateStr) return null;

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
    
    // Remover caracteres não numéricos exceto vírgula e ponto
    const cleaned = numStr.replace(/[^\d.,]/g, '');
    
    // Se tem vírgula e ponto, assumir que vírgula é separador de milhares
    if (cleaned.includes(',') && cleaned.includes('.')) {
      const withoutComma = cleaned.replace(/,/g, '');
      return parseFloat(withoutComma) || 0;
    }
    
    // Se só tem vírgula, assumir que é separador decimal (formato brasileiro)
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      const withDot = cleaned.replace(',', '.');
      return parseFloat(withDot) || 0;
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