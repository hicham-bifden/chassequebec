export type Store = 'IGA' | 'Maxi' | 'Metro' | 'Super C' | 'Costco';

export type Category =
  | 'Fruits & Légumes'
  | 'Viandes'
  | 'Produits laitiers'
  | 'Épicerie'
  | 'Surgelés'
  | 'Boulangerie'
  | 'Boissons';

export interface Deal {
  id: string;
  name: string;
  store: Store;
  category: Category;
  regularPrice: number;
  salePrice: number;
  unit: string;
  imageUrl?: string;
  productUrl?: string;
  validUntil: string; // ISO date string
}

export interface CartItem {
  deal: Deal;
  quantity: number;
  checked: boolean;
}

export interface DealFilters {
  storeId: string;
  categoryId: string;
  sortBy: string;
  search?: string;
}
