import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Copy, Check, RefreshCw, X, ShieldAlert, Sparkles } from 'lucide-react';
import { getStoredSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, testSupabaseConnection, resetSupabaseClientInstance } from '../lib/supabase';
import { SUPABASE_SQL_SCRIPT } from '../lib/sqlScript';
import { syncLocalDataToSupabase } from '../lib/storage';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, onConfigUpdated }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');

  useEffect(() => {
    if (isOpen) {
      const current = getStoredSupabaseConfig();
      setUrl(current.url);
      setAnonKey(current.anonKey);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setStatusMessage(null);
    const res = await testSupabaseConnection(url, anonKey);
    setTesting(false);
    setStatusMessage({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleSave = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setStatusMessage({ type: 'error', text: 'Preencha a URL e a Chave Anon do seu projeto Supabase.' });
      return;
    }

    setTesting(true);
    const res = await testSupabaseConnection(url, anonKey);
    setTesting(false);

    saveSupabaseConfig(url, anonKey);
    resetSupabaseClientInstance();
    onConfigUpdated();

    setStatusMessage({
      type: res.success ? 'success' : 'info',
      text: res.success
        ? 'Configuração salva e conexão confirmada!'
        : 'Configuração salva. Caso ocorram erros, certifique-se de executar o script SQL no Supabase.',
    });
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    resetSupabaseClientInstance();
    setUrl('');
    setAnonKey('');
    onConfigUpdated();
    setStatusMessage({ type: 'info', text: 'Conexão do Supabase removida. O sistema funcionará com armazenamento local.' });
  };

  const handleSyncLocalData = async () => {
    setSyncing(true);
    const res = await syncLocalDataToSupabase();
    setSyncing(false);
    setStatusMessage({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    if (res.success) {
      onConfigUpdated();
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Integração com Supabase</h3>
              <p className="text-xs text-slate-400">Armazene seus dados na nuvem com segurança</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700 bg-white font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Configuração das Chaves
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700 bg-white font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Script SQL das Tabelas
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {statusMessage && (
            <div
              className={`p-4 rounded-xl flex items-start space-x-3 text-sm ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'config' ? (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs text-slate-600 leading-relaxed space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Como conectar seu Supabase gratuitamente:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Acesse o painel do seu projeto no Supabase (supabase.com).</li>
                  <li>Vá em <strong>Project Settings &gt; API</strong>.</li>
                  <li>Copie a <strong>Project URL</strong> e a <strong>anon public key</strong> e cole abaixo.</li>
                  <li>Na aba <strong>Script SQL das Tabelas</strong>, copie o código e rode no SQL Editor do Supabase.</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Anon / Public Key
                </label>
                <textarea
                  rows={2}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/50"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex gap-2">
                  <button
                    onClick={handleTest}
                    disabled={testing || !url || !anonKey}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg disabled:opacity-50 transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Testar Conexão</span>
                  </button>

                  {url && (
                    <button
                      onClick={handleDisconnect}
                      className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Remover Conexão
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSyncLocalData}
                    disabled={syncing || !url || !anonKey}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                    title="Envia dados criados localmente para as tabelas do Supabase"
                  >
                    {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Sincronizar Dados Locais</span>
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={testing}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Salvar Configuração
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Execute o código abaixo no <strong>SQL Editor</strong> do Supabase para criar as tabelas de Produtos, Vendas e Movimentações.
                </p>
                <button
                  onClick={handleCopySQL}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 p-4 text-xs font-mono max-h-80 overflow-y-auto">
                <pre>{SUPABASE_SQL_SCRIPT}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
