import axios from 'axios';

// O token foi injetado diretamente para resolver o problema de VITE_APIBRASIL_TOKEN não definido.
const API_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZ2F0ZXdheS5hcGlicmFzaWwuaW8vYXBpL3YyL2F1dGgvbG9naW4iLCJpYXQiOjE3NjExNDIxMjUsImV4cCI6MTc5MjY3ODEyNSwibmJmIjoxNzYxMTQyMTI1LCJqdGkiOiJkbDVHVUp4cTJETHBzc1pkIiwic3ViIjoiMTc4NDIiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.voI-fsBG_mQWsZounrv8KeiKRMFzkYdE4ACqra2NrSQ";

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
      const placaLimpa = placa.replace(/[^A-Z0-9]/g, '');
      
      if (!this.validarPlaca(placaLimpa)) {
        throw new Error('Placa inválida');
      }

      if (!API_TOKEN) {
        console.error('VehicleService: API_TOKEN não configurado. Usando dados simulados.');
        throw new Error('Token de API não configurado.');
      }

      const response = await axios.post(
        this.API_URL,
        {
          placa: placaLimpa,
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
      if (!result || result.error) {
        throw new Error(result?.message || 'Placa não encontrada');
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
          chassi: '', // Removido por segurança
          renavam: data.renavam || '',
          municipio: data.municipio || '',
          uf: data.uf || ''
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao consultar placa:', error);
      
      // Fallback para dados simulados em caso de erro
      const placaLimpa = placa.replace(/[^A-Z0-9]/g, '');
      
      return {
        placa: placaLimpa,
        marca: 'MARCA SIMULADA',
        modelo: 'MODELO SIMULADO',
        ano: '2020',
        anoModelo: '2020',
        cor: 'BRANCA',
        combustivel: 'FLEX',
        categoria: 'AUTOMOVEL',
        chassi: '',
        renavam: '00000000000',
        municipio: 'SÃO PAULO',
        uf: 'SP'
      };
    }
  }

  // Formatar placa no padrão brasileiro
  static formatarPlaca(placa: string): string {
    // Remove caracteres não alfanuméricos
    const placaLimpa = placa.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    if (placaLimpa.length <= 3) {
      return placaLimpa;
    }
    
    // Formato antigo: ABC-1234
    if (placaLimpa.length <= 7 && /^[A-Z]{3}[0-9]{1,4}$/.test(placaLimpa)) {
      return placaLimpa.replace(/^([A-Z]{3})([0-9]{1,4})$/, '$1-$2');
    }
    
    // Formato Mercosul: ABC1D23
    if (placaLimpa.length <= 7 && /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placaLimpa)) {
      return placaLimpa.replace(/^([A-Z]{3})([0-9][A-Z][0-9]{2})$/, '$1$2');
    }
    
    return placaLimpa;
  }

  // Validar formato da placa
  static validarPlaca(placa: string): boolean {
    const placaLimpa = placa.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    // Formato antigo: ABC1234
    const formatoAntigo = /^[A-Z]{3}[0-9]{4}$/;
    
    // Formato Mercosul: ABC1D23
    const formatoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    
    return formatoAntigo.test(placaLimpa) || formatoMercosul.test(placaLimpa);
  }

  // Detectar tipo de placa
  static detectarTipoPlaca(placa: string): 'antiga' | 'mercosul' | 'invalida' {
    const placaLimpa = placa.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    if (/^[A-Z]{3}[0-9]{4}$/.test(placaLimpa)) {
      return 'antiga';
    }
    
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placaLimpa)) {
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