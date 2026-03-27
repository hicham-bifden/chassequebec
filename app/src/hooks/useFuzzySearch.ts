import { useMemo } from 'react';
import Fuse from 'fuse.js';
import type { ApiDeal } from '../services/api';

const FUSE_OPTIONS = {
  keys: [
    { name: 'name',           weight: 0.6 },
    { name: 'brand',          weight: 0.2 },
    { name: 'category_label', weight: 0.1 },
    { name: 'store_name',     weight: 0.1 },
  ],
  threshold: 0.4,      // 0 = exact, 1 = tout match
  minMatchCharLength: 2,
  includeScore: true,
};

/**
 * Retourne les suggestions fuzzy basées sur les deals déjà chargés.
 * Utile pour la complétion automatique en temps réel.
 */
export function useFuzzySearch(deals: ApiDeal[], query: string): ApiDeal[] {
  const fuse = useMemo(() => new Fuse(deals, FUSE_OPTIONS), [deals]);

  return useMemo(() => {
    if (!query || query.trim().length < 2) return [];
    return fuse
      .search(query.trim())
      .slice(0, 6)
      .map(r => r.item);
  }, [fuse, query]);
}
