import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/Dashboard/DashboardView';
import { EstoqueView } from './components/Estoque/EstoqueView';
import { VendasView } from './components/Vendas/VendasView';
import { SupabaseModal } from './components/SupabaseModal';
import { Product, Sale, StockMovement, SupabaseConfig, PaymentMethod } from './types';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustProductStock,
  fetchSales,
  createSale,
  cancelSale,
  fetchStockMovements,
} from './lib/storage';
import { getStoredSupabaseConfig } from './lib/supabase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'estoque' | 'vendas'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    url: '',
    anonKey: '',
    isConnected: false,
  });
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const config = getStoredSupabaseConfig();
      setSupabaseConfig(config);

      const [prodsData, salesData, movementsData] = await Promise.all([
        fetchProducts(),
        fetchSales(),
        fetchStockMovements(),
      ]);

      setProducts(prodsData);
      setSales(salesData);
      setMovements(movementsData);
    } catch (err) {
      console.error('Error loading application data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Product CRUD
  const handleCreateProduct = async (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    await createProduct(data);
    await loadData();
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    await updateProduct(id, updates);
    await loadData();
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
    await loadData();
  };

  const handleAdjustStock = async (id: string, quantityChange: number, reason: string) => {
    await adjustProductStock(id, quantityChange, reason);
    await loadData();
  };

  // Sales CRUD
  const handleCreateSale = async (saleData: {
    customer_name?: string;
    customer_phone?: string;
    payment_method: PaymentMethod;
    discount_amount: number;
    notes?: string;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      cost_price: number;
    }>;
  }) => {
    const created = await createSale(saleData);
    await loadData();
    return created;
  };

  const handleCancelSale = async (saleId: string) => {
    await cancelSale(saleId);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans antialiased flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        supabaseConfig={supabaseConfig}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onQuickNewSale={() => setActiveTab('vendas')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium tracking-wide">Carregando dados do sistema...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                products={products}
                sales={sales}
                onGoToEstoque={() => setActiveTab('estoque')}
                onGoToVendas={() => setActiveTab('vendas')}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'estoque' && (
              <EstoqueView
                products={products}
                movements={movements}
                onCreateProduct={handleCreateProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onAdjustStock={handleAdjustStock}
              />
            )}

            {activeTab === 'vendas' && (
              <VendasView
                products={products}
                sales={sales}
                onCreateSale={handleCreateSale}
                onCancelSale={handleCancelSale}
                onGoToEstoque={() => setActiveTab('estoque')}
              />
            )}
          </>
        )}
      </main>

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigUpdated={loadData}
      />
    </div>
  );
}
