import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Storefront } from '../src/components/marketplace/Storefront.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import { WebSocketProvider } from '../src/context/WebSocketContext.js';

describe('Hero Banner Carousel Buttons & Controls Suite', () => {
  const renderStorefront = () => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <WebSocketProvider>
            <Storefront listings={[]} onPostAd={vi.fn()} />
          </WebSocketProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders Left and Right navigation arrows with solid circular background, min 40px touch targets, and proper edge offset', () => {
    renderStorefront();

    const prevButton = screen.getByRole('button', { name: /Previous Slide/i });
    const nextButton = screen.getByRole('button', { name: /Next Slide/i });

    expect(prevButton).toBeDefined();
    expect(nextButton).toBeDefined();

    // Verify circular container and backdrop-blur
    expect(prevButton.className).toContain('rounded-full');
    expect(prevButton.className).toContain('bg-slate-950/80');
    expect(prevButton.className).toContain('border-white/30');
    expect(prevButton.className).toContain('backdrop-blur-md');
    expect(prevButton.className).toContain('shadow-xl');

    // Verify minimum 40px touch target
    expect(prevButton.className).toContain('min-w-[40px]');
    expect(prevButton.className).toContain('min-h-[40px]');

    // Verify position and padding from edges
    expect(prevButton.className).toContain('left-3');
    expect(nextButton.className).toContain('right-3');

    // Verify hover and active transitions
    expect(prevButton.className).toContain('hover:bg-slate-900');
    expect(prevButton.className).toContain('active:scale-90');
    expect(nextButton.className).toContain('hover:bg-slate-900');
    expect(nextButton.className).toContain('active:scale-90');
  });

  it('renders "3 Plans" button with solid high-contrast white fill, dark navy text, Crown icon, and subtle shadow', () => {
    renderStorefront();

    const carousel = screen.getByRole('region', { name: /Promotional Carousel/i });
    const planButtons = within(carousel).getAllByRole('button', { name: /3 Plans/i });
    expect(planButtons.length).toBeGreaterThan(0);

    const firstPlanBtn = planButtons[0];
    expect(firstPlanBtn.className).toContain('bg-white');
    expect(firstPlanBtn.className).toContain('text-slate-900');
    expect(firstPlanBtn.className).toContain('font-extrabold');
    expect(firstPlanBtn.className).toContain('shadow-md');
    expect(firstPlanBtn.className).toContain('min-h-[42px]');
    expect(firstPlanBtn.className).toContain('active:scale-95');

    // Clicking "3 Plans" opens subscription modal
    fireEvent.click(firstPlanBtn);
    expect(screen.getByText(/Accelerate Your Sales/i)).toBeDefined();
  });

  it('renders Slide Primary CTA with high-contrast Coral Accent, icon, and bold white text (never an empty white box)', () => {
    renderStorefront();

    const carousel = screen.getByRole('region', { name: /Promotional Carousel/i });

    // First slide has "Explore Pro Plans"
    const primaryCta = within(carousel).getByRole('button', { name: /Explore Pro Plans/i });
    expect(primaryCta).toBeDefined();

    // Verify it is NOT a plain white box, but solid Coral Accent CTA
    expect(primaryCta.className).toContain('bg-brand-accent');
    expect(primaryCta.className).toContain('text-white');
    expect(primaryCta.className).toContain('font-black');
    expect(primaryCta.className).toContain('shadow-cta');
    expect(primaryCta.className).toContain('min-h-[42px]');
    expect(primaryCta.className).toContain('active:scale-95');

    // Slide 2 has "Post Your Ad Free", Slide 3 has "Browse Categories"
    expect(within(carousel).getByRole('button', { name: /Post Your Ad Free/i })).toBeDefined();
    expect(within(carousel).getByRole('button', { name: /Browse Categories/i })).toBeDefined();
  });

  it('renders slide position dot indicators with opaque dots and distinct Coral active state', () => {
    renderStorefront();

    const dotButtons = screen.getAllByRole('button', { name: /Go to slide \d/i });
    expect(dotButtons.length).toBe(3);

    // First dot is currently active (index 0)
    const firstDotSpan = dotButtons[0].querySelector('span');
    expect(firstDotSpan?.className).toContain('bg-brand-accent');
    expect(firstDotSpan?.className).toContain('shadow-cta');

    // Inactive dots (index 1 & 2)
    const secondDotSpan = dotButtons[1].querySelector('span');
    expect(secondDotSpan?.className).toContain('bg-white/70');

    // Clicking next button advances to slide 2
    const nextButton = screen.getByRole('button', { name: /Next Slide/i });
    fireEvent.click(nextButton);

    // After click, second dot becomes active with Coral Accent
    expect(secondDotSpan?.className).toContain('bg-brand-accent');
  });

  it('allows jumping directly to slides by clicking the dot indicators', () => {
    renderStorefront();

    const dotButtons = screen.getAllByRole('button', { name: /Go to slide \d/i });
    const thirdDotSpan = dotButtons[2].querySelector('span');

    // Click third dot
    fireEvent.click(dotButtons[2]);

    // Third dot becomes active
    expect(thirdDotSpan?.className).toContain('bg-brand-accent');
  });
});
