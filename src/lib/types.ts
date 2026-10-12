export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  material: string;
  image_url: string;
  featured: boolean;
  stock: number;
  active?: boolean; // false = pausado, no se muestra en la tienda
  created_at?: string;
};

export type CartItem = {
  product: Product;
  qty: number;
};

export type Order = {
  id: string;
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
