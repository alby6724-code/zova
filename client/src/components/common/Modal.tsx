import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  maxWidthClass?: string;
  className?: string;
  containerClassName?: string;
  zIndexClass?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  lockBodyScroll?: boolean;
  showCloseButton?: boolean;
  closeButtonPosition?: 'header' | 'floating';
  closeButtonAriaLabel?: string;
}

/**
 * Shared Modal Component
 * Ensures consistent dismissal behavior across all marketplace modals:
 * - Escape key dismissal
 * - Dimmed backdrop click dismissal
 * - Body scroll locking with clean restoration
 * - High-contrast, minimum 44x44px touch target Close (X) button
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  maxWidthClass = 'max-w-3xl',
  className = '',
  containerClassName = '',
  zIndexClass = 'z-50',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  lockBodyScroll = true,
  showCloseButton = true,
  closeButtonPosition = 'header',
  closeButtonAriaLabel = 'Close modal',
}) => {
  // Handle Escape key dismissal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Body scroll lock & Escape listener setup
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    if (lockBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (lockBodyScroll) {
        document.body.style.overflow = originalOverflow;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, lockBodyScroll, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      data-testid="modal-backdrop"
      className={`fixed inset-0 ${zIndexClass} bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150 ${containerClassName}`}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        data-testid="modal-content"
        className={`bg-white rounded-3xl w-full ${maxWidthClass} shadow-2xl border border-slate-100 overflow-hidden relative animate-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[92vh] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button (when closeButtonPosition is 'floating') */}
        {showCloseButton && closeButtonPosition === 'floating' && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeButtonAriaLabel}
            data-testid="modal-close-button"
            className="absolute top-4 right-4 z-20 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            title="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Header Bar (when closeButtonPosition is 'header' or title is provided) */}
        {((title && closeButtonPosition === 'floating') ||
          (closeButtonPosition === 'header' && (title || showCloseButton))) && (
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            {title ? (
              <div className="text-base sm:text-lg font-extrabold text-slate-900 flex-1 min-w-0 pr-4">
                {title}
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {showCloseButton && closeButtonPosition === 'header' && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeButtonAriaLabel}
                data-testid="modal-close-button"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                title="Close"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        )}

        {/* Modal Children Body */}
        {children}
      </div>
    </div>
  );
};
