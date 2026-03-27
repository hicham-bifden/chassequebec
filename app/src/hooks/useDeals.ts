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
      const mockAsApiDeals: ApiDeal[] = MOCK_DEALS.map(d => ({
        id: d.id,
        name: d.name,
        store_id: d.store.toLowerCase().replace(' ', ''),
        store_name: d.store,
        color: '',
        text_color: '',
        category_id: d.category,
        category_label: d.category,
        emoji: '',
        regular_price: d.regularPrice,
        sale_price: d.salePrice,
        unit: d.unit,
        valid_until: d.validUntil,
        image_emoji: '',
        image_url: '',
        loyalty_points: 0,
        saving_pct: Math.round(((d.regularPrice - d.salePrice) / d.regularPrice) * 100),
        saving_amount: Math.round((d.regularPrice - d.salePrice) * 100) / 100,
      }));
      setDeals(mockAsApiDeals);
      setFromAPI(false);
      setError('API non disponible — données de démonstration affichées');
    } finally {
      setLoading(false);
    }
  }, [filters.storeId, filters.categoryId, filters.sortBy, filters.search]);

  useEffect(() => { load(); }, [load]);

  return { deals, loading, error, fromAPI, refresh: load };
};
