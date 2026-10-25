export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  material: string;
  image_url: string; // portada (siempre = images[0])
  images?: string[]; // galería JSON; la primera es la portada
  featured: boolean;
  stock: number;
  unlimited_stock?: boolean; // true = sin límite de unidades (migración 017)
  active?: boolean; // false = pausado, no se muestra en la tienda
  discount_percent?: number | null; // promoción: 1–90 (migración 011)
  promo_start?: string | null; // inicio opcional
  promo_end?: string | null; // fin opcional
  created_at?: string;
};

export type Category = {
  id: string;
  name: string;
  position: number;
  active: boolean;
  tagline?: string | null; // frase de la colección (migración 013)
  image_url?: string | null; // foto de la colección
  created_at?: string;
};

export type CartItem = {
  product: Product;
  qty: number;
};

export type Order = {
  id: string;
  order_number?: number | null; // correlativo (migración 007)
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes?: string | null;
  items: { id: string; name: string; price: number; qty: number }[];
  total: number;
  status: string;
  created_at: string;
};