import React, { useState, useEffect, useCallback } from 'react';
import { AdCreditPackage, PremiumTier } from '../types/index.js';
import { api } from '../services/api.js';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
  Clock,
  Zap,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Layers,
  Crown,
  ChevronDown,
  ChevronUp,
  Shield,
  TrendingUp,
} from 'lucide-react';

// ─────────── helpers ───────────
function formatPrice(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function statusBadge(active: boolean) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold border border-slate-200">
      <XCircle className="w-3 h-3" /> Inactive
    </span>
  );
}

// ─────────── Tier Form ───────────
const TierForm: React.FC<{
  initial?: PremiumTier | null;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}> = ({ initial, onSave, onClose, saving }) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    benefits: (initial?.benefits || []).join('\n'),
    badge: initial?.badge || '',
    perAdPrice: initial?.perAdPrice ?? 150,
    maxCustomAds: initial?.maxCustomAds ?? 28,
    displayOrder: initial?.displayOrder ?? 0,
    active: initial?.active !== false,
    featured: initial?.featured || false,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Tier name is required.'); return; }
    try {
      await onSave({
        ...form,
        benefits: form.benefits.split('\n').map(b => b.trim()).filter(Boolean),
        badge: form.badge.trim() || undefined,
        perAdPrice: Number(form.perAdPrice),
        maxCustomAds: Number(form.maxCustomAds),
        displayOrder: Number(form.displayOrder),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save tier.');
    }
  };

  const set = (field: string, val: any) => setForm(f => ({ ...f, [field]: val }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center"><Crown className="w-4 h-4 text-white" /></div>
            <h3 className="font-bold text-slate-900 text-base">{initial ? 'Edit Tier' : 'New Premium Tier'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tier Name *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Platinum" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Brief description shown to sellers" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Benefits (one per line)</label>
            <textarea value={form.benefits} onChange={e => set('benefits', e.target.value)} rows={4} placeholder="Top search placement&#10;Featured badge&#10;Priority support" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 resize-none font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price per Ad (₹)</label>
              <input type="number" min={1} value={form.perAdPrice} onChange={e => set('perAdPrice', Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Custom Ads</label>
              <input type="number" min={1} value={form.maxCustomAds} onChange={e => set('maxCustomAds', Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Badge Label</label>
              <input type="text" value={form.badge} onChange={e => set('badge', e.target.value)} placeholder="e.g. ⭐ Most Popular" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 placeholder-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Display Order</label>
              <input type="number" min={0} value={form.displayOrder} onChange={e => set('displayOrder', Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-violet-600" />
              <span className="text-xs font-semibold text-slate-700">Active (visible to sellers)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} className="w-4 h-4 accent-amber-500" />
              <span className="text-xs font-semibold text-slate-700">Featured tier</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {initial ? 'Save Changes' : 'Create Tier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────── Package Form ───────────
const PackageForm: React.FC<{
  initial?: AdCreditPackage | null;
  tiers: PremiumTier[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}> = ({ initial, tiers, onSave, onClose, saving }) => {
  const [form, setForm] = useState({
    tierId: initial?.tierId || tiers[0]?.id || '',
    name: initial?.name || '',
    adsCount: initial?.credits ?? initial?.adsCount ?? 5,
    durationValue: initial?.durationValue ?? 1,
    durationUnit: (initial?.durationUnit as 'Month' | 'Days' | 'Year') ?? 'Month',
    price: initial?.price ?? 999,
    badge: initial?.badge || '',
    displayOrder: initial?.displayOrder ?? initial?.sortOrder ?? 0,
    active: initial?.active !== undefined ? initial.active : (initial?.status !== 'INACTIVE'),
  });
  const [error, setError] = useState('');

  const set = (field: string, val: any) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Package name is required.'); return; }
    if (form.adsCount < 1) { setError('Ads count must be at least 1.'); return; }
    if (form.price < 0) { setError('Price cannot be negative.'); return; }
    try {
      await onSave({
        ...form,
        badge: form.badge.trim() || undefined,
        adsCount: Number(form.adsCount),
        credits: Number(form.adsCount),
        durationValue: Number(form.durationValue),
        price: Number(form.price),
        displayOrder: Number(form.displayOrder),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save package.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center"><Package className="w-4 h-4 text-white" /></div>
            <h3 className="font-bold text-slate-900 text-base">{initial ? 'Edit Package' : 'New Ad Credit Package'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign to Tier</label>
            <select value={form.tierId} onChange={e => set('tierId', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 bg-white">
              {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Package Name *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Starter 5-Pack" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5"><Zap className="inline w-3 h-3 mr-0.5 text-amber-500" /> Ad Credits *</label>
              <input type="number" min={1} value={form.adsCount} onChange={e => set('adsCount', parseInt(e.target.value) || 1)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price (₹) *</label>
              <input type="number" min={0} value={form.price} onChange={e => set('price', parseInt(e.target.value) || 0)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5"><Clock className="inline w-3 h-3 mr-0.5 text-blue-500" /> Duration</label>
              <input type="number" min={1} value={form.durationValue} onChange={e => set('durationValue', parseInt(e.target.value) || 1)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Duration Unit</label>
              <select value={form.durationUnit} onChange={e => set('durationUnit', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 bg-white">
                <option value="Month">Month(s)</option>
                <option value="Days">Day(s)</option>
                <option value="Year">Year(s)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5"><Star className="inline w-3 h-3 mr-0.5 text-amber-400" /> Badge (optional)</label>
              <input type="text" value={form.badge} onChange={e => set('badge', e.target.value)} placeholder="e.g. Most Popular" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 placeholder-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Display Order</label>
              <input type="number" min={0} value={form.displayOrder} onChange={e => set('displayOrder', parseInt(e.target.value) || 0)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-violet-600" />
            <span className="text-xs font-semibold text-slate-700">Active (visible to sellers)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {initial ? 'Save Changes' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────── Delete Confirm ───────────
const DeleteConfirm: React.FC<{
  name: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  deleting: boolean;
  isT?: boolean;
}> = ({ name, onConfirm, onClose, deleting, isT }) => (
  <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 p-6">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-600" /></div>
      <h3 className="text-center font-bold text-slate-900 text-base mb-1">Delete {isT ? 'Tier' : 'Package'}?</h3>
      <p className="text-center text-xs text-slate-500 mb-5">
        <span className="font-semibold text-slate-700">"{name}"</span> will be permanently removed{isT ? ' along with all its packages' : ''}. This cannot be undone.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
        <button onClick={onConfirm} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─────────── Expanded Tier Row ───────────
const TierRow: React.FC<{
  tier: PremiumTier;
  packages: AdCreditPackage[];
  onEdit: () => void;
  onDelete: () => void;
  onAddPackage: () => void;
  onEditPackage: (pkg: AdCreditPackage) => void;
  onDeletePackage: (pkg: AdCreditPackage) => void;
  onTogglePkg: (pkg: AdCreditPackage) => void;
  onToggleTier: () => void;
}> = ({ tier, packages, onEdit, onDelete, onAddPackage, onEditPackage, onDeletePackage, onTogglePkg, onToggleTier }) => {
  const [expanded, setExpanded] = useState(false);
  const tierPkgs = packages.filter(p => p.tierId === tier.id);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${tier.active ? 'border-slate-200' : 'border-slate-100 opacity-70'}`}>
      {/* Tier header row */}
      <div className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tier.featured ? 'bg-amber-100' : 'bg-violet-100'}`}>
          {tier.featured ? <Crown className="w-4 h-4 text-amber-600" /> : <Layers className="w-4 h-4 text-violet-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-900 text-sm">{tier.name}</p>
            {tier.badge && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-semibold rounded text-[10px] border border-amber-200">{tier.badge}</span>}
            {statusBadge(tier.active)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{tier.description}</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600 shrink-0">
          <span className="font-bold text-violet-700">₹{tier.perAdPrice}/ad</span>
          <span className="text-slate-400">{tierPkgs.length} pkg{tierPkgs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onToggleTier(); }} className={`p-1.5 rounded-lg transition-colors ${tier.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`} title={tier.active ? 'Deactivate' : 'Activate'}>
            {tier.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-4 h-4" /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded packages sub-list */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60">
          {/* Benefits summary */}
          {tier.benefits.length > 0 && (
            <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5">
              {tier.benefits.map((b, i) => (
                <span key={i} className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">{b}</span>
              ))}
            </div>
          )}

          {/* Package rows */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Packages</p>
              <button onClick={onAddPackage} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold transition-colors">
                <Plus className="w-3 h-3" /> Add Package
              </button>
            </div>
            {tierPkgs.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-3">No packages yet. Add one above.</p>
            ) : (
              tierPkgs.map(pkg => (
                <div key={pkg.id} className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${pkg.active !== false && pkg.status !== 'INACTIVE' ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900">{pkg.name}</span>
                      {pkg.badge && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-semibold rounded text-[10px] border border-amber-200">{pkg.badge}</span>}
                      {statusBadge(pkg.active !== false && pkg.status !== 'INACTIVE')}
                    </div>
                    <span className="text-slate-500">{pkg.credits ?? pkg.adsCount} ads · {pkg.durationValue ?? 1} {pkg.durationUnit ?? 'Month'}</span>
                  </div>
                  <span className="font-black text-slate-900 shrink-0">{formatPrice(pkg.price)}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onTogglePkg(pkg)} className={`p-1 rounded transition-colors ${pkg.active !== false && pkg.status !== 'INACTIVE' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                      {pkg.active !== false && pkg.status !== 'INACTIVE' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => onEditPackage(pkg)} className="p-1 rounded text-blue-500 hover:bg-blue-50 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDeletePackage(pkg)} className="p-1 rounded text-red-400 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────── Main Page ───────────
export const PackagesPage: React.FC = () => {
  const [tiers, setTiers] = useState<PremiumTier[]>([]);
  const [packages, setPackages] = useState<AdCreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [showTierForm, setShowTierForm] = useState(false);
  const [editTier, setEditTier] = useState<PremiumTier | null>(null);
  const [deleteTier, setDeleteTier] = useState<PremiumTier | null>(null);
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [editPkg, setEditPkg] = useState<AdCreditPackage | null>(null);
  const [deletePkg, setDeletePkg] = useState<AdCreditPackage | null>(null);
  const [preselectedTierId, setPreselectedTierId] = useState<string>('');

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAdminPackages();
      if (res.tiers) setTiers(res.tiers);
      if (res.packages) setPackages(res.packages);
    } catch {
      setError('Failed to load tiers and packages. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Tier handlers ──
  const handleSaveTier = async (data: any) => {
    setSaving(true);
    try {
      if (editTier) {
        const res = await api.updateAdminTier(editTier.id, data);
        setTiers(prev => prev.map(t => t.id === editTier.id ? res.tier : t));
        showToast(`Tier "${res.tier.name}" updated.`);
      } else {
        const res = await api.createAdminTier(data);
        setTiers(prev => [...prev, res.tier]);
        showToast(`Tier "${res.tier.name}" created.`);
      }
      setShowTierForm(false);
      setEditTier(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save tier.', 'error');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTier = async () => {
    if (!deleteTier) return;
    setDeleting(true);
    try {
      await api.deleteAdminTier(deleteTier.id);
      setTiers(prev => prev.filter(t => t.id !== deleteTier.id));
      setPackages(prev => prev.filter(p => p.tierId !== deleteTier.id));
      showToast(`Tier "${deleteTier.name}" deleted.`);
      setDeleteTier(null);
    } catch (err: any) {
      showToast(err.message || 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleTier = async (tier: PremiumTier) => {
    try {
      const res = await api.updateAdminTier(tier.id, { active: !tier.active });
      setTiers(prev => prev.map(t => t.id === tier.id ? res.tier : t));
      showToast(`Tier "${res.tier.name}" is now ${res.tier.active ? 'active' : 'inactive'}.`);
    } catch (err: any) {
      showToast(err.message || 'Toggle failed.', 'error');
    }
  };

  // ── Package handlers ──
  const handleSavePkg = async (data: any) => {
    setSaving(true);
    try {
      if (editPkg) {
        const res = await api.updatePackage(editPkg.id, data);
        setPackages(prev => prev.map(p => p.id === editPkg.id ? res.package : p));
        showToast(`Package "${res.package.name}" updated.`);
      } else {
        const res = await api.createPackage({ ...data, tierId: data.tierId || preselectedTierId });
        setPackages(prev => [...prev, res.package]);
        showToast(`Package "${res.package.name}" created.`);
      }
      setShowPkgForm(false);
      setEditPkg(null);
      setPreselectedTierId('');
    } catch (err: any) {
      showToast(err.message || 'Failed to save package.', 'error');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePkg = async () => {
    if (!deletePkg) return;
    setDeleting(true);
    try {
      await api.deletePackage(deletePkg.id);
      setPackages(prev => prev.filter(p => p.id !== deletePkg.id));
      showToast(`Package "${deletePkg.name}" deleted.`);
      setDeletePkg(null);
    } catch (err: any) {
      showToast(err.message || 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePkg = async (pkg: AdCreditPackage) => {
    const isActive = pkg.active !== false && pkg.status !== 'INACTIVE';
    try {
      const res = await api.updatePackage(pkg.id, { active: !isActive, status: isActive ? 'INACTIVE' : 'ACTIVE' });
      setPackages(prev => prev.map(p => p.id === pkg.id ? res.package : p));
      showToast(`Package "${pkg.name}" is now ${isActive ? 'inactive' : 'active'}.`);
    } catch (err: any) {
      showToast(err.message || 'Toggle failed.', 'error');
    }
  };

  // ── Stats ──
  const totalPkgs = packages.length;
  const activePkgs = packages.filter(p => p.active !== false && p.status !== 'INACTIVE').length;
  const totalTiers = tiers.length;
  const activeTiers = tiers.filter(t => t.active).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Crown, color: 'bg-violet-600', label: 'Total Tiers', value: totalTiers },
          { icon: Shield, color: 'bg-emerald-500', label: 'Active Tiers', value: activeTiers },
          { icon: Package, color: 'bg-blue-500', label: 'Total Packages', value: totalPkgs },
          { icon: TrendingUp, color: 'bg-amber-500', label: 'Active Packages', value: activePkgs },
        ].map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Tiers & Packages manager */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-900">Premium Tiers & Packages</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage tiers and the ad credit packages within each tier. Prices are enforced server-side.</p>
          </div>
          <button
            onClick={() => { setEditTier(null); setShowTierForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Tier
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading tiers and packages...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        ) : tiers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Crown className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">No tiers yet. Create your first tier.</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {[...tiers].sort((a, b) => a.displayOrder - b.displayOrder).map(tier => (
              <TierRow
                key={tier.id}
                tier={tier}
                packages={packages}
                onEdit={() => { setEditTier(tier); setShowTierForm(true); }}
                onDelete={() => setDeleteTier(tier)}
                onAddPackage={() => { setEditPkg(null); setPreselectedTierId(tier.id); setShowPkgForm(true); }}
                onEditPackage={pkg => { setEditPkg(pkg); setShowPkgForm(true); }}
                onDeletePackage={pkg => setDeletePkg(pkg)}
                onTogglePkg={handleTogglePkg}
                onToggleTier={() => handleToggleTier(tier)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showTierForm && (
        <TierForm
          initial={editTier}
          onSave={handleSaveTier}
          onClose={() => { setShowTierForm(false); setEditTier(null); }}
          saving={saving}
        />
      )}
      {showPkgForm && (
        <PackageForm
          initial={editPkg}
          tiers={tiers}
          onSave={handleSavePkg}
          onClose={() => { setShowPkgForm(false); setEditPkg(null); setPreselectedTierId(''); }}
          saving={saving}
        />
      )}
      {deleteTier && (
        <DeleteConfirm
          name={deleteTier.name}
          onConfirm={handleDeleteTier}
          onClose={() => setDeleteTier(null)}
          deleting={deleting}
          isT={true}
        />
      )}
      {deletePkg && (
        <DeleteConfirm
          name={deletePkg.name}
          onConfirm={handleDeletePkg}
          onClose={() => setDeletePkg(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
};