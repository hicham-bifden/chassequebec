import type { Store, Category } from '../../types';

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
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-4 items-center">
      {/* Search */}
      <div className="w-full">
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Rechercher un produit…"
          className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        />
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
