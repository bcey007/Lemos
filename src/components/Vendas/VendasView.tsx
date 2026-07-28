import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Search,
  User,
  Phone,
  CreditCard,
  Printer,
  X,
  XCircle,
  Eye,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Product, Sale, PaymentMethod } from '../../types';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '../../lib/formatters';
import { EmptyState } from '../Common/EmptyState';

interface VendasViewProps {
  products: Product[];
  sales: Sale[];
  onCreateSale: (saleData: {
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
  }) => Promise<Sale>;
  onCancelSale: (saleId: string) => Promise<void>;
  onGoToEstoque: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
}

export const VendasView: React.FC<VendasViewProps> = ({
  products,
  sales,
  onCreateSale,
  onCancelSale,
  onGoToEstoque,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pdv' | 'historico'>('pdv');

  // PDV State
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [saleNotes, setSaleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSaleReceipt, setCompletedSaleReceipt] = useState<Sale | null>(null);

  // History State
  const [historySearch, setHistorySearch] = useState('');
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [cancelingSaleId, setCancelingSaleId] = useState<string | null>(null);

  // Filter available products for POS search
  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()));
      return matchSearch;
    });
  }, [products, productSearch]);

  // Add item to cart
  const handleAddToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    const currentQtyInCart = existingIndex !== -1 ? cart[existingIndex].quantity : 0;

    if (currentQtyInCart + 1 > product.stock_quantity) {
      alert(`Quantidade em estoque insuficiente para ${product.name}. Estoque atual: ${product.stock_quantity} ${product.unit}`);
      return;
    }

    if (existingIndex !== -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1, unit_price: product.sale_price }]);
    }
  };

  const handleUpdateCartQuantity = (productId: string, newQty: number) => {
    const target = cart.find((i) => i.product.id === productId);
    if (!target) return;

    if (newQty > target.product.stock_quantity) {
      alert(`Quantidade selecionada excede o estoque disponível (${target.product.stock_quantity} ${target.product.unit}).`);
      return;
    }

    if (newQty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    setCart(cart.map((item) => (item.product.id === productId ? { ...item, quantity: newQty } : item)));
  };

  const handleUpdateCartUnitPrice = (productId: string, price: number) => {
    setCart(
      cart.map((item) => (item.product.id === productId ? { ...item, unit_price: Math.max(0, price) } : item))
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  // Totals calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  }, [cart]);

  const cartTotalCost = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity * item.product.cost_price, 0);
  }, [cart]);

  const cartTotalAmount = Math.max(0, cartSubtotal - (discountAmount || 0));
  const cartProfit = cartTotalAmount - cartTotalCost;

  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      alert('Selecione ao menos um produto para finalizar a venda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await onCreateSale({
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        payment_method: paymentMethod,
        discount_amount: discountAmount || 0,
        notes: saleNotes.trim() || undefined,
        items: cart.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.product.cost_price,
        })),
      });

      // Clear POS state and show receipt modal
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscountAmount(0);
      setSaleNotes('');
      setCompletedSaleReceipt(created);
    } catch (err: any) {
      alert('Erro ao registrar a venda: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter History Sales
  const filteredSalesHistory = useMemo(() => {
    return sales.filter((s) => {
      const matchText =
        s.id.toLowerCase().includes(historySearch.toLowerCase()) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(historySearch.toLowerCase())) ||
        s.items?.some((i) => i.product_name.toLowerCase().includes(historySearch.toLowerCase()));
      return matchText;
    });
  }, [sales, historySearch]);

  const handleCancelSaleConfirm = async () => {
    if (cancelingSaleId) {
      await onCancelSale(cancelingSaleId);
      setCancelingSaleId(null);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Section & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Módulo de Vendas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registre novas vendas, dê baixa automática no estoque e consulte o histórico
          </p>
        </div>

        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('pdv')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'pdv'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-indigo-200" />
            <span>Ponto de Venda (PDV)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('historico')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'historico'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Histórico de Vendas ({sales.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'pdv' ? (
        /* POS SCREEN (PDV) */
        products.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Sua loja ainda não possui produtos cadastrados"
            description="Para realizar uma venda, você precisa primeiro cadastrar os itens no módulo de Estoque."
            actionLabel="Cadastrar Produtos no Estoque"
            onAction={onGoToEstoque}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: Product Catalog Selection (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-sm space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Pesquisar produto pelo nome ou SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Selecione os itens ({availableProducts.length})
                </div>

                {availableProducts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Nenhum produto encontrado com este nome.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                    {availableProducts.map((prod) => {
                      const outOfStock = Number(prod.stock_quantity) <= 0;
                      const inCart = cart.find((i) => i.product.id === prod.id);

                      return (
                        <div
                          key={prod.id}
                          onClick={() => !outOfStock && handleAddToCart(prod)}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                            outOfStock
                              ? 'bg-slate-950/40 border-slate-800/60 opacity-50 cursor-not-allowed'
                              : inCart
                              ? 'bg-indigo-950/40 border-indigo-500/50 shadow-xs hover:border-indigo-400 cursor-pointer'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950 cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between">
                              <span className="font-semibold text-white text-xs line-clamp-2">
                                {prod.name}
                              </span>
                              {inCart && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-[10px] shrink-0 ml-1">
                                  {inCart.quantity}x
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {prod.sku || 'Sem SKU'}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                            <div>
                              <p className="text-xs font-bold text-white">
                                {formatCurrency(prod.sale_price)}
                              </p>
                              <p className={`text-[10px] ${outOfStock ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                                {outOfStock
                                  ? 'Sem Estoque'
                                  : `Estoque: ${prod.stock_quantity} ${prod.unit}`}
                              </p>
                            </div>

                            <button
                              disabled={outOfStock}
                              className={`p-1.5 rounded-xl transition-colors ${
                                outOfStock
                                  ? 'bg-slate-800 text-slate-500'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Cart & Checkout Form (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-sm">Carrinho de Compras</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {cart.reduce((acc, i) => acc + i.quantity, 0)} itens
                  </span>
                </div>

                {/* Cart Items List */}
                <div className="p-4 space-y-3 max-h-72 overflow-y-auto border-b border-slate-800 text-xs">
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      <p className="font-medium text-slate-400">Carrinho vazio</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Clique nos produtos ao lado para adicionar à venda.
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-xs truncate">
                            {item.product.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Unidade: {formatCurrency(item.unit_price)}
                          </p>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                          <button
                            onClick={() => handleUpdateCartQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-white px-1 text-xs">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateCartQuantity(item.product.id, item.quantity + 1)}
                            className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right min-w-[70px]">
                          <p className="font-bold text-white text-xs">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </p>
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Customer & Checkout Controls */}
                <div className="p-4 space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <User className="w-3 h-3" /> Cliente (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Nome do cliente"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Telefone
                      </label>
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'BOLETO', 'OUTRO'] as PaymentMethod[]).map(
                        (pm) => (
                          <button
                            key={pm}
                            type="button"
                            onClick={() => setPaymentMethod(pm)}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-colors cursor-pointer text-center ${
                              paymentMethod === pm
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {PAYMENT_METHOD_LABELS[pm]}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <label className="text-slate-400 font-semibold text-xs shrink-0">Desconto (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-28 px-3 py-1 text-xs font-bold text-right rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  {/* Order Financial Summary */}
                  <div className="bg-slate-950 text-white p-4 rounded-2xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(cartSubtotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-400">
                        <span>Desconto:</span>
                        <span>- {formatCurrency(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-bold text-white pt-1.5 border-t border-slate-800">
                      <span>Total a Pagar:</span>
                      <span className="text-indigo-400">{formatCurrency(cartTotalAmount)}</span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                      <span>Lucro estimado nesta venda:</span>
                      <span className="text-emerald-400 font-medium">{formatCurrency(cartProfit)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleFinalizeSale}
                    disabled={cart.length === 0 || isSubmitting}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isSubmitting ? 'Finalizando Venda...' : 'Finalizar Venda'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        /* HISTORY SCREEN */
        sales.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Nenhuma venda registrada até o momento"
            description="Todas as vendas finalizadas no Ponto de Venda ficarão salvas no seu histórico."
            actionLabel="Ir para Ponto de Venda"
            onAction={() => setActiveSubTab('pdv')}
          />
        ) : (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por ID da venda, cliente ou nome do produto..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <th className="py-3 px-4 font-semibold">Cód / Data</th>
                    <th className="py-3 px-4 font-semibold">Cliente</th>
                    <th className="py-3 px-4 font-semibold">Pagamento</th>
                    <th className="py-3 px-4 font-semibold">Itens</th>
                    <th className="py-3 px-4 font-semibold">Total</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSalesHistory.map((sale) => {
                    const isCanceled = sale.status === 'CANCELED';
                    return (
                      <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-xs font-bold text-white">
                            #{sale.id.substring(0, 8)}
                          </div>
                          <div className="text-[11px] text-slate-500">{formatDate(sale.sale_date)}</div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {sale.customer_name || 'Consumidor Final'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                            {PAYMENT_METHOD_LABELS[sale.payment_method] || sale.payment_method}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400">
                          {sale.items?.length || 0} {sale.items?.length === 1 ? 'item' : 'itens'}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-white">
                          {formatCurrency(sale.total_amount)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isCanceled
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {isCanceled ? 'Cancelada' : 'Concluída'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setViewingSale(sale)}
                              className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-600/20 rounded-lg cursor-pointer transition-colors"
                              title="Ver recibo / detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {!isCanceled && (
                              <button
                                onClick={() => setCancelingSaleId(sale.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg cursor-pointer transition-colors"
                                title="Cancelar venda e devolução de estoque"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* COMPLETED SALE RECEIPT MODAL */}
      {(completedSaleReceipt || viewingSale) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden animate-fade-in text-xs">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-base">Comprovante de Venda</h3>
              </div>
              <button
                onClick={() => {
                  setCompletedSaleReceipt(null);
                  setViewingSale(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Body */}
            {(() => {
              const target = completedSaleReceipt || viewingSale;
              if (!target) return null;

              return (
                <div className="p-6 space-y-4">
                  <div className="text-center border-b border-dashed border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-sm uppercase tracking-tight">
                      GestãoPro Vendas
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Venda #{target.id.substring(0, 8)} • {formatDate(target.sale_date)}
                    </p>
                    {target.customer_name && (
                      <p className="text-[11px] text-indigo-300 font-semibold mt-1">
                        Cliente: {target.customer_name} {target.customer_phone ? `(${target.customer_phone})` : ''}
                      </p>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                      Itens Comprados:
                    </p>
                    <div className="divide-y divide-slate-800/80 max-h-48 overflow-y-auto pr-1">
                      {target.items?.map((item, idx) => (
                        <div key={idx} className="py-2 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-semibold text-slate-200">{item.product_name}</p>
                            <p className="text-[10px] text-slate-500">
                              {item.quantity}x {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                          <span className="font-bold text-white">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(target.subtotal)}</span>
                    </div>

                    {target.discount_amount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-medium">
                        <span>Desconto:</span>
                        <span>- {formatCurrency(target.discount_amount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-slate-800">
                      <span>Total Pago:</span>
                      <span className="text-indigo-400">{formatCurrency(target.total_amount)}</span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>Forma de Pagamento:</span>
                      <span className="font-semibold text-slate-200">
                        {PAYMENT_METHOD_LABELS[target.payment_method] || target.payment_method}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handlePrintReceipt}
                      className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-700/60"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir Recibo</span>
                    </button>

                    <button
                      onClick={() => {
                        setCompletedSaleReceipt(null);
                        setViewingSale(null);
                      }}
                      className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Concluído
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* CANCEL SALE CONFIRMATION MODAL */}
      {cancelingSaleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-800 animate-fade-in text-xs">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Cancelar Venda?</h3>
            </div>
            <p className="text-slate-400">
              O cancelamento irá alterar o status da venda e devolver automaticamente os produtos ao estoque. Deseja continuar?
            </p>
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setCancelingSaleId(null)}
                className="px-3.5 py-2 font-medium text-slate-400 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Manter Venda
              </button>
              <button
                onClick={handleCancelSaleConfirm}
                className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl cursor-pointer shadow-sm"
              >
                Sim, Cancelar Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
