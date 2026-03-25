import { useState, useEffect, useCallback } from 'react';
import { fetchDeals, type ApiDeal } from '../services/api';
import { MOCK_DEALS } from '../data/mockDeals';
import type { DealFilters } from '../types';

export const useDeals = (filters: DealFilters) => {
  const [deals, setDeals]     = useState<ApiDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [fromAPI, setFromAPI] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeals({
        store:    filters.storeId    !== 'all' ? filters.storeId    : undefined,
        category: filters.categoryId !== 'all' ? filters.categoryId : undefined,
        sort:     filters.sortBy,
        search:   filters.search     || undefined,
      });
      setDeals(data);
      setFromAPI(true);
    } catch {
      // Fallback sur les données mock si l'API n'est pas dispo
      console.warn('[useDeals] API non disponible — utilisation des données mock');
      setDeals(MOCK_DEALS as unknown as ApiDeal[]);
      setFromAPI(false);
      setError('API non disponible — données de démonstration affichées');
    } finally {
      setLoading(false);
    }
  }, [filters.storeId, filters.categoryId, filters.sortBy, filters.search]);

  useEffect(() => { load(); }, [load]);

  return { deals, loading, error, fromAPI, refresh: load };
};
