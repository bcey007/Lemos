export const SUPABASE_SQL_SCRIPT = `-- ==========================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS NO SUPABASE
-- Sistema de Controle de Vendas e Estoque
-- Execute este script no 'SQL Editor' do Supabase
-- ==========================================

-- 1. Tabela de Produtos (Estoque)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  cost_price NUMERIC(10, 2) DEFAULT 0.00,
  sale_price NUMERIC(10, 2) DEFAULT 0.00,
  stock_quantity NUMERIC(10, 2) DEFAULT 0,
  min_stock_level NUMERIC(10, 2) DEFAULT 5,
  unit TEXT DEFAULT 'un',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Vendas
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  customer_name TEXT,
  customer_phone TEXT,
  payment_method TEXT DEFAULT 'DINHEIRO',
  subtotal NUMERIC(10, 2) DEFAULT 0.00,
  discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  total_amount NUMERIC(10, 2) DEFAULT 0.00,
  total_cost NUMERIC(10, 2) DEFAULT 0.00,
  profit NUMERIC(10, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'COMPLETED',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Itens da Venda
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit_price NUMERIC(10, 2) DEFAULT 0.00,
  cost_price NUMERIC(10, 2) DEFAULT 0.00,
  subtotal NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'IN', 'OUT', 'SALE', 'CANCEL', 'ADJUSTMENT'
  quantity NUMERIC(10, 2) DEFAULT 0,
  previous_stock NUMERIC(10, 2) DEFAULT 0,
  new_stock NUMERIC(10, 2) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurar RLS (Row Level Security) para permitir leitura e escrita pública (anon)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso Total para Anon em Produtos" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Total para Anon em Vendas" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Total para Anon em Itens de Vendas" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Total para Anon em Movimentações" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
`;
