import React, { useState } from 'react';
import { X, User as UserIcon, MapPin, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { Modal } from '../common/Modal.js';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
];

const SUGGESTED_CITIES = [
  'Kolkata, West Bengal',
  'Mumbai, Maharashtra',
  'Delhi, NCR',
  'Bengaluru, Karnataka',
  'Hyderabad, Telangana',
  'Pune, Maharashtra',
  'Chennai, Tamil Nadu',
];

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState(user?.city || 'Kolkata, West Bengal');
  const [avatar, setAvatar] = useState(user?.avatar || AVATAR_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!city.trim()) {
      setError('Please enter your city/location');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.updateProfile({
        name: name.trim(),
        city: city.trim(),
        avatar,
      });

      if (res.user) {
        updateUser(res.user);
      } else {
        updateUser({ name: name.trim(), city: city.trim(), avatar });
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      maxWidthClass="max-w-md"
      className="p-6 my-auto"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-brand-primary">
          <Sparkles className="w-5 h-5 text-brand-accent" />
          <h3 className="text-base font-bold text-slate-900">Complete Your Seller Profile</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          data-testid="modal-close-button"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

        <p className="text-xs text-slate-500 mt-2">
          Tell buyers who you are! Providing your name and primary city builds trust and leads to faster ad responses.
        </p>

        {user?.phone && (
          <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Phone:</span>
              <strong className="text-slate-800 font-mono">{user.phone}</strong>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Verified
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          )}

          {/* Avatar Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">Choose an Avatar</label>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {AVATAR_OPTIONS.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatar(imgUrl)}
                  className={`relative rounded-full w-11 h-11 shrink-0 overflow-hidden border-2 transition-all ${
                    avatar === imgUrl
                      ? 'border-sky-600 ring-2 ring-sky-300 scale-105'
                      : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                  {avatar === imgUrl && (
                    <div className="absolute inset-0 bg-sky-600/30 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Your Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
              />
            </div>
          </div>

          {/* City / Location */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              City / Location <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Kolkata, West Bengal"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
              />
            </div>
            {/* Quick city suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SUGGESTED_CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors ${
                    city === c
                      ? 'bg-brand-primary-light border-brand-primary/30 text-brand-primary font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold shadow-primary active:scale-[0.98] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </form>
    </Modal>
  );
};
