import type { Deal } from '../../types';
import { useCart } from '../../context/CartContext';

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

export default function DealCard({ deal }: Props) {
  const { addItem, items } = useCart();
  const inCart = items.some(i => i.deal.id === deal.id);
  const discount = Math.round(
    ((deal.regularPrice - deal.salePrice) / deal.regularPrice) * 100
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Store badge */}
      <div className={`${storeColors[deal.store] ?? 'bg-gray-500'} text-white text-xs font-semibold px-3 py-1`}>
        {deal.store}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <span className="text-xs text-gray-500 mb-1">{deal.category}</span>
        <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-2 flex-1">
          {deal.name}
        </h3>
        <p className="text-xs text-gray-400 mb-3">{deal.unit}</p>

        <div className="flex items-end justify-between mb-3">
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

        <p className="text-xs text-gray-400 mb-3">
          Valide jusqu'au {new Date(deal.validUntil).toLocaleDateString('fr-CA')}
        </p>

        <button
          onClick={() => addItem(deal)}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
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
