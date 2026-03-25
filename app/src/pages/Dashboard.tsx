import { useState, useMemo } from 'react';
import { mockDeals } from '../data/mockDeals';
import DealCard from '../components/deals/DealCard';
import FilterBar from '../components/deals/FilterBar';
import type { Store, Category } from '../types';

export default function Dashboard() {
  const [selectedStore, setSelectedStore] = useState<Store | 'Tous'>('Tous');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Toutes'>('Toutes');
  const [sortBy, setSortBy] = useState<'discount' | 'price' | 'name'>('discount');

  const filtered = useMemo(() => {
    let deals = [...mockDeals];

    if (selectedStore !== 'Tous') {
      deals = deals.filter(d => d.store === selectedStore);
    }
    if (selectedCategory !== 'Toutes') {
      deals = deals.filter(d => d.category === selectedCategory);
    }

    deals.sort((a, b) => {
      if (sortBy === 'discount') {
        const discountA = (a.regularPrice - a.salePrice) / a.regularPrice;
        const discountB = (b.regularPrice - b.salePrice) / b.regularPrice;
        return discountB - discountA;
      }
      if (sortBy === 'price') return a.salePrice - b.salePrice;
      return a.name.localeCompare(b.name, 'fr');
    });

    return deals;
  }, [selectedStore, selectedCategory, sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Circulaires de la semaine
        </h1>
        <p className="text-gray-500 mt-1">
          {filtered.length} offre{filtered.length !== 1 ? 's' : ''} disponible
          {filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      <FilterBar
        selectedStore={selectedStore}
        selectedCategory={selectedCategory}
        onStoreChange={setSelectedStore}
        onCategoryChange={setSelectedCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Aucune offre trouvée</p>
          <p className="text-sm mt-2">Essayez d'autres filtres</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
