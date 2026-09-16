import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdDetailModal } from '../src/components/marketplace/AdDetailModal.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import { WebSocketProvider } from '../src/context/WebSocketContext.js';
import type { Listing } from '../src/types/marketplace.js';

const mockListing: Listing = {
  id: 'listing-test-123',
  title: 'Apple iPhone 14 Pro 128GB Deep Purple',
  description: 'Flawless condition, battery health 98%, with original invoice and box.',
  price: 64999,
  category: 'Mobiles',
  location: 'Mumbai, Maharashtra',
  sellerId: 'seller-rahul-456',
  sellerName: 'Rahul Sharma',
  sellerPhone: '+91 98765 43210',
  condition: 'Used - Like New',
  tier: 'PRO',
  featured: true,
  createdAt: new Date().toISOString(),
  image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
  images: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
  ],
  distanceKm: 12,
};

describe('Product/Ad Detail Modal: Dismissal & Button Contrast Suite', () => {
  const defaultProps = {
    listing: mockListing,
    isOpen: true,
    onClose: vi.fn(),
    onOpenChat: vi.fn(),
    isFavorited: false,
    onToggleFavorite: vi.fn(),
  };

  const renderModal = (props = {}) => {
    return render(
      <AuthProvider>
        <WebSocketProvider>
          <AdDetailModal {...defaultProps} {...props} />
        </WebSocketProvider>
      </AuthProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('Bug 1: Close (X) Button, Overlay Click & Escape Key Dismissal', () => {
    it('closes the modal when clicking the X close button', () => {
      const onCloseMock = vi.fn();
      renderModal({ onClose: onCloseMock });

      const closeButton = screen.getByTestId('modal-close-button');
      expect(closeButton).toBeDefined();
      expect(closeButton.getAttribute('aria-label')).toBe('Close modal');

      // Verify accessible touch target (min 44x44px)
      expect(closeButton.className).toContain('min-w-[44px]');
      expect(closeButton.className).toContain('min-h-[44px]');

      // Click close button
      fireEvent.click(closeButton);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('closes the modal when clicking outside the modal on the dimmed backdrop overlay', () => {
      const onCloseMock = vi.fn();
      renderModal({ onClose: onCloseMock });

      const backdrop = screen.getByTestId('modal-backdrop');
      expect(backdrop).toBeDefined();

      // Click directly on the dimmed backdrop
      fireEvent.click(backdrop);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('does NOT close the modal when clicking inside the modal dialog container (stopPropagation)', () => {
      const onCloseMock = vi.fn();
      renderModal({ onClose: onCloseMock });

      const modalContent = screen.getByTestId('modal-content');
      expect(modalContent).toBeDefined();

      // Click inside modal content
      fireEvent.click(modalContent);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it('closes the modal when pressing the Escape key', () => {
      const onCloseMock = vi.fn();
      renderModal({ onClose: onCloseMock });

      // Trigger Escape key event on window
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('locks body scroll when open and restores it when unmounted/closed', () => {
      const { unmount } = renderModal({ isOpen: true });
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('');
    });

    it('renders nothing when isOpen is false', () => {
      renderModal({ isOpen: false });
      expect(screen.queryByTestId('modal-backdrop')).toBeNull();
      expect(screen.queryByTestId('modal-content')).toBeNull();
    });
  });

  describe('Bug 2: Chat & Make Offer Buttons Contrast and Hierarchy', () => {
    it('renders "Make Offer" with solid Coral accent primary fill, bold white text, shadow-cta, and min 44px height', () => {
      renderModal();

      const makeOfferBtn = document.getElementById('ad-detail-make-offer-btn') as HTMLButtonElement;
      expect(makeOfferBtn).toBeDefined();
      expect(makeOfferBtn.textContent).toContain('Make Offer');

      // Verify minimum 44px touch target
      expect(makeOfferBtn.className).toContain('min-h-[44px]');

      // Verify solid primary Coral accent fill (#FF5A5F), white text, and raised shadow
      expect(makeOfferBtn.className).toContain('bg-brand-accent');
      expect(makeOfferBtn.className).toContain('text-white');
      expect(makeOfferBtn.className).toContain('shadow-cta');

      // Ensure no washed-out opacity or disabled styling
      expect(makeOfferBtn.disabled).toBe(false);
      expect(makeOfferBtn.className).not.toMatch(/(^|\s)opacity-\d+/);
    });

    it('renders "Chat" with crisp high-contrast Deep Blue 2px outline, dark blue text, and min 44px height', () => {
      renderModal();

      const chatBtn = document.getElementById('ad-detail-chat-btn') as HTMLButtonElement;
      expect(chatBtn).toBeDefined();
      expect(chatBtn.textContent).toContain('Chat');

      // Verify minimum 44px touch target
      expect(chatBtn.className).toContain('min-h-[44px]');

      // Verify crisp 2px Deep Blue border and text on white background
      expect(chatBtn.className).toContain('border-2');
      expect(chatBtn.className).toContain('border-brand-primary');
      expect(chatBtn.className).toContain('text-brand-primary');
      expect(chatBtn.className).toContain('bg-white');

      // Ensure no washed-out opacity or disabled styling
      expect(chatBtn.disabled).toBe(false);
      expect(chatBtn.className).not.toMatch(/(^|\s)opacity-\d+/);
    });

    it('clicking "Chat" calls onOpenChat with promptOffer=false and closes modal', () => {
      const onOpenChatMock = vi.fn();
      const onCloseMock = vi.fn();
      renderModal({ onOpenChat: onOpenChatMock, onClose: onCloseMock });

      const chatBtn = document.getElementById('ad-detail-chat-btn')!;
      fireEvent.click(chatBtn);

      expect(onOpenChatMock).toHaveBeenCalledWith('seller-rahul-456', 'listing-test-123', false);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('clicking "Make Offer" calls onOpenChat with promptOffer=true and closes modal', () => {
      const onOpenChatMock = vi.fn();
      const onCloseMock = vi.fn();
      renderModal({ onOpenChat: onOpenChatMock, onClose: onCloseMock });

      const makeOfferBtn = document.getElementById('ad-detail-make-offer-btn')!;
      fireEvent.click(makeOfferBtn);

      expect(onOpenChatMock).toHaveBeenCalledWith('seller-rahul-456', 'listing-test-123', true);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('preserves "Show Phone Number" button and "Safety Tips" box without alteration', () => {
      renderModal();

      // "Show Phone Number" button
      const phoneBtn = document.getElementById('ad-detail-show-phone-btn');
      expect(phoneBtn).toBeDefined();
      expect(phoneBtn?.textContent).toContain('Show Phone Number');
      expect(phoneBtn?.className).toContain('border-emerald-600');

      // "Safety Tips" box
      const safetyBox = screen.getByText(/Safety Tips/i);
      expect(safetyBox).toBeDefined();
      expect(screen.getByText(/Inspect the item thoroughly before making payment/i)).toBeDefined();
    });
  });
});
