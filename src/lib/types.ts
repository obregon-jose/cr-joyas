/** Opción de un producto (color, talla...) con fotos, stock y precio propios (migración 019). */
export type Variant = {
  id: string;
  product_id: string;
  name: string;
  color?: string | null; // muestra visual, ej. "#B76E79"
  images: string[];
  stock: number;
  unlimited_stock?: boolean;
  price?: number | null; // vacío = usa el precio del producto
  position: number;
  active?: boolean;
};

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
  variant_label?: string; // cómo se llama la opción: "Color", "Talla"... (migración 019)
  variants?: Variant[]; // opciones activas, ya ordenadas; vacío o ausente = producto simple
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
  variant_id?: string | null; // opción elegida, si el producto las tiene
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
  items: { id: string; name: string; price: number; qty: number; variant_id?: string; variant_name?: string }[];
  total: number;
  status: string;
  created_at: string;
};