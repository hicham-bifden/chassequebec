import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Deal, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (deal: Deal) => void;
  removeItem: (dealId: string) => void;
  toggleChecked: (dealId: string) => void;
  updateQuantity: (dealId: string, quantity: number) => void;
  clearChecked: () => void;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (deal: Deal) => {
    setItems(prev => {
      const existing = prev.find(i => i.deal.id === deal.id);
      if (existing) {
        return prev.map(i =>
          i.deal.id === deal.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { deal, quantity: 1, checked: false }];
    });
  };

  const removeItem = (dealId: string) => {
    setItems(prev => prev.filter(i => i.deal.id !== dealId));
  };

  const toggleChecked = (dealId: string) => {
    setItems(prev =>
      prev.map(i =>
        i.deal.id === dealId ? { ...i, checked: !i.checked } : i
      )
    );
  };

  const updateQuantity = (dealId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(dealId);
      return;
    }
    setItems(prev =>
      prev.map(i => (i.deal.id === dealId ? { ...i, quantity } : i))
    );
  };

  const clearChecked = () => {
    setItems(prev => prev.filter(i => !i.checked));
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        toggleChecked,
        updateQuantity,
        clearChecked,
        totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
