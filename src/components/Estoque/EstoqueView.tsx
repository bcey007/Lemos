import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Sliders,
  AlertTriangle,
  Package,
  History,
  X,
  Check,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  ChevronDown,
} from 'lucide-react';
import { Product, StockMovement } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { EmptyState } from '../Common/EmptyState';

interface EstoqueViewProps {
  products: Product[];
  movements: StockMovement[];
  onCreateProduct: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAdjustStock: (id: string, quantityChange: number, reason: string) => Promise<void>;
}

export const EstoqueView: React.FC<EstoqueViewProps> = ({
  products,
  movements,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAdjustStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('');

  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Product Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Geral',
    unit: 'un',
    cost_price: 0,
    sale_price: 0,
    stock_quantity: 0,
    min_stock_level: 5,
    description: '',
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;

      const matchesLowStock = !onlyLowStock || Number(p.stock_quantity) <= Number(p.min_stock_level);

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [products, searchTerm, selectedCategory, onlyLowStock]);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      category: 'Geral',
      unit: 'un',
      cost_price: 0,
      sale_price: 0,
      stock_quantity: 0,
      min_stock_level: 5,
      description: '',
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      category: product.category || 'Geral',
      unit: product.unit || 'un',
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      description: product.description || '',
    });
    setIsProductModalOpen(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        category: formData.category.trim() || 'Geral',
        unit: formData.unit,
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        stock_quantity: Number(formData.stock_quantity),
        min_stock_level: Number(formData.min_stock_level),
        description: formData.description.trim(),
      });
    } else {
      await onCreateProduct({
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        category: formData.category.trim() || 'Geral',
        unit: formData.unit,
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        stock_quantity: Number(formData.stock_quantity),
        min_stock_level: Number(formData.min_stock_level),
        description: formData.description.trim(),
      });
    }

    setIsProductModalOpen(false);
  };

  const handleOpenAdjustModal = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustType('IN');
    setAdjustQuantity(1);
    setAdjustReason('Reposicao de estoque');
    setIsAdjustModalOpen(true);
  };

  const handleSubmitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || adjustQuantity <= 0) return;

    const change = adjustType === 'IN' ? adjustQuantity : -adjustQuantity;
    await onAdjustStock(adjustingProduct.id, change, adjustReason);
    setIsAdjustModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deletingProductId) {
      await onDeleteProduct(deletingProductId);
      setDeletingProductId(null);
    }
  };

  // Profit margin calculation for form
  const computedMargin = useMemo(() => {
    if (formData.sale_price <= 0) return 0;
    const profit = formData.sale_price - formData.cost_price;
    return (profit / formData.sale_price) * 100;
  }, [formData.cost_price, formData.sale_price]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Controle de Estoque
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastre, edite e monitore o inventário de mercadorias em tempo real
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMovementsModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>Histórico de Movimentações</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome do produto ou SKU/código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-medium text-slate-300 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Low stock toggle */}
          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
              onlyLowStock
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-semibold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${onlyLowStock ? 'text-rose-400' : 'text-slate-500'}`} />
            <span>Apenas Estoque Baixo</span>
          </button>
        </div>
      </div>

      {/* Main Table or Empty State */}
      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Você ainda não possui produtos cadastrados"
          description="Cadastre seus produtos para gerenciar quantidades, preços de custo e venda, e acompanhar alertas de estoque mínimo."
          actionLabel="Cadastrar Novo Produto"
          onAction={handleOpenCreateModal}
        />
      ) : filteredProducts.length === 0 ? (
        <div className="bg-slate-900 p-8 text-center rounded-3xl border border-slate-800">
          <p className="text-sm font-semibold text-slate-300">Nenhum produto encontrado com os filtros aplicados.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
              setOnlyLowStock(false);
            }}
            className="mt-3 px-4 py-2 text-xs font-medium text-indigo-400 bg-indigo-600/20 border border-indigo-500/30 rounded-xl hover:bg-indigo-600/30 cursor-pointer transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Produto / SKU</th>
                  <th className="py-3 px-4 font-semibold">Categoria</th>
                  <th className="py-3 px-4 font-semibold">Preço Custo</th>
                  <th className="py-3 px-4 font-semibold">Preço Venda</th>
                  <th className="py-3 px-4 font-semibold">Margem</th>
                  <th className="py-3 px-4 font-semibold">Qtd. Estoque</th>
                  <th className="py-3 px-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.map((product) => {
                  const isLow = Number(product.stock_quantity) <= Number(product.min_stock_level);
                  const margin =
                    product.sale_price > 0
                      ? ((product.sale_price - product.cost_price) / product.sale_price) * 100
                      : 0;

                  return (
                    <tr key={product.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white text-sm">{product.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {product.sku ? `SKU: ${product.sku}` : 'Sem código'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                          {product.category || 'Geral'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-medium">
                        {formatCurrency(product.cost_price)}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white">
                        {formatCurrency(product.sale_price)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                          {margin.toFixed(0)}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-bold text-sm ${
                              isLow ? 'text-rose-400' : 'text-white'
                            }`}
                          >
                            {product.stock_quantity} {product.unit}
                          </span>
                          {isLow && (
                            <span
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              title={`Abaixo do mínimo (${product.min_stock_level} ${product.unit})`}
                            >
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Mínimo</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenAdjustModal(product)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-600/20 rounded-lg transition-colors cursor-pointer"
                            title="Ajustar estoque (Entrada/Saída)"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Editar produto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeletingProductId(product.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Excluir produto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-semibold text-base">
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Camiseta Algodão M, Café 500g, Furadeira 110V..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Código / SKU
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PROD-001"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Roupas, Alimentos..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Unidade
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="un">un (Unidade)</option>
                    <option value="kg">kg (Quilo)</option>
                    <option value="l">l (Litro)</option>
                    <option value="cx">cx (Caixa)</option>
                    <option value="pct">pct (Pacote)</option>
                    <option value="m">m (Metro)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) =>
                      setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sale_price}
                    onChange={(e) =>
                      setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 text-xs font-bold text-white rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* Live profit calculation preview */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Margem Bruta Estimada:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {computedMargin.toFixed(1)}% (R$ {(formData.sale_price - formData.cost_price).toFixed(2)})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Estoque Atual
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, stock_quantity: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 text-xs font-bold text-white rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) =>
                      setFormData({ ...formData, min_stock_level: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes adicionais do item..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {isAdjustModalOpen && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-semibold text-base">Ajuste de Estoque</h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjust} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <p className="font-semibold text-white text-sm">{adjustingProduct.name}</p>
                <p className="text-slate-400">
                  Estoque Atual: <strong className="text-white">{adjustingProduct.stock_quantity} {adjustingProduct.unit}</strong>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Tipo de Movimentação
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustType('IN')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                      adjustType === 'IN'
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
                    <span>Entrada (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('OUT')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                      adjustType === 'OUT'
                        ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <ArrowDown className="w-4 h-4" />
                    <span>Saída (-)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 text-sm font-bold text-white rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Motivo / Justificativa
                </label>
                <input
                  type="text"
                  placeholder="Ex: Reposição de fornecedor, Contagem física, Avaria..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-400 hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl cursor-pointer shadow-sm"
                >
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOVEMENTS HISTORY MODAL */}
      {isMovementsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
            <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-base">Histórico de Movimentações de Estoque</h3>
              </div>
              <button
                onClick={() => setIsMovementsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {movements.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="space-y-3 text-xs">
                  {movements.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white">{m.product_name}</div>
                        <div className="text-slate-400 text-[11px]">
                          {m.reason || 'Movimentação sem justificativa'} • {formatDate(m.created_at)}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs ${
                            m.type === 'IN' || m.type === 'CANCEL'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {m.type === 'IN' || m.type === 'CANCEL' ? '+' : '-'}
                          {m.quantity}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {m.previous_stock} &rarr; {m.new_stock}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsMovementsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-800 animate-fade-in text-xs">
            <h3 className="text-sm font-bold text-white">Excluir Produto?</h3>
            <p className="text-slate-400">
              Tem certeza que deseja remover este produto do estoque? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDeletingProductId(null)}
                className="px-3.5 py-2 font-medium text-slate-400 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl cursor-pointer shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
