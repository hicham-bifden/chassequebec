import { useMemo } from 'react';
import { useCart } from '../context/CartContext';
import type { CartItem } from '../types';

const STORE_COLORS: Record<string, string> = {
  IGA: 'bg-red-600', Maxi: 'bg-yellow-500', Metro: 'bg-teal-500',
  'Super C': 'bg-orange-500', Costco: 'bg-blue-700',
};

// Regroupe les articles par magasin et calcule le total par magasin
function groupByStore(items: CartItem[]) {
  const map: Record<string, { items: CartItem[]; total: number }> = {};
  for (const item of items) {
    const store = item.deal.store;
    if (!map[store]) map[store] = { items: [], total: 0 };
    map[store].items.push(item);
    map[store].total += item.deal.salePrice * item.quantity;
  }
  return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
}

export default function MyList() {
  const { items, removeItem, toggleChecked, updateQuantity, clearChecked } = useCart();

  const checkedCount = items.filter(i => i.checked).length;
  const total = items.reduce((sum, i) => sum + i.deal.salePrice * i.quantity, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const byStore = useMemo(() => groupByStore(items), [items]);
  const multiStore = byStore.length > 1;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Votre liste est vide</h2>
        <p className="text-gray-400">
          Ajoutez des offres depuis le tableau de bord pour commencer votre liste d'épicerie.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Ma liste</h1>
        {checkedCount > 0 && (
          <button
            onClick={clearChecked}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Supprimer les cochés ({checkedCount})
          </button>
        )}
      </div>

      {/* Optimisation de panier — affiché seulement si plusieurs magasins */}
      {multiStore && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-800 mb-3">
            🗺️ Circuit d'épicerie optimisé
          </p>
          <div className="space-y-2">
            {byStore.map(([store, data]) => (
              <div key={store} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${STORE_COLORS[store] ?? 'bg-gray-400'}`} />
                <span className="text-sm font-medium text-gray-700 flex-1">
                  {store}
                  <span className="text-xs text-gray-400 ml-1">
                    ({data.items.length} article{data.items.length > 1 ? 's' : ''})
                  </span>
                </span>
                <span className="text-sm font-bold text-blue-700">
                  {data.total.toFixed(2)} $
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-500 mt-3 border-t border-blue-100 pt-2">
            Tes articles viennent de {byStore.length} magasins différents.
            Pour économiser davantage, utilise <strong>Comparer</strong> pour trouver le même produit moins cher ailleurs.
          </p>
        </div>
      )}

      {/* Liste des articles */}
      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.deal.id}
            className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4 transition-opacity ${
              item.checked ? 'opacity-50' : ''
            }`}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleChecked(item.deal.id)}
              className="w-5 h-5 rounded accent-red-600 cursor-pointer"
            />

            {/* Badge magasin */}
            <span className={`hidden sm:inline px-2 py-0.5 rounded text-white text-xs font-bold shrink-0 ${
              STORE_COLORS[item.deal.store] ?? 'bg-gray-500'
            }`}>
              {item.deal.store}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-gray-800 truncate ${item.checked ? 'line-through' : ''}`}>
                {item.deal.name}
              </p>
              <p className="text-xs text-gray-400">
                <span className="sm:hidden">{item.deal.store} · </span>
                {item.deal.unit}
              </p>
            </div>

            {/* Quantité */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.deal.id, item.quantity - 1)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center"
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.deal.id, item.quantity + 1)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center"
              >
                +
              </button>
            </div>

            {/* Prix */}
            <div className="text-right shrink-0">
              <p className="font-bold text-red-600">
                {(item.deal.salePrice * item.quantity).toFixed(2)} $
              </p>
              {item.quantity > 1 && (
                <p className="text-xs text-gray-400">
                  {item.deal.salePrice.toFixed(2)} $ / u
                </p>
              )}
            </div>

            {/* Supprimer */}
            <button
              onClick={() => removeItem(item.deal.id)}
              className="text-gray-300 hover:text-red-500 transition-colors ml-1"
              title="Retirer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border p-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">
            Total estimé ({totalItems} article{totalItems !== 1 ? 's' : ''})
          </span>
          <span className="text-2xl font-bold text-gray-900">{total.toFixed(2)} $</span>
        </div>
        {multiStore && (
          <p className="text-xs text-gray-400 mt-1">
            Réparti sur {byStore.length} magasins · voir circuit ci-dessus
          </p>
        )}
      </div>
    </div>
  );
}
