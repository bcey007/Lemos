import React from 'react';
import { LayoutDashboard, Package, ShoppingCart, Database, PlusCircle, Layers } from 'lucide-react';
import { SupabaseConfig } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'estoque' | 'vendas';
  setActiveTab: (tab: 'dashboard' | 'estoque' | 'vendas') => void;
  supabaseConfig: SupabaseConfig;
  onOpenSupabaseModal: () => void;
  onQuickNewSale: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  supabaseConfig,
  onOpenSupabaseModal,
  onQuickNewSale,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-2">
                OmniFlux <span className="text-indigo-400 font-normal text-xs sm:text-sm">Gestão & Vendas</span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">Painel bento grid para controle de estoque e vendas</p>
            </div>
          </div>

          {/* Center Nav Tabs */}
          <nav className="flex space-x-1 sm:space-x-2 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('estoque')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'estoque'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Estoque</span>
            </button>

            <button
              onClick={() => setActiveTab('vendas')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'vendas'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Vendas</span>
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Supabase Status Pill */}
            <button
              onClick={onOpenSupabaseModal}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                supabaseConfig.isConnected
                  ? 'bg-indigo-950/40 text-emerald-400 border-emerald-500/30 hover:bg-indigo-900/40'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
              }`}
              title="Clique para configurar o banco de dados Supabase"
            >
              <span className="relative flex h-2 w-2">
                {supabaseConfig.isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                )}
              </span>
              <Database className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              <span className="hidden md:inline">
                {supabaseConfig.isConnected ? 'Supabase Conectado' : 'Configurar Supabase'}
              </span>
              <span className="md:hidden">
                {supabaseConfig.isConnected ? 'Supabase' : 'BD Local'}
              </span>
            </button>

            {/* Quick New Sale CTA */}
            <button
              onClick={onQuickNewSale}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Venda</span>
              <span className="sm:hidden">PDV</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
