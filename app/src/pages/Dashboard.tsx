import { useState, useMemo } from 'react';
import DealCard from '../components/deals/DealCard';
import FilterBar from '../components/deals/FilterBar';
import QuickSearch from '../components/QuickSearch';
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

// Category sections definition (order matters)
const CATEGORY_SECTIONS: { label: string; emoji: string; id: string }[] = [
  { label: 'Viandes',          emoji: '🥩', id: 'viande' },
  { label: 'Fruits & légumes', emoji: '🥦', id: 'fruits-legumes' },
  { label: 'Produits laitiers',emoji: '🥛', id: 'produits-laitiers' },
  { label: 'Épicerie',         emoji: '🥫', id: 'epicerie' },
  { label: 'Hygiène',          emoji: '🧴', id: 'hygiene' },
  { label: 'Boissons',         emoji: '🧃', id: 'boissons' },
  { label: 'Surgelés',         emoji: '🧊', id: 'surgeles' },
  { label: 'Boulangerie',      emoji: '🍞', id: 'boulangerie' },
];

const CATEGORY_PAGE_SIZE = 8; // 2 rows × 4 cols

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

// Component for a single category section
interface CategorySectionProps {
  title: string;
  emoji: string;
  deals: Deal[];
}

function CategorySection({ title, emoji, deals }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(false);

  const shown = expanded ? deals : deals.slice(0, CATEGORY_PAGE_SIZE);
  const remaining = deals.length - CATEGORY_PAGE_SIZE;

  if (deals.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-gray-800">
          {emoji} {title}
          <span className="ml-2 text-sm font-normal text-gray-400">({deals.length})</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {shown.map(deal => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
      {!expanded && remaining > 0 && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setExpanded(true)}
            className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all"
          >
            Voir {remaining} de plus
          </button>
        </div>
      )}
      {expanded && deals.length > CATEGORY_PAGE_SIZE && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setExpanded(false)}
            className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all"
          >
            Voir moins
          </button>
        </div>
      )}
    </section>
  );
}

// Hot deals horizontal scroll section
interface HotDealsSectionProps {
  deals: Deal[];
}

function HotDealsSection({ deals }: HotDealsSectionProps) {
  if (deals.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-gray-800 mb-3">
        À ne pas manquer 🔥
        <span className="ml-2 text-sm font-normal text-gray-400">({deals.length} top deals)</span>
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {deals.map(deal => (
          <div key={deal.id} className="flex-none w-56 snap-start">
            <DealCard deal={deal} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [selectedStore, setSelectedStore] = useState<Store | 'Tous'>('Tous');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Toutes'>('Toutes');
  const [sortBy, setSortBy] = useState<'discount' | 'price' | 'name'>('discount');
  const [search, setSearch] = useState('');

  // Reset category when filters change
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (val: T) => { setter(val); };

  const filters: DealFilters = useMemo(() => ({
    storeId:    selectedStore === 'Tous' ? 'all' : (STORE_TO_ID[selectedStore] ?? 'all'),
    categoryId: selectedCategory === 'Toutes' ? 'all' : (CATEGORY_TO_ID[selectedCategory] ?? 'all'),
    sortBy:     SORT_MAP[sortBy] ?? 'pct',
    search:     search || undefined,
    // Load all deals for category layout; limit to 1000 when no search
    limit:      1000,
  }), [selectedStore, selectedCategory, sortBy, search]);

  const { deals: apiDeals, loading, error, fromAPI } = useDeals(filters);

  const deals: Deal[] = useMemo(() => apiDeals.map(apiDealToDeal), [apiDeals]);

  const isSearchActive = Boolean(search && search.trim().length > 0);

  // Build category groups (only when no search)
  const hotDeals = useMemo(() => {
    if (isSearchActive) return [];
    return deals
      .filter(d => {
        const savingPct = d.regularPrice > 0
          ? Math.round(((d.regularPrice - d.salePrice) / d.regularPrice) * 100)
          : 0;
        return savingPct >= 35;
      })
      .sort((a, b) => {
        const pctA = Math.round(((a.regularPrice - a.salePrice) / a.regularPrice) * 100);
        const pctB = Math.round(((b.regularPrice - b.salePrice) / b.regularPrice) * 100);
        return pctB - pctA;
      })
      .slice(0, 6);
  }, [deals, isSearchActive]);

  const dealsByCategory = useMemo(() => {
    if (isSearchActive) return {};
    const map: Record<string, Deal[]> = {};
    for (const section of CATEGORY_SECTIONS) {
      map[section.id] = [];
    }
    for (const deal of deals) {
      // Find the api deal to get category_id
      const apiDeal = apiDeals.find(d => d.id === deal.id);
      const catId = apiDeal?.category_id ?? '';
      if (catId && map[catId]) {
        map[catId].push(deal);
      }
    }
    // Each category already sorted by saving_pct DESC (from API sort=pct)
    return map;
  }, [deals, apiDeals, isSearchActive]);

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
        onSearchChange={s => { setSearch(s); }}
        loadedDeals={apiDeals}
      />

      {/* QuickSearch — only when no search active */}
      {!isSearchActive && <QuickSearch />}

      {/* Skeleton au chargement initial */}
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
      ) : isSearchActive ? (
        /* Search mode: flat list */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {deals.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        /* Category layout */
        <>
          <HotDealsSection deals={hotDeals} />
          {CATEGORY_SECTIONS.map(section => (
            <CategorySection
              key={section.id}
              title={section.label}
              emoji={section.emoji}
              deals={dealsByCategory[section.id] ?? []}
            />
          ))}
        </>
      )}
    </div>
  );
}
