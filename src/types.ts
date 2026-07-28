export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock_level: number;
  unit: string; // 'un', 'kg', 'l', 'cx', 'pct', 'm', 'g'
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  subtotal: number;
}

export type PaymentMethod = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'BOLETO' | 'OUTRO';

export interface Sale {
  id: string;
  sale_date: string;
  customer_name?: string;
  customer_phone?: string;
  payment_method: PaymentMethod;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  total_cost: number;
  profit: number;
  status: 'COMPLETED' | 'CANCELED';
  notes?: string;
  items: SaleItem[];
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  type: 'IN' | 'OUT' | 'SALE' | 'CANCEL' | 'ADJUSTMENT';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  created_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export type DateFilter = 'today' | '7days' | '30days' | 'this_month' | 'all';
