import { useState } from 'react';
import { fetchCompare, type CompareResult } from '../services/api';

interface ProductResult {
  product: string;
  data: CompareResult | null;
  loading: boolean;
  error: string | null;
}

export default function QuickSearch() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const products = input
      .split(/[+,]/)
      .map(s => s.trim())
      .filter(s => s.length >= 2);
    if (products.length === 0) return;

    setSubmitted(true);
    // Initialize loading state for each product
    const initial: ProductResult[] = products.map(p => ({
      product: p,
      data: null,
      loading: true,
      error: null,
    }));
    setResults(initial);

    // Fetch all in parallel
    await Promise.all(
      products.map(async (product, idx) => {
        try {
          const data = await fetchCompare(product);
          setResults(prev => {
            const next = [...prev];
            next[idx] = { product, data, loading: false, error: null };
            return next;
          });
        } catch {
          setResults(prev => {
            const next = [...prev];
            next[idx] = { product, data: null, loading: false, error: 'Erreur de recherche' };
            return next;
          });
        }
      })
    );
  }

  return (
    <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h2 className="text-sm font-bold text-gray-700 mb-2">
        🛒 Recherche express multi-produits
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setSubmitted(false); }}
          placeholder="oeuf + lait + banane"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <button
          type="submit"
          disabled={input.trim().length < 2}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
        >
          Chercher
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-1">Séparez vos produits par + ou ,</p>

      {submitted && results.length > 0 && (
        <div className="mt-4 space-y-3">
          {results.map((r, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-600 uppercase mb-2">
                {r.product}
              </p>
              {r.loading && (
                <p className="text-xs text-gray-400 animate-pulse">Chargement…</p>
              )}
              {r.error && (
                <p className="text-xs text-red-500">{r.error}</p>
              )}
              {!r.loading && !r.error && r.data && r.data.stores.length === 0 && (
                <p className="text-xs text-gray-400">Aucun résultat</p>
              )}
              {!r.loading && !r.error && r.data && r.data.stores.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {r.data.stores.map((store, si) => (
                    <div
                      key={store.store_id}
                      className={`px-3 py-1.5 rounded-lg text-xs flex flex-col gap-0.5 ${
                        si === 0
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      <span className={`font-bold ${si === 0 ? 'text-green-700' : 'text-gray-600'}`}>
                        {store.store_name}
                        {si === 0 && ' 🏆'}
                      </span>
                      <span className="font-semibold text-gray-800">
                        {Number(store.best.sale_price).toFixed(2)} $
                      </span>
                      <span className="text-gray-400 truncate max-w-[140px]">
                        {store.best.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
