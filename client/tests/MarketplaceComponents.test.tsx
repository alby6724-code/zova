import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SubscriptionModal } from '../src/components/marketplace/SubscriptionModal.js';
import { ProfileCompletionModal } from '../src/components/marketplace/ProfileCompletionModal.js';
import { AuthProvider } from '../src/context/AuthContext.js';

describe('Marketplace Components (Subscriptions & Profile)', () => {
  it('renders SubscriptionModal with 3-tier pricing (Free, Basic, Pro)', () => {
    render(
      <AuthProvider>
        <SubscriptionModal isOpen={true} onClose={() => {}} />
      </AuthProvider>
    );

    // Verify modal header & tier names
    expect(screen.getByText('Seller Growth Plans')).toBeDefined();
    expect(screen.getByText('Free Starter')).toBeDefined();
    expect(screen.getByText('Basic Seller')).toBeDefined();
    expect(screen.getByText('Pro Merchant')).toBeDefined();

    // Verify prices
    expect(screen.getByText('₹199')).toBeDefined();
    expect(screen.getByText('₹499')).toBeDefined();

    // Verify Pro features
    expect(screen.getByText(/Unlimited/i)).toBeDefined();
    expect(screen.getAllByText(/Featured ads per month/i).length).toBe(2);
    expect(screen.getByText(/Top Search Priority Boost/i)).toBeDefined();
  });

  it('renders ProfileCompletionModal with Name, City, and Avatar options', () => {
    render(
      <AuthProvider>
        <ProfileCompletionModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />
      </AuthProvider>
    );

    expect(screen.getByText('Complete Your Seller Profile')).toBeDefined();
    expect(screen.getByText(/Your Full Name/)).toBeDefined();
    expect(screen.getByText(/City \/ Location/)).toBeDefined();
    expect(screen.getByText('Save & Continue')).toBeDefined();
  });
});
