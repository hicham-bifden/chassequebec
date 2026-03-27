import { useState, useMemo } from 'react';
import DealCard from '../components/deals/DealCard';
import FilterBar from '../components/deals/FilterBar';
import { useDeals } from '../hooks/useDeals';
import type { Store, Category, Deal, DealFilters } from '../types';
import type { ApiDeal } from '../services/api';

// Maps display Store name → API store_id
const STORE_TO_ID: Record<string, string> = {
  'IGA': 'iga', 'Maxi': 'maxi', 'Metro': 'metro',
  'Super C': 'superc', 'Costco': 'costco',
};

// Maps display Category label → API category_id
const CATEGORY_TO_ID: Record<string, string> = {
  'Fruits & Légumes': 'fruits-legumes',
  'Viandes': 'viande',
  'Produits laitiers': 'produits-laitiers',
  'Épicerie': 'epicerie',
  'Surgelés': 'surgeles',
  'Boulangerie': 'boulangerie',
  'Boissons': 'boissons',
  'Hygiène': 'hygiene',
};

// Maps API sort key → useDeals sort key
const SORT_MAP: Record<string, string> = {
  discount: 'pct', price: 'price', name: 'name',
};

function apiDealToDeal(d: ApiDeal): Deal {
  return {
    id: d.id,
    name: d.name,
    store: (d.store_name ?? d.store_id) as Store,
    category: (d.category_label ?? d.category_id) as Category,
    regularPrice: Number(d.regular_price),
    salePrice: Number(d.sale_price),
    unit: d.unit ?? '',
    validUntil: d.valid_until ?? '',
    imageUrl:    d.image_url    || undefined,
    productUrl:  d.product_url  || undefined,
    unitPrice:   d.unit_price   ?? undefined,
    unitLabel:   d.unit_label   ?? undefined,
    promoStatus: d.promo_status ?? undefined,
  };
}

const PAGE_SIZE = 100;

export default function Dashboard() {
  const [selectedStore, setSelectedStore] = useState<Store | 'Tous'>('Tous');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Toutes'>('Toutes');
  const [sortBy, setSortBy] = useState<'discount' | 'price' | 'name'>('discount');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Reset limit when filters change
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (val: T) => { setter(val); setLimit(PAGE_SIZE); };

  const filters: DealFilters = useMemo(() => ({
    storeId:    selectedStore === 'Tous' ? 'all' : (STORE_TO_ID[selectedStore] ?? 'all'),
    categoryId: selectedCategory === 'Toutes' ? 'all' : (CATEGORY_TO_ID[selectedCategory] ?? 'all'),
    sortBy:     SORT_MAP[sortBy] ?? 'pct',
    search:     search || undefined,
    limit,
  }), [selectedStore, selectedCategory, sortBy, search, limit]);

  const { deals: apiDeals, loading, error, fromAPI } = useDeals(filters);

  const deals: Deal[] = useMemo(() => apiDeals.map(apiDealToDeal), [apiDeals]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Circulaires de la semaine
          </h1>
          <p className="text-gray-500 mt-1">
            {loading ? 'Chargement…' : `${deals.length} offre${deals.length !== 1 ? 's' : ''} disponible${deals.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <span className={`mt-1 px-3 py-1 rounded-full text-xs font-semibold ${fromAPI ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {fromAPI ? '🟢 Données live' : '🟡 Démo'}
        </span>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
          {error}
        </div>
      )}

      <FilterBar
        selectedStore={selectedStore}
        selectedCategory={selectedCategory}
        onStoreChange={handleFilterChange(setSelectedStore)}
        onCategoryChange={handleFilterChange(setSelectedCategory)}
        sortBy={sortBy}
        onSortChange={handleFilterChange(setSortBy)}
        search={search}
        onSearchChange={s => { setSearch(s); setLimit(PAGE_SIZE); }}
      />

      {/* Skeleton uniquement au chargement initial (aucun deal affiché) */}
      {loading && deals.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 h-56 animate-pulse">
              <div className="h-6 bg-gray-200 rounded-t-xl" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-8 bg-gray-100 rounded w-1/3 mt-4" />
                <div className="h-8 bg-gray-200 rounded-lg mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : !loading && deals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Aucune offre trouvée</p>
          <p className="text-sm mt-2">Essayez d'autres filtres</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {deals.map(deal => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>

          {/* Bouton "Charger plus" — reste à la même position de scroll */}
          {deals.length >= limit && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setLimit(l => l + PAGE_SIZE)}
                disabled={loading}
                className="px-8 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all disabled:opacity-50"
              >
                {loading ? 'Chargement…' : `Charger ${PAGE_SIZE} produits de plus`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
