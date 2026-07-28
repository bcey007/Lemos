import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  Receipt,
  Download,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Product, Sale, DateFilter } from '../../types';
import { formatCurrency, formatNumber, formatDate, PAYMENT_METHOD_LABELS } from '../../lib/formatters';
import { EmptyState } from '../Common/EmptyState';

interface DashboardViewProps {
  products: Product[];
  sales: Sale[];
  onGoToEstoque: () => void;
  onGoToVendas: () => void;
  onRefresh: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  sales,
  onGoToEstoque,
  onGoToVendas,
  onRefresh,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');

  // Filter sales based on date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    const completedSales = sales.filter((s) => s.status === 'COMPLETED');

    if (dateFilter === 'all') return completedSales;

    const filterDate = new Date();
    if (dateFilter === 'today') {
      filterDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === '7days') {
      filterDate.setDate(now.getDate() - 7);
    } else if (dateFilter === '30days') {
      filterDate.setDate(now.getDate() - 30);
    } else if (dateFilter === 'this_month') {
      filterDate.setDate(1);
      filterDate.setHours(0, 0, 0, 0);
    }

    return completedSales.filter((s) => new Date(s.sale_date) >= filterDate);
  }, [sales, dateFilter]);

  // Key KPI Calculations
  const totalRevenue = useMemo(
    () => filteredSales.reduce((acc, s) => acc + (s.total_amount || 0), 0),
    [filteredSales]
  );

  const totalProfit = useMemo(
    () => filteredSales.reduce((acc, s) => acc + (s.profit || 0), 0),
    [filteredSales]
  );

  const totalSalesCount = filteredSales.length;

  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  const totalStockCostValue = useMemo(
    () => products.reduce((acc, p) => acc + p.stock_quantity * p.cost_price, 0),
    [products]
  );

  const totalStockSaleValue = useMemo(
    () => products.reduce((acc, p) => acc + p.stock_quantity * p.sale_price, 0),
    [products]
  );

  const lowStockProducts = useMemo(
    () => products.filter((p) => Number(p.stock_quantity) <= Number(p.min_stock_level)),
    [products]
  );

  // Chart 1: Revenue over time
  const timelineData = useMemo(() => {
    if (filteredSales.length === 0) return [];

    const map: Record<string, { dateStr: string; faturamento: number; lucro: number }> = {};

    // Group sales by day
    const sorted = [...filteredSales].sort(
      (a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()
    );

    sorted.forEach((sale) => {
      const d = new Date(sale.sale_date);
      const key = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;

      if (!map[key]) {
        map[key] = { dateStr: key, faturamento: 0, lucro: 0 };
      }
      map[key].faturamento += sale.total_amount || 0;
      map[key].lucro += sale.profit || 0;
    });

    return Object.values(map);
  }, [filteredSales]);

  // Chart 2: Sales by Payment Method
  const paymentMethodData = useMemo(() => {
    if (filteredSales.length === 0) return [];

    const map: Record<string, number> = {};
    filteredSales.forEach((s) => {
      const method = PAYMENT_METHOD_LABELS[s.payment_method] || s.payment_method;
      map[method] = (map[method] || 0) + (s.total_amount || 0);
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  // Top Selling Products
  const topProductsData = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};

    filteredSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        if (!map[item.product_id]) {
          map[item.product_id] = { name: item.product_name, quantity: 0, revenue: 0 };
        }
        map[item.product_id].quantity += Number(item.quantity);
        map[item.product_id].revenue += Number(item.subtotal);
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  const handleExportCSV = () => {
    if (filteredSales.length === 0 && products.length === 0) {
      alert('Não há dados cadastrados para exportar no relatório.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'RELATÓRIO DE VENDAS E ESTOQUE\n\n';
    csvContent += `Faturamento Total:;${formatCurrency(totalRevenue)}\n`;
    csvContent += `Lucro Estimado:;${formatCurrency(totalProfit)}\n`;
    csvContent += `Total de Vendas:;${totalSalesCount}\n`;
    csvContent += `Valor do Estoque (Custo):;${formatCurrency(totalStockCostValue)}\n\n`;

    csvContent += 'HISTÓRICO DE VENDAS NO PERÍODO\n';
    csvContent += 'ID Venda;Data;Cliente;Forma de Pagamento;Total (R$);Lucro (R$)\n';

    filteredSales.forEach((s) => {
      csvContent += `${s.id};${formatDate(s.sale_date)};${s.customer_name || 'Consumidor'};${
        PAYMENT_METHOD_LABELS[s.payment_method] || s.payment_method
      };${s.total_amount.toFixed(2)};${s.profit.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasData = products.length > 0 || sales.length > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Date Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Visão Geral do Painel
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas consolidadas do inventário e desempenho comercial
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                dateFilter === '7days'
                  ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setDateFilter('30days')}
              className={`px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                dateFilter === '30days'
                  ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setDateFilter('this_month')}
              className={`px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                dateFilter === 'this_month'
                  ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tudo
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="p-2.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Nenhuma informação cadastrada no sistema"
          description="Seu dashboard mostrará automaticamente os gráficos e relatórios assim que você cadastrar seus produtos na tela de Estoque e registrar suas vendas."
          actionLabel="Cadastrar Primeiro Produto"
          onAction={onGoToEstoque}
          secondaryActionLabel="Ir para Tela de Vendas"
          onSecondaryAction={onGoToVendas}
        />
      ) : (
        <>
          {/* Key Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1: Revenue */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Receita Bruta
                </span>
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {formatCurrency(totalRevenue)}
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-slate-500" />
                  {totalSalesCount} {totalSalesCount === 1 ? 'venda realizada' : 'vendas realizadas'}
                </p>
              </div>
            </div>

            {/* KPI 2: Profit */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Lucro Estimado
                </span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {formatCurrency(totalProfit)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Ticket Médio: <strong className="text-slate-200">{formatCurrency(averageTicket)}</strong>
                </p>
              </div>
            </div>

            {/* KPI 3: Total Stock Value */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Valor em Estoque
                </span>
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {formatCurrency(totalStockCostValue)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Valor de Venda: <strong className="text-slate-200">{formatCurrency(totalStockSaleValue)}</strong>
                </p>
              </div>
            </div>

            {/* KPI 4: Low Stock Alert */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Alertas Críticos
                </span>
                <div
                  className={`p-2 rounded-xl ${
                    lowStockProducts.length > 0
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {lowStockProducts.length}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    {lowStockProducts.length === 1 ? 'produto baixo' : 'produtos baixos'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {lowStockProducts.length > 0
                    ? 'Reposição recomendada'
                    : 'Nível seguro de estoque'}
                </p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Timeline Chart (2 Cols) */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white uppercase text-xs tracking-widest">Fluxo do Faturamento e Lucro</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Evolução diária das vendas no período</p>
                </div>
              </div>

              {timelineData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                  <ShoppingBag className="w-8 h-8 mb-2 stroke-[1.5] text-slate-600" />
                  <p className="text-xs text-slate-400 font-medium">Nenhuma venda registrada no período selecionado.</p>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickFormatter={(val) => `R$${val}`}
                      />
                      <Tooltip
                        formatter={(val: any) => [formatCurrency(Number(val)), '']}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #334155', fontSize: '12px', color: '#f8fafc' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
                      <Area
                        type="monotone"
                        dataKey="faturamento"
                        name="Faturamento"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorFaturamento)"
                      />
                      <Area
                        type="monotone"
                        dataKey="lucro"
                        name="Lucro"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorLucro)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Payment Method Pie Chart (1 Col) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="font-bold text-white uppercase text-xs tracking-widest flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-indigo-400" />
                  Formas de Pagamento
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Distribuição da receita por método</p>
              </div>

              {paymentMethodData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                  <p className="text-xs text-slate-400 font-medium">Sem dados de pagamentos no período.</p>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentMethodData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [formatCurrency(Number(value)), 'Faturamento']}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #334155', fontSize: '12px', color: '#f8fafc' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Grid: Top Selling & Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Selling Products */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white uppercase text-xs tracking-widest">Produtos Mais Vendidos</h3>
                <button
                  onClick={onGoToVendas}
                  className="text-xs text-indigo-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Ver Vendas <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {topProductsData.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">Nenhum produto vendido no período.</p>
              ) : (
                <div className="space-y-3">
                  {topProductsData.map((prod, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{prod.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {prod.quantity} {prod.quantity === 1 ? 'unidade' : 'unidades'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-white">{formatCurrency(prod.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low Stock Reposição Crítica */}
            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-indigo-400 font-bold uppercase text-xs tracking-widest">Reposição Crítica</h3>
                </div>
                <button
                  onClick={onGoToEstoque}
                  className="text-xs text-indigo-300 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Gerenciar Estoque <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="py-8 text-center bg-indigo-950/40 rounded-2xl border border-indigo-500/20 p-4">
                  <p className="text-xs font-semibold text-indigo-300">
                    Estoque totalmente regularizado!
                  </p>
                  <p className="text-[11px] text-indigo-400/80 mt-0.5">
                    Todos os {products.length} produtos estão acima do estoque mínimo.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-indigo-500/20 text-indigo-300 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-2 font-medium">Produto</th>
                        <th className="py-2.5 px-2 font-medium">Atual</th>
                        <th className="py-2.5 px-2 font-medium">Mínimo</th>
                        <th className="py-2.5 px-2 font-medium text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/10">
                      {lowStockProducts.slice(0, 5).map((prod) => (
                        <tr key={prod.id} className="hover:bg-indigo-950/30 transition-colors">
                          <td className="py-2.5 px-2 font-medium text-white">
                            {prod.name}
                            <span className="block text-[10px] text-slate-400 font-mono">
                              SKU: {prod.sku || 'N/A'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-bold text-red-400">
                            {prod.stock_quantity} {prod.unit}
                          </td>
                          <td className="py-2.5 px-2 text-slate-400">
                            {prod.min_stock_level} {prod.unit}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={onGoToEstoque}
                              className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded border border-red-500/30 cursor-pointer hover:bg-red-500/30 transition-colors"
                            >
                              REPOR
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sales Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-200 font-bold uppercase text-xs tracking-widest">Últimas Vendas Processadas</h3>
              <button
                onClick={onGoToVendas}
                className="text-xs text-indigo-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                Ver Todas ({sales.length}) <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {sales.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Nenhuma venda registrada até o momento.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-tighter text-[10px]">
                      <th className="pb-2.5 px-3 font-medium">Data / Hora</th>
                      <th className="pb-2.5 px-3 font-medium">Cliente</th>
                      <th className="pb-2.5 px-3 font-medium">Pagamento</th>
                      <th className="pb-2.5 px-3 font-medium">Itens</th>
                      <th className="pb-2.5 px-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sales.slice(0, 5).map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 text-slate-400 font-mono text-xs">{formatDate(sale.sale_date)}</td>
                        <td className="py-3 px-3 font-semibold text-white">
                          {sale.customer_name || 'Consumidor Final'}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            {PAYMENT_METHOD_LABELS[sale.payment_method] || sale.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {sale.items?.length || 0} {sale.items?.length === 1 ? 'item' : 'itens'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-white">
                          {formatCurrency(sale.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
