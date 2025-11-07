import { useState, useEffect, useMemo } from "react";
import axios from "axios";

type City = {
  id: number;
  nome: string;
};

interface UseCityAutocompleteResult {
  listaCidades: City[];
  filteredCities: City[];
  isLoading: boolean;
}

/**
 * Hook para buscar e filtrar cidades de uma UF usando a API do IBGE.
 * @param uf Sigla da Unidade Federativa (ex: 'SP', 'RS'). Deve ser uma UF brasileira.
 * @param query Termo de busca digitado pelo usuário.
 * @returns Objeto com a lista completa, lista filtrada e estado de carregamento.
 */
export const useCityAutocomplete = (uf: string, query: string): UseCityAutocompleteResult => {
  const [listaCidades, setListaCidades] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // 1. Debounce para a query de filtragem
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms de debounce

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // 2. Carrega cidades da UF selecionada (apenas quando a UF muda)
  useEffect(() => {
    if (!uf || uf.length !== 2) {
      setListaCidades([]);
      return;
    }

    const source = axios.CancelToken.source();
    setIsLoading(true);

    axios.get(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
      { cancelToken: source.token }
    )
      .then(res => {
        const data: any[] = res.data;
        setListaCidades(data.map(c => ({ id: c.id, nome: c.nome })));
      })
      .catch(error => {
        if (!axios.isCancel(error)) {
          console.error(`Erro ao carregar cidades para ${uf}:`, error);
          setListaCidades([]);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      source.cancel();
    };
  }, [uf]);

  // 3. Filtra a lista de cidades com base na query (usando a query com debounce)
  const filteredCities = useMemo(() => {
    if (debouncedQuery.length < 2) {
      return [];
    }

    const q = debouncedQuery.toLowerCase();
    return listaCidades.filter(c =>
      c.nome.toLowerCase().includes(q)
    ).slice(0, 10); // Limita a 10 resultados
  }, [debouncedQuery, listaCidades]);

  return { listaCidades, filteredCities, isLoading };
};