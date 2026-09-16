import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext.js';
import { CATEGORIES, findCategory, getCategorySlug, getCategoryName } from '../src/constants/categories.js';
import { CategoriesPage } from '../src/pages/CategoriesPage.js';
import { CategoryPage } from '../src/pages/CategoryPage.js';

describe('Zioeemarket Category System Test Suite', () => {
  it('defines all 9 canonical categories with valid properties and icons', () => {
    expect(CATEGORIES).toHaveLength(9);
    const expectedSlugs = [
      'mobiles',
      'laptops',
      'vehicles',
      'home-living',
      'furniture',
      'electronics',
      'fashion',
      'jobs',
      'services',
    ];
    const actualSlugs = CATEGORIES.map((c) => c.slug);
    expect(actualSlugs).toEqual(expectedSlugs);

    CATEGORIES.forEach((cat) => {
      expect(cat.id).toBeDefined();
      expect(cat.name).toBeTruthy();
      expect(cat.description).toBeTruthy();
      expect(cat.icon).toBeDefined();
      expect(cat.aliases.length).toBeGreaterThan(0);
    });
  });

  it('findCategory correctly resolves canonical slugs, names, and aliases', () => {
    expect(findCategory('mobiles')?.name).toBe('Mobiles');
    expect(findCategory('Mobiles')?.slug).toBe('mobiles');
    expect(findCategory('phones')?.slug).toBe('mobiles');
    expect(findCategory('smartphones')?.slug).toBe('mobiles');
    expect(findCategory('macbook')?.slug).toBe('laptops');
    expect(findCategory('cars')?.slug).toBe('vehicles');
    expect(findCategory('home & furniture')?.slug).toBe('home-living');
    expect(findCategory('sofa')?.slug).toBe('furniture');
    expect(findCategory('clothing')?.slug).toBe('fashion');
    expect(findCategory('careers')?.slug).toBe('jobs');
    expect(findCategory('repair')?.slug).toBe('services');

    expect(getCategorySlug('Home & Living')).toBe('home-living');
    expect(getCategoryName('home-living')).toBe('Home & Living');
  });

  it('CategoriesPage directory renders all 9 categories and header', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <CategoriesPage listings={[]} onPostAd={() => {}} />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Explore All Categories')).toBeDefined();
    expect(screen.getByText(/Discover genuine local deals/i)).toBeDefined();

    CATEGORIES.forEach((cat) => {
      expect(screen.getAllByText(cat.name).length).toBeGreaterThan(0);
      expect(screen.getByText(cat.description)).toBeDefined();
    });
  });

  it('CategoryPage renders header, breadcrumbs, search placeholder, and empty state', () => {
    render(
      <MemoryRouter initialEntries={['/category/mobiles']}>
        <AuthProvider>
          <Routes>
            <Route path="/category/:slug" element={<CategoryPage listings={[]} onPostAd={() => {}} />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Title and breadcrumb
    expect(screen.getAllByText('Mobiles').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Categories').length).toBeGreaterThan(0);

    // In-category search input placeholder
    const searchInput = screen.getByPlaceholderText(/Search within Mobiles/i);
    expect(searchInput).toBeDefined();

    // Filters
    expect(screen.getByText(/Price Range/i)).toBeDefined();
    expect(screen.getByText(/Condition/i)).toBeDefined();
    expect(screen.getAllByText(/Location/i).length).toBeGreaterThan(0);

    // Empty state
    expect(screen.getByText('No listings found in this category')).toBeDefined();
    expect(screen.getAllByText('Post Ad in Mobiles').length).toBeGreaterThanOrEqual(1);
  });
});
