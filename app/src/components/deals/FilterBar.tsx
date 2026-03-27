import { useRef, useState } from 'react';
import type { Store, Category } from '../../types';
import type { ApiDeal } from '../../services/api';
import { useFuzzySearch } from '../../hooks/useFuzzySearch';

const STORES: Store[] = ['IGA', 'Maxi', 'Metro', 'Super C', 'Costco'];
const CATEGORIES: Category[] = [
  'Fruits & Légumes',
  'Viandes',
  'Produits laitiers',
  'Épicerie',
  'Hygiène',
  'Surgelés',
  'Boulangerie',
  'Boissons',
];

interface Props {
  selectedStore: Store | 'Tous';
  selectedCategory: Category | 'Toutes';
  onStoreChange: (store: Store | 'Tous') => void;
  onCategoryChange: (category: Category | 'Toutes') => void;
  sortBy: 'discount' | 'price' | 'name';
  onSortChange: (sort: 'discount' | 'price' | 'name') => void;
  search: string;
  onSearchChange: (s: string) => void;
  loadedDeals?: ApiDeal[]; // pour les suggestions fuzzy
}

export default function FilterBar({
  selectedStore,
  selectedCategory,
  onStoreChange,
  onCategoryChange,
  sortBy,
  onSortChange,
  search,
  onSearchChange,
  loadedDeals = [],
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useFuzzySearch(loadedDeals, search);
  const showSuggestions = focused && suggestions.length > 0 && search.length >= 2;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-4 items-center">
      {/* Search avec suggestions fuzzy */}
      <div className="w-full relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Rechercher un produit… (ex: poulet bbq, 2% lait)"
          className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        {/* Dropdown suggestions fuzzy */}
        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map(deal => (
              <button
                key={deal.id}
                onMouseDown={() => {
                  onSearchChange(deal.name);
                  setFocused(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate font-medium">{deal.name}</p>
                  <p className="text-xs text-gray-400">{deal.store_name} · {deal.category_label}</p>
                </div>
                <span className="text-sm font-bold text-red-600 shrink-0">
                  {Number(deal.sale_price).toFixed(2)} $
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Store filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Épicerie
        </label>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onStoreChange('Tous')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedStore === 'Tous'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          {STORES.map(store => (
            <button
              key={store}
              onClick={() => onStoreChange(store)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedStore === store
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {store}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Catégorie
        </label>
        <select
          value={selectedCategory}
          onChange={e => onCategoryChange(e.target.value as Category | 'Toutes')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          <option value="Toutes">Toutes les catégories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div className="flex flex-col gap-1 ml-auto">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Trier par
        </label>
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value as 'discount' | 'price' | 'name')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          <option value="discount">Meilleure réduction</option>
          <option value="price">Prix croissant</option>
          <option value="name">Nom A–Z</option>
        </select>
      </div>
    </div>
  );
}
