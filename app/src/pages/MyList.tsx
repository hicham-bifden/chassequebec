import { useCart } from '../context/CartContext';

export default function MyList() {
  const { items, removeItem, toggleChecked, updateQuantity, clearChecked } = useCart();

  const checkedCount = items.filter(i => i.checked).length;
  const total = items.reduce(
    (sum, i) => sum + i.deal.salePrice * i.quantity,
    0
  );

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">
          Votre liste est vide
        </h2>
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

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-gray-800 truncate ${item.checked ? 'line-through' : ''}`}>
                {item.deal.name}
              </p>
              <p className="text-xs text-gray-400">{item.deal.store} · {item.deal.unit}</p>
            </div>

            {/* Quantity */}
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

            {/* Price */}
            <div className="text-right">
              <p className="font-bold text-red-600">
                {(item.deal.salePrice * item.quantity).toFixed(2)} $
              </p>
            </div>

            {/* Remove */}
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
      <div className="mt-6 bg-white rounded-xl shadow-sm border p-4 flex justify-between items-center">
        <span className="text-gray-600 font-medium">
          Total estimé ({items.reduce((s, i) => s + i.quantity, 0)} article
          {items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''})
        </span>
        <span className="text-2xl font-bold text-gray-900">{total.toFixed(2)} $</span>
      </div>
    </div>
  );
}
