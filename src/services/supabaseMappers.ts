import { Cliente, Parceiro, Motorista, Veiculo, MovimentacaoFinanceira, Carga, ContratoFrete, PermissoInternacional } from '../types';

// Função auxiliar para remover chaves com valor undefined ou null, E converter strings vazias em null
const cleanObject = (obj: any) => {
  const newObj: any = {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      // Se o valor for uma string vazia, trate como null para evitar erros de sintaxe UUID
      if (typeof value === 'string' && value.trim() === '') {
        newObj[key] = null;
      } else {
        newObj[key] = value;
      }
    }
  }
  return newObj;
};

// Mapeia o objeto local para o formato do Supabase (snake_case)
export const mapToSupabase = (tableName: string, item: any, userId: string | undefined) => {
  const cleanedItem = cleanObject(item);
  
  const base = {
    user_id: userId,
    created_at: cleanedItem.createdAt?.toISOString(),
    updated_at: cleanedItem.updatedAt?.toISOString(),
    id: cleanedItem.id,
  };

  switch (tableName) {
    case 'clientes':
      return {
        ...base,
        tipo: cleanedItem.tipo, nome: cleanedItem.nome, nome_fantasia: cleanedItem.nomeFantasia, documento: cleanedItem.documento, email: cleanedItem.email, telefone: cleanedItem.telefone, responsavel: cleanedItem.responsavel, endereco: cleanedItem.endereco, numero: cleanedItem.numero, complemento: cleanedItem.complemento, cidade: cleanedItem.cidade, uf: cleanedItem.uf, cep: cleanedItem.cep, observacoes: cleanedItem.observacoes, is_active: cleanedItem.isActive, avatar_url: cleanedItem.avatarUrl,
      };
    case 'parceiros':
      return {
        ...base,
        tipo: cleanedItem.tipo, nome: cleanedItem.nome, nome_fantasia: cleanedItem.nomeFantasia, documento: cleanedItem.documento, cnh: cleanedItem.cnh, email: cleanedItem.email, telefone: cleanedItem.telefone, responsavel: cleanedItem.responsavel, 
        pix_key_type: cleanedItem.pixKeyType, // NOVO
        pix_key: cleanedItem.pixKey, // NOVO
        pix_titular: cleanedItem.pixTitular, // NOVO
        endereco: cleanedItem.endereco, numero: cleanedItem.numero, complemento: cleanedItem.complemento, cidade: cleanedItem.cidade, uf: cleanedItem.uf, cep: cleanedItem.cep, observacoes: cleanedItem.observacoes, is_motorista: cleanedItem.isMotorista, is_active: cleanedItem.isActive,
      };
    case 'motoristas':
      return {
        ...base,
        parceiro_id: cleanedItem.parceiroId, nome: cleanedItem.nome || '', cpf: cleanedItem.cpf || '', cnh: cleanedItem.cnh || '', nacionalidade: cleanedItem.nacionalidade, categoria_cnh: cleanedItem.categoriaCnh, validade_cnh: cleanedItem.validadeCnh?.toISOString().split('T')[0], telefone: cleanedItem.telefone, is_active: cleanedItem.isActive,
      };
    case 'veiculos':
      // Desestrutura 'permisso' para garantir que não seja enviado ao Supabase
      const { permisso, ...veiculoItem } = cleanedItem;
      return {
        ...base,
        parceiro_id: veiculoItem.parceiroId, 
        placa: veiculoItem.placa, 
        placa_cavalo: veiculoItem.placaCavalo, 
        placa_carreta: veiculoItem.placaCarreta, 
        // REMOVIDO: placa_carreta1: veiculoItem.placaCarreta1, 
        // REMOVIDO: placa_carreta2: veiculoItem.placaCarreta2, 
        // REMOVIDO: placa_dolly: veiculoItem.placaDolly, 
        modelo: veiculoItem.modelo, 
        fabricante: veiculoItem.fabricante, 
        // Garante que ano e capacidade sejam números ou null (se não existirem)
        ano: veiculoItem.ano ? Number(veiculoItem.ano) : null, 
        capacidade: veiculoItem.capacidade ? Number(veiculoItem.capacidade) : null, 
        chassis: veiculoItem.chassis, 
        carroceria: veiculoItem.carroceria, 
        tipo: veiculoItem.tipo, 
        // REMOVIDO: quantidade_carretas: veiculoItem.quantidadeCarretas ? Number(veiculoItem.quantidadeCarretas) : null, 
        // REMOVIDO: possui_dolly: veiculoItem.possuiDolly, 
        motorista_vinculado: veiculoItem.motoristaVinculado, 
        // GARANTINDO QUE SEJA UM ARRAY VAZIO SE NÃO EXISTIR
        carretas_selecionadas: veiculoItem.carretasSelecionadas || [], 
        is_active: veiculoItem.isActive,
      };
    case 'permisso_internacional':
      return {
        ...base,
        veiculo_id: cleanedItem.veiculoId, razao_social: cleanedItem.razaoSocial, nome_fantasia: cleanedItem.nomeFantasia, cnpj: cleanedItem.cnpj, endereco_completo: cleanedItem.enderecoCompleto, data_consulta: cleanedItem.dataConsulta.toISOString(),
      };
    case 'cargas':
      return {
        ...base,
        descricao: cleanedItem.descricao, origem: cleanedItem.origem, destino: cleanedItem.destino, 
        // CORREÇÃO: Garante que peso e valor sejam números
        peso: cleanedItem.peso ? Number(cleanedItem.peso) : 0, 
        valor: cleanedItem.valor ? Number(cleanedItem.valor) : 0, 
        data_coleta: cleanedItem.dataColeta?.toISOString().split('T')[0], data_entrega: cleanedItem.dataEntrega?.toISOString().split('T')[0], status: cleanedItem.status, cliente_id: cleanedItem.clienteId, 
        crt: cleanedItem.crt, observacoes: cleanedItem.observacoes,
        transbordo: cleanedItem.transbordo,
        trajetos: cleanedItem.trajetos,
      };
    case 'movimentacoes_financeiras':
      return {
        ...base,
        tipo: cleanedItem.tipo,
        valor: cleanedItem.valor,
        descricao: cleanedItem.descricao,
        categoria: cleanedItem.categoria,
        data: cleanedItem.data.toISOString().split('T')[0],
        status: cleanedItem.status,
        data_pagamento: cleanedItem.dataPagamento?.toISOString().split('T')[0],
        parceiro_id: cleanedItem.parceiroId,
        carga_id: cleanedItem.cargaId,
        is_pago: cleanedItem.isPago,
        observacoes: cleanedItem.observacoes,
        comprovante_url: cleanedItem.comprovanteUrl,
        trajeto_index: cleanedItem.trajetoIndex,
      };
    case 'contratos_frete':
      return {
        ...base,
        carga_id: cleanedItem.cargaId, pdf_url: cleanedItem.pdfUrl, motorista_nome: cleanedItem.motoristaNome, parceiro_nome: cleanedItem.parceiroNome, crt: cleanedItem.crt,
      };
    default:
      return base;
  }
};

// Mapeia o objeto Supabase (snake_case) para o formato local (camelCase)
export const mapFromSupabase = (tableName: string, item: any) => {
  const base = {
    id: item.id,
    createdAt: new Date(item.created_at ?? item.createdAt),
    updatedAt: new Date(item.updated_at ?? item.updatedAt),
  };

  switch (tableName) {
    case 'clientes':
      return {
        ...base,
        tipo: item.tipo, nome: item.nome, nomeFantasia: item.nome_fantasia, documento: item.documento, email: item.email, telefone: item.telefone, responsavel: item.responsavel, endereco: item.endereco, numero: item.numero, complemento: item.complemento, cidade: item.cidade, uf: item.uf, cep: item.cep, observacoes: item.observacoes, isActive: item.is_active, avatarUrl: item.avatar_url,
      } as Cliente;
    case 'parceiros':
      return {
        ...base,
        tipo: item.tipo, nome: item.nome, nomeFantasia: item.nome_fantasia, documento: item.documento, cnh: item.cnh, email: item.email, telefone: item.telefone, responsavel: item.responsavel, 
        pixKeyType: item.pix_key_type, // NOVO
        pixKey: item.pix_key, // NOVO
        pixTitular: item.pix_titular, // NOVO
        endereco: item.endereco, numero: item.numero, complemento: item.complemento, cidade: item.cidade, uf: item.uf, cep: item.cep, observacoes: item.observacoes, isMotorista: item.is_motorista, isActive: item.is_active,
      } as Parceiro;
    case 'motoristas':
      return {
        ...base,
        parceiroId: item.parceiro_id, nome: item.nome, cpf: item.cpf, cnh: item.cnh, nacionalidade: item.nacionalidade, categoriaCnh: item.categoria_cnh, validadeCnh: item.validade_cnh ? new Date(item.validade_cnh) : undefined, telefone: item.telefone, isActive: item.is_active,
      } as Motorista;
    case 'veiculos':
      const veiculo: Veiculo = {
        ...base,
        parceiroId: item.parceiro_id, placa: item.placa, placaCavalo: item.placa_cavalo, placaCarreta: item.placa_carreta, 
        // REMOVIDO: placaCarreta1: item.placa_carreta1, placaCarreta2: item.placa_carreta2, placaDolly: item.placa_dolly, 
        modelo: item.modelo, fabricante: item.fabricante, ano: item.ano, capacidade: item.capacidade, chassis: item.chassis, carroceria: item.carroceria, tipo: item.tipo, 
        // REMOVIDO: quantidadeCarretas: item.quantidade_carretas, possuiDolly: item.possui_dolly, 
        motoristaVinculado: item.motorista_vinculado, carretasSelecionadas: item.carretas_selecionadas || [], isActive: item.is_active,
      } as Veiculo;
      
      // Lógica de mapeamento do Permisso: pode vir como objeto ou array
      let permissoData = item.permisso_internacional;
      if (Array.isArray(permissoData) && permissoData.length > 0) {
          permissoData = permissoData[0];
      }
      
      if (permissoData && typeof permissoData === 'object') {
          veiculo.permisso = mapFromSupabase('permisso_internacional', permissoData) as PermissoInternacional;
      }
      
      return veiculo;
      
    case 'permisso_internacional':
      return {
        ...base,
        veiculoId: item.veiculo_id, razaoSocial: item.razao_social, nomeFantasia: item.nome_fantasia, cnpj: item.cnpj, enderecoCompleto: item.endereco_completo, dataConsulta: new Date(item.data_consulta), simulado: item.simulado,
      } as PermissoInternacional;
    case 'cargas':
      return {
        ...base,
        descricao: item.descricao, origem: item.origem, destino: item.destino, 
        // CORREÇÃO: Garante que peso e valor sejam números, mesmo que venham como string ou null
        peso: Number(item.peso) || 0, 
        valor: Number(item.valor) || 0, 
        dataColeta: item.data_coleta ? new Date(item.data_coleta) : undefined, 
        dataEntrega: item.data_entrega ? new Date(item.data_entrega) : undefined, 
        status: item.status, clienteId: item.cliente_id, 
        crt: item.crt, observacoes: item.observacoes,
        transbordo: item.transbordo,
        // CORREÇÃO: Garante que trajetos seja um array e que os valores internos sejam números
        trajetos: (item.trajetos || []).map((t: any) => ({
            ...t,
            valor: Number(t.valor) || 0,
            // Garante que IDs de vínculo sejam strings ou undefined
            parceiroId: t.parceiroId || t.parceiro_id,
            motoristaId: t.motoristaId || t.motorista_id,
            veiculoId: t.veiculoId || t.veiculo_id,
        })) || [], 
        tipoOperacao: item.tipo_operacao,
      } as Carga;
    case 'movimentacoes_financeiras':
      return {
        ...base,
        tipo: item.tipo,
        valor: item.valor,
        descricao: item.descricao,
        categoria: item.categoria,
        data: new Date(item.data),
        status: item.status,
        dataPagamento: item.data_pagamento ? new Date(item.data_pagamento) : (item.dataPagamento ? new Date(item.dataPagamento) : null),
        parceiroId: item.parceiro_id ?? item.parceiroId,
        cargaId: item.carga_id ?? item.cargaId,
        isPago: item.is_pago ?? item.isPago,
        observacoes: item.observacoes,
        comprovanteUrl: item.comprovante_url ?? item.comprovanteUrl,
        trajetoIndex: item.trajeto_index,
      } as MovimentacaoFinanceira;
    case 'contratos_frete':
      return {
        ...base,
        cargaId: item.carga_id, pdfUrl: item.pdf_url, motoristaNome: item.motorista_nome, parceiroNome: item.parceiro_nome, crt: item.crt,
      } as ContratoFrete;
    default:
      return base;
  }
};