CREATE TABLE stores (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50),
  text_color VARCHAR(50)
);

CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  emoji VARCHAR(10)
);

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  store_id VARCHAR(50) REFERENCES stores(id),
  category_id VARCHAR(50) REFERENCES categories(id),
  regular_price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50),
  valid_until DATE,
  image_emoji VARCHAR(10),
  loyalty_points INTEGER DEFAULT 0,
  scraped_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_name VARCHAR(200),
  store_id VARCHAR(50),
  price DECIMAL(10,2),
  recorded_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO stores VALUES
  ('iga', 'IGA', 'bg-red-100', 'text-red-700'),
  ('metro', 'Metro', 'bg-teal-100', 'text-teal-700'),
  ('maxi', 'Maxi', 'bg-yellow-100', 'text-yellow-800'),
  ('provigo', 'Provigo', 'bg-green-100', 'text-green-700'),
  ('superc', 'Super C', 'bg-orange-100', 'text-orange-700'),
  ('costco', 'Costco', 'bg-blue-100', 'text-blue-700'),
  ('jeancoutu', 'Jean Coutu', 'bg-red-100', 'text-red-800'),
  ('canadiantire', 'Canadian Tire', 'bg-red-100', 'text-red-900'),
  ('dollarama', 'Dollarama', 'bg-purple-100', 'text-purple-700');

INSERT INTO categories VALUES
  ('viande', 'Viandes', '🥩'),
  ('fruits-legumes', 'Fruits & légumes', '🥦'),
  ('produits-laitiers', 'Produits laitiers', '🧀'),
  ('epicerie', 'Épicerie', '🥫'),
  ('hygiene', 'Hygiène', '🧴'),
  ('maison', 'Maison', '🏠'),
  ('boulangerie', 'Boulangerie', '🍞'),
  ('boissons', 'Boissons', '🧃'),
  ('surgeles', 'Surgelés', '🧊');
