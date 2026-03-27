import { useState } from 'react';
import type { Deal } from '../../types';
import { useCart } from '../../context/CartContext';
import PriceHistoryChart from './PriceHistoryChart';

interface Props {
  deal: Deal;
}

const storeColors: Record<string, string> = {
  IGA: 'bg-red-600',
  Maxi: 'bg-yellow-500',
  Metro: 'bg-teal-500',
  'Super C': 'bg-orange-500',
  Costco: 'bg-blue-700',
};

const storeHexColors: Record<string, string> = {
  IGA: '#dc2626', Maxi: '#eab308', Metro: '#14b8a6', 'Super C': '#f97316', Costco: '#1d4ed8',
};

const storeIds: Record<string, string> = {
  IGA: 'iga', Maxi: 'maxi', Metro: 'metro', 'Super C': 'superc', Costco: 'costco',
};

// Badges pour le statut promo
const PROMO_BADGE: Record<string, { label: string; className: string }> = {
  true_promo:   { label: '✅ Vraie promo',     className: 'bg-green-100 text-green-700 border border-green-200' },
  normal_promo: { label: '🟡 Bonne promo',     className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  fake_promo:   { label: '⚠️ Fausse promo',    className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  arnaque:      { label: '🚨 Plus cher!',       className: 'bg-red-50 text-red-700 border border-red-200' },
};

export default function DealCard({ deal }: Props) {
  const { addItem, items } = useCart();
  const [showChart, setShowChart] = useState(false);
  const inCart = items.some(i => i.deal.id === deal.id);
  const discount = Math.round(
    ((deal.regularPrice - deal.salePrice) / deal.regularPrice) * 100
  );

  const promoBadge = deal.promoStatus ? PROMO_BADGE[deal.promoStatus] : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Store badge */}
      <div className={`${storeColors[deal.store] ?? 'bg-gray-500'} text-white text-xs font-semibold px-3 py-1`}>
        {deal.store}
      </div>

      {/* Product image */}
      {deal.imageUrl && (
        <div className="h-32 bg-gray-50 flex items-center justify-center overflow-hidden">
          <img
            src={deal.imageUrl}
            alt={deal.name}
            className="h-full w-full object-contain p-2"
            loading="lazy"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <span className="text-xs text-gray-500 mb-1">{deal.category}</span>
        <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-1 flex-1">
          {deal.name}
        </h3>
        {deal.unit && <p className="text-xs text-gray-400 mb-2">{deal.unit}</p>}

        {/* Prix + rabais */}
        <div className="flex items-end justify-between mb-1">
          <div>
            <span className="text-2xl font-bold text-red-600">
              {deal.salePrice.toFixed(2)} $
            </span>
            <span className="block text-xs text-gray-400 line-through">
              {deal.regularPrice.toFixed(2)} $
            </span>
          </div>
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
            -{discount}%
          </span>
        </div>

        {/* Prix unitaire — la vraie valeur pour comparer */}
        {deal.unitPrice && (
          <div className="mb-2 px-2 py-1 bg-blue-50 rounded-lg flex items-center gap-1">
            <span className="text-xs font-bold text-blue-700">
              {deal.unitPrice} $
            </span>
            <span className="text-xs text-blue-500">{deal.unitLabel}</span>
          </div>
        )}

        {/* Badge statut promo (fausse promo, vraie promo, arnaque…) */}
        {promoBadge && (
          <div className={`mb-2 px-2 py-0.5 rounded-lg text-xs font-medium ${promoBadge.className}`}>
            {promoBadge.label}
          </div>
        )}

        {/* Date + lien officiel */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400">
            Jusqu'au {new Date(deal.validUntil).toLocaleDateString('fr-CA')}
          </p>
          {deal.productUrl && (
            <a
              href={deal.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
              onClick={e => e.stopPropagation()}
            >
              Voir ↗
            </a>
          )}
        </div>

        {/* Historique de prix */}
        <button
          onClick={() => setShowChart(s => !s)}
          className="w-full py-1.5 mb-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 border border-gray-100 transition-colors"
        >
          {showChart ? '▲ Masquer' : '📈 Historique de prix'}
        </button>

        {showChart && (
          <PriceHistoryChart
            dealName={deal.name}
            storeId={storeIds[deal.store] ?? deal.store.toLowerCase()}
            storeColor={storeHexColors[deal.store] ?? '#dc2626'}
          />
        )}

        <button
          onClick={() => addItem(deal)}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors mt-auto ${
            inCart
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {inCart ? '✓ Ajouté' : '+ Ma liste'}
        </button>
      </div>
    </div>
  );
}
