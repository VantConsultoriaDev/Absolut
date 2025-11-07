import axios from 'axios';

// O token deve ser lido das variáveis de ambiente
const API_TOKEN = import.meta.env.VITE_APIBRASIL_TOKEN;

// Interface para resposta da API de consulta de placa
export interface PlacaResponse {
  success: boolean;
  data?: PlacaData;
  error?: string;
}

export interface PlacaData {
  placa: string;
  marca: string;
  modelo: string;
  ano: string;
  anoModelo: string;
  cor: string;
  combustivel: string;
  categoria: string;
  chassi?: string;
  renavam?: string;
  municipio?: string;
  uf?: string;
}

export class VehicleService {
  private static readonly API_URL = 'https://gateway.apibrasil.io/api/v2/vehicles/base/000/dados';

  // Consultar dados da placa usando nova API com Bearer token
  static async consultarPlaca(placa: string): Promise<PlacaData | null> {
    try {
      // Remove formatação da placa
      const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
      
      if (!this.validarPlaca(placaLimpa)) {
        throw new Error('Placa inválida');
      }

      if (!API_TOKEN) {
        console.error('VehicleService: VITE_APIBRASIL_TOKEN não configurado.');
        throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) não está configurado. Verifique o arquivo .env.local.');
      }

      const response = await axios.post(
        this.API_URL,
        {
          // A API pode esperar letras maiúsculas; enviamos upper somente na requisição
          placa: placaLimpa.toUpperCase(),
          homolog: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
          },
          timeout: 120000, // 120 segundos
        }
      );
      
      const result = response.data;
      
      // Verifica se a resposta contém dados válidos
      if (!result || result.error || !result.data) {
        
        // Se for erro de autorização, lança um erro específico para ser capturado
        if (response.status === 401 || response.status === 403) {
             throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) é inválido ou expirou. Verifique a configuração.');
        }
        
        // Se for erro de payload, retorna null
        return null;
      }

      const data = result.data;
      
      if (data) {
        return {
          placa: data.placa || placaLimpa,
          marca: data.marca || '',
          modelo: data.modelo || '',
          ano: data.ano_fabricacao?.toString() || data.ano?.toString() || '',
          anoModelo: data.ano_modelo?.toString() || data.anoModelo?.toString() || '',
          cor: data.cor || '',
          combustivel: data.combustivel || '',
          categoria: data.categoria || data.especie || '',
          chassi: data.chassi || '', // Incluindo o chassi
          renavam: data.renavam || '',
          municipio: data.municipio || '',
          uf: data.uf || ''
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao consultar placa:', error);
      
      // Se o erro for do Axios e tiver uma resposta de status 401/403, lança o erro de autorização
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          throw new Error('ERRO DE AUTORIZAÇÃO: O token da API (VITE_APIBRASIL_TOKEN) é inválido ou expirou. Verifique a configuração.');
      }
      
      // Em caso de qualquer outro erro (rede, timeout, etc.), lança o erro para ser tratado pelo chamador
      throw new Error('Falha ao consultar placa. Verifique a conexão ou o token da API.');
    }
  }

  // Formatar placa no padrão brasileiro
  static formatarPlaca(placa: string): string {
    // Remove caracteres não alfanuméricos
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
    
    if (placaLimpa.length <= 3) {
      return placaLimpa;
    }
    
    // Formato antigo: ABC-1234
    if (placaLimpa.length <= 7 && /^[A-Z]{3}[0-9]{4}$/i.test(placaLimpa)) {
      return placaLimpa.replace(/^([A-Z]{3})([0-9]{4})$/i, '$1-$2');
    }
    
    // Formato Mercosul: ABC1D23
    if (placaLimpa.length <= 7 && /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/i.test(placaLimpa)) {
      return placaLimpa.replace(/^([A-Z]{3})([0-9][A-Z][0-9]{2})$/i, '$1$2');
    }
    
    return placaLimpa;
  }

  // Validar formato da placa
  static validarPlaca(placa: string): boolean {
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
    
    // Formato antigo: ABC1234
    const formatoAntigo = /^[A-Z]{3}[0-9]{4}$/i;
    
    // Formato Mercosul: ABC1D23
    const formatoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/i;
    
    return placaLimpa.length === 7 && (formatoAntigo.test(placaLimpa) || formatoMercosul.test(placaLimpa));
  }

  // Detectar tipo de placa
  static detectarTipoPlaca(placa: string): 'antiga' | 'mercosul' | 'invalida' {
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '');
    
    if (/^[A-Z]{3}[0-9]{4}$/i.test(placaLimpa)) {
      return 'antiga';
    }
    
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/i.test(placaLimpa)) {
      return 'mercosul';
    }
    
    return 'invalida';
  }

  // Gerar sugestões de marca baseado no input
  static gerarSugestoesMarca(input: string): string[] {
    const marcas = [
      'VOLKSWAGEN', 'FORD', 'CHEVROLET', 'FIAT', 'TOYOTA', 'HONDA', 'HYUNDAI',
      'NISSAN', 'RENAULT', 'PEUGEOT', 'CITROËN', 'MERCEDES-BENZ', 'BMW',
      'AUDI', 'VOLVO', 'SCANIA', 'MAN', 'IVECO', 'DAF', 'AGRALE'
    ];
    
    if (!input) return marcas.slice(0, 10);
    
    const inputLower = input.toLowerCase();
    return marcas.filter(marca => 
      marca.toLowerCase().includes(inputLower)
    ).slice(0, 10);
  }
}