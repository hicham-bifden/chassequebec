import { useState, useRef } from 'react';
import { fetchCompare, type CompareStore } from '../services/api';
import { useCart } from '../context/CartContext';
import type { Deal } from '../types';

// Couleurs par magasin (badge en haut de la carte)
const STORE_COLORS: Record<string, string> = {
  iga:    'bg-red-600',
  maxi:   'bg-yellow-500',
  metro:  'bg-teal-500',
  superc: 'bg-orange-500',
  costco: 'bg-blue-700',
};

// Suggestions de recherche rapide
const SUGGESTIONS = [
  'poulet', 'bœuf', 'lait', 'fromage', 'pain',
  'banane', 'pomme', 'pizza', 'jus', 'café',
];

// Convertit un résultat API en Deal pour le panier
function toDeal(item: CompareStore['best']): Deal {
  return {
    id:           item.id,
    name:         item.name,
    store:        item.store_name as Deal['store'],
    category:     (item.category_label ?? item.category_id) as Deal['category'],
    regularPrice: Number(item.regular_price),
    salePrice:    Number(item.sale_price),
    unit:         item.unit ?? '',
    validUntil:   item.valid_until ?? '',
  };
}

export default function ComparePage() {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<CompareStore[] | null>(null);
  const [searched, setSearched] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addItem, items: cartItems } = useCart();

  async function search(q: string) {
    const term = q.trim();
    if (term.length < 2) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await fetchCompare(term);
      setResults(data.stores);
      setSearched(data.query);
    } catch {
      setError('Impossible de contacter l\'API. Vérifiez que le serveur tourne.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    search(query);
  }

  function handleSuggestion(s: string) {
    setQuery(s);
    search(s);
    inputRef.current?.focus();
  }

  // Le magasin avec le prix le plus bas est à l'index 0 (trié par l'API)
  const cheapestStoreId = results?.[0]?.store_id;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* Titre */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Comparer les prix</h1>
        <p className="text-gray-500 mt-1">
          Cherchez un produit pour voir son prix dans chaque magasin côte à côte.
        </p>
      </div>

      {/* Barre de recherche */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ex: poulet, lait, fromage…"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-40 transition-colors"
        >
          {loading ? 'Recherche…' : 'Comparer'}
        </button>
      </form>

      {/* Suggestions rapides */}
      <div className="flex flex-wrap gap-2 mb-8">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => handleSuggestion(s)}
            className="px-3 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-full text-xs font-medium transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Aucun résultat */}
      {results !== null && results.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg font-medium">Aucun résultat pour « {searched} »</p>
          <p className="text-sm mt-1">Essayez un autre mot-clé</p>
        </div>
      )}

      {/* Résultats — grille de cartes par magasin */}
      {results && results.length > 0 && (
        <>
          {/* Résumé */}
          <div className="mb-4 flex items-center gap-3">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{results.length} magasin{results.length > 1 ? 's' : ''}</span>
              {' '}ont « {searched} » en circulaire cette semaine
            </p>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
              Le moins cher en premier
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((store, index) => (
              <StoreCard
                key={store.store_id}
                store={store}
                isCheapest={store.store_id === cheapestStoreId}
                rank={index + 1}
                inCart={cartItems.some(i => i.deal.id === store.best.id)}
                onAddToCart={() => addItem(toDeal(store.best))}
              />
            ))}
          </div>
        </>
      )}

      {/* État vide initial */}
      {results === null && !loading && (
        <div className="text-center py-20 text-gray-300">
          <p className="text-6xl mb-4">🏪</p>
          <p className="text-lg text-gray-400">Entrez un produit pour comparer les prix</p>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Carte d'un magasin avec son meilleur prix pour le produit cherché
// ------------------------------------------------------------------
interface StoreCardProps {
  store:       CompareStore;
  isCheapest:  boolean;
  rank:        number;
  inCart:      boolean;
  onAddToCart: () => void;
}

function StoreCard({ store, isCheapest, rank, inCart, onAddToCart }: StoreCardProps) {
  const { best, others } = store;
  const salePrice    = Number(best.sale_price);
  const regularPrice = Number(best.regular_price);
  const savingPct    = Number(best.saving_pct);

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col transition-shadow hover:shadow-md
      ${isCheapest ? 'border-green-400 ring-2 ring-green-300' : 'border-gray-100'}`}
    >
      {/* Badge magasin */}
      <div className={`${STORE_COLORS[store.store_id] ?? 'bg-gray-500'} text-white px-3 py-1.5 flex items-center justify-between`}>
        <span className="text-sm font-bold">{store.store_name}</span>
        {isCheapest && (
          <span className="bg-white text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
            Le moins cher
          </span>
        )}
        {!isCheapest && (
          <span className="text-white/70 text-xs">#{rank}</span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Nom du produit */}
        <p className="text-xs text-gray-400 mb-1">{best.category_label}</p>
        <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-1 flex-1">
          {best.name}
        </h3>
        <p className="text-xs text-gray-400 mb-3">{best.unit}</p>

        {/* Prix */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className={`text-2xl font-bold ${isCheapest ? 'text-green-600' : 'text-red-600'}`}>
              {salePrice.toFixed(2)} $
            </span>
            <span className="block text-xs text-gray-400 line-through">
              {regularPrice.toFixed(2)} $
            </span>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full
            ${isCheapest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            -{savingPct}%
          </span>
        </div>

        {/* Autres produits trouvés dans ce magasin */}
        {others.length > 0 && (
          <div className="border-t border-gray-50 pt-2 mb-3">
            <p className="text-xs text-gray-400 mb-1">Aussi en circulaire:</p>
            {others.map(o => (
              <p key={o.id} className="text-xs text-gray-500 truncate">
                • {o.name} — {Number(o.sale_price).toFixed(2)} $
              </p>
            ))}
          </div>
        )}

        {/* Bouton panier */}
        <button
          onClick={onAddToCart}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors mt-auto
            ${inCart
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : isCheapest
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
        >
          {inCart ? '✓ Dans ma liste' : '+ Ma liste'}
        </button>
      </div>
    </div>
  );
}
