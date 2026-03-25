const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ApiDeal {
  id: string;
  name: string;
  brand?: string;
  store_id: string;
  store_name: string;
  color: string;
  text_color: string;
  category_id: string;
  category_label: string;
  emoji: string;
  regular_price: number;
  sale_price: number;
  unit: string;
  valid_until: string;
  image_emoji: string;
  loyalty_points: number;
  saving_pct: number;
  saving_amount: number;
}

export const fetchDeals = async (params?: {
  store?: string;
  category?: string;
  sort?: string;
  search?: string;
}): Promise<ApiDeal[]> => {
  const searchParams = new URLSearchParams();
  if (params?.store)    searchParams.set('store',    params.store);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.sort)     searchParams.set('sort',     params.sort);
  if (params?.search)   searchParams.set('search',   params.search);

  const response = await fetch(`${API_URL}/api/deals?${searchParams}`);
  if (!response.ok) throw new Error('Erreur API');
  const data = await response.json();
  return data.data;
};

export const fetchStats = async () => {
  const response = await fetch(`${API_URL}/api/deals/stats`);
  if (!response.ok) throw new Error('Erreur API');
  const data = await response.json();
  return data.data;
};
