import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { MarketplaceChatModal } from '../src/components/marketplace/MarketplaceChatModal.js';
import { Modal } from '../src/components/common/Modal.js';
import { AuthModal } from '../src/components/marketplace/AuthModal.js';
import { SubscriptionModal } from '../src/components/marketplace/SubscriptionModal.js';
import { ProfileCompletionModal } from '../src/components/marketplace/ProfileCompletionModal.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import { WebSocketProvider } from '../src/context/WebSocketContext.js';

describe('Safety Rules Modal & App-Wide Modal Unification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('Part 1: Safety Rules Modal in MarketplaceChatModal', () => {
    const chatProps = {
      isOpen: true,
      onClose: vi.fn(),
      sellerId: 'seller-test-456',
      sellerName: 'Vikram Singh',
      sellerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      listingId: 'item-999',
      listingTitle: 'MacBook Air M2 16GB RAM',
      listingPrice: 85000,
      listingImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300',
      initialOfferPrompt: false,
    };

    const renderChatModal = (overrideProps = {}) => {
      return render(
        <AuthProvider>
          <WebSocketProvider>
            <MarketplaceChatModal {...chatProps} {...overrideProps} />
          </WebSocketProvider>
        </AuthProvider>
      );
    };

    it('displays the first-time Safety Rules popup with a visible, solid primary-color "Got it" button when not previously dismissed', () => {
      renderChatModal();

      // Verify Safety Rules modal elements
      expect(screen.getByText(/Safety Rules/i)).toBeDefined();
      expect(screen.getAllByText(/Never pay in advance/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Meet in Public/i)).toBeDefined();
      expect(screen.getByText(/Inspect thoroughly/i)).toBeDefined();

      // Verify Got It button
      const gotItBtn = screen.getByTestId('safety-rules-got-it');
      expect(gotItBtn).toBeDefined();
      expect(gotItBtn.textContent?.trim()).toBe('Got it');

      // Check button contrast and sizing: primary blue background, bold white text, min 44px height
      expect(gotItBtn.className).toContain('bg-brand-primary');
      expect(gotItBtn.className).toContain('text-white');
      expect(gotItBtn.className).toContain('font-bold');
      expect(gotItBtn.className).toContain('min-h-[44px]');
      expect(gotItBtn.className).toContain('w-full');
    });

    it('clicking "Got it" button dismisses ONLY the Safety Rules popup and reveals the chat window underneath', () => {
      const onCloseMock = vi.fn();
      renderChatModal({ onClose: onCloseMock });

      // Safety Rules is visible
      expect(screen.getByText(/Safety Rules/i)).toBeDefined();

      // Click "Got it"
      const gotItBtn = screen.getByTestId('safety-rules-got-it');
      fireEvent.click(gotItBtn);

      // Safety Rules modal is now gone
      expect(screen.queryByText(/Safety Rules/i)).toBeNull();

      // Outer chat is still open (onClose was NOT called)
      expect(onCloseMock).not.toHaveBeenCalled();

      // Chat header and messages input are revealed and interactive
      expect(screen.getByText('Vikram Singh')).toBeDefined();
      expect(screen.getByText(/MacBook Air M2 16GB RAM/i)).toBeDefined();
      expect(screen.getByPlaceholderText(/Type message/i)).toBeDefined();

      // Flags set in localStorage
      expect(localStorage.getItem('hasSeenSafetyModal')).toBe('true');
      expect(localStorage.getItem('zioee_chat_safety_acknowledged')).toBe('true');
    });

    it('clicking the Safety Rules backdrop overlay dismisses ONLY the safety popup', () => {
      const onCloseMock = vi.fn();
      renderChatModal({ onClose: onCloseMock });

      expect(screen.getByText(/Safety Rules/i)).toBeDefined();

      // The Safety Rules modal has a backdrop with data-testid="modal-backdrop"
      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);

      // Safety Rules is dismissed
      expect(screen.queryByText(/Safety Rules/i)).toBeNull();
      // Outer chat remains open
      expect(onCloseMock).not.toHaveBeenCalled();
      // Chat elements are visible
      expect(screen.getByText('Vikram Singh')).toBeDefined();
    });

    it('pressing Escape dismisses the Safety Rules popup without closing the outer chat', () => {
      const onCloseMock = vi.fn();
      renderChatModal({ onClose: onCloseMock });

      expect(screen.getByText(/Safety Rules/i)).toBeDefined();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      // Safety Rules is dismissed
      expect(screen.queryByText(/Safety Rules/i)).toBeNull();
      // Outer chat was not closed
      expect(onCloseMock).not.toHaveBeenCalled();
      expect(screen.getByText('Vikram Singh')).toBeDefined();
    });

    it('does NOT display the Safety Rules modal on subsequent chat opens if hasSeenSafetyModal or zioee_chat_safety_acknowledged is true', () => {
      localStorage.setItem('hasSeenSafetyModal', 'true');
      renderChatModal();

      // Safety Rules popup is not shown
      expect(screen.queryByText(/Safety Rules/i)).toBeNull();
      expect(screen.queryByTestId('safety-rules-got-it')).toBeNull();

      // Chat is immediately accessible
      expect(screen.getByText('Vikram Singh')).toBeDefined();
      expect(screen.getByPlaceholderText(/Type message/i)).toBeDefined();
    });

    it('clicking the outer chat close button closes the chat modal', () => {
      localStorage.setItem('hasSeenSafetyModal', 'true');
      const onCloseMock = vi.fn();
      renderChatModal({ onClose: onCloseMock });

      const chatCloseBtn = screen.getByTestId('chat-close-button');
      expect(chatCloseBtn).toBeDefined();
      fireEvent.click(chatCloseBtn);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Part 2: Shared <Modal> Component Behavior & Reliability', () => {
    it('renders modal when isOpen is true with standard 44x44px accessible close button', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Shared Test Modal">
          <p>Modal Test Content</p>
        </Modal>
      );

      expect(screen.getByText('Shared Test Modal')).toBeDefined();
      expect(screen.getByText('Modal Test Content')).toBeDefined();

      const closeBtn = screen.getByTestId('modal-close-button');
      expect(closeBtn).toBeDefined();
      expect(closeBtn.className).toContain('min-w-[44px]');
      expect(closeBtn.className).toContain('min-h-[44px]');

      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes on backdrop click and closes on Escape key', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Dismissal Test Modal">
          <p>Dismissable Content</p>
        </Modal>
      );

      // Backdrop click
      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Escape key
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('does not dismiss when clicking inside the modal content box', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div data-testid="inner-card">Inner Card Content</div>
        </Modal>
      );

      fireEvent.click(screen.getByTestId('inner-card'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('locks body scroll when open and restores body scroll on close', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Body scroll check</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={vi.fn()}>
          <p>Body scroll check</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('');
    });

    it('cleanly supports opening, closing, and reopening multiple times (preventing "stuck" states)', () => {
      const ModalHost = () => {
        const [open, setOpen] = useState(false);
        return (
          <div>
            <button data-testid="open-trigger" onClick={() => setOpen(true)}>
              Open
            </button>
            <Modal isOpen={open} onClose={() => setOpen(false)} title="Cycle Modal">
              <p>Cycle Content</p>
            </Modal>
          </div>
        );
      };

      render(<ModalHost />);

      // Initially closed
      expect(screen.queryByText('Cycle Modal')).toBeNull();

      // Open cycle 1
      fireEvent.click(screen.getByTestId('open-trigger'));
      expect(screen.getByText('Cycle Modal')).toBeDefined();

      // Close cycle 1 via X button
      fireEvent.click(screen.getByTestId('modal-close-button'));
      expect(screen.queryByText('Cycle Modal')).toBeNull();

      // Open cycle 2
      fireEvent.click(screen.getByTestId('open-trigger'));
      expect(screen.getByText('Cycle Modal')).toBeDefined();

      // Close cycle 2 via Escape key
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(screen.queryByText('Cycle Modal')).toBeNull();

      // Open cycle 3
      fireEvent.click(screen.getByTestId('open-trigger'));
      expect(screen.getByText('Cycle Modal')).toBeDefined();

      // Close cycle 3 via backdrop click
      fireEvent.click(screen.getByTestId('modal-backdrop'));
      expect(screen.queryByText('Cycle Modal')).toBeNull();
    });
  });

  describe('Part 3: Unified Modals Across the App', () => {
    it('SubscriptionModal (Tiers Modal) uses the unified Modal close pattern and handles dismissal', () => {
      const onClose = vi.fn();
      render(
        <AuthProvider>
          <SubscriptionModal isOpen={true} onClose={onClose} />
        </AuthProvider>
      );

      // Subscription modal header should be visible
      expect(screen.getByText(/Accelerate Your Sales on Marketplace/i)).toBeDefined();

      // Close button with test id
      const closeBtn = screen.getByTestId('modal-close-button');
      expect(closeBtn).toBeDefined();
      expect(closeBtn.className).toContain('min-w-[44px]');
      expect(closeBtn.className).toContain('min-h-[44px]');

      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('AuthModal uses shared Modal and closes via close button, backdrop, and Escape', () => {
      const onClose = vi.fn();
      render(
        <AuthProvider>
          <AuthModal isOpen={true} onClose={onClose} />
        </AuthProvider>
      );

      expect(screen.getByText('Enter your mobile number to continue')).toBeDefined();

      const closeBtn = screen.getByTestId('modal-close-button');
      expect(closeBtn).toBeDefined();
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Backdrop
      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(2);

      // Escape
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('ProfileCompletionModal uses shared Modal and closes via close button, backdrop, and Escape', () => {
      const onClose = vi.fn();
      render(
        <AuthProvider>
          <ProfileCompletionModal
            isOpen={true}
            onClose={onClose}
            onSuccess={vi.fn()}
            initialPhone="9876543210"
          />
        </AuthProvider>
      );

      expect(screen.getByText('Complete Your Seller Profile')).toBeDefined();

      const closeBtn = screen.getByTestId('modal-close-button');
      expect(closeBtn).toBeDefined();
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
