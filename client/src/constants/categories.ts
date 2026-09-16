import React from 'react';
import {
  Smartphone,
  Laptop,
  Car,
  Home,
  Armchair,
  Tv,
  Shirt,
  Briefcase,
  Wrench,
  Grid,
  LucideIcon,
} from 'lucide-react';

export interface CategoryDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  gradient: string;
  aliases: string[];
}

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'mobiles',
    slug: 'mobiles',
    name: 'Mobiles',
    description: 'Smartphones, feature phones, tablets & mobile accessories',
    icon: Smartphone,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    gradient: 'from-blue-500 to-sky-600',
    aliases: ['mobiles & tablets', 'mobile', 'tablets', 'phones', 'smartphones'],
  },
  {
    id: 'laptops',
    slug: 'laptops',
    name: 'Laptops',
    description: 'Gaming laptops, MacBooks, business notebooks & computer peripherals',
    icon: Laptop,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
    gradient: 'from-purple-500 to-indigo-600',
    aliases: ['laptop', 'computers', 'pc', 'notebooks', 'macbook'],
  },
  {
    id: 'vehicles',
    slug: 'vehicles',
    name: 'Vehicles',
    description: 'Cars, motorcycles, scooters, electric bikes & commercial vehicles',
    icon: Car,
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    gradient: 'from-red-500 to-rose-600',
    aliases: ['vehicle', 'cars', 'bikes', 'motorcycles', 'scooters'],
  },
  {
    id: 'home-living',
    slug: 'home-living',
    name: 'Home & Living',
    description: 'Home decor, kitchen appliances, cookware, bedding & lighting',
    icon: Home,
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-600',
    aliases: ['home & furniture', 'home', 'living', 'home-and-living', 'kitchen'],
  },
  {
    id: 'furniture',
    slug: 'furniture',
    name: 'Furniture',
    description: 'Sofas, dining tables, beds, wardrobes, office chairs & study desks',
    icon: Armchair,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-600',
    gradient: 'from-amber-500 to-yellow-600',
    aliases: ['furnitures', 'sofa', 'tables', 'beds', 'chairs'],
  },
  {
    id: 'electronics',
    slug: 'electronics',
    name: 'Electronics',
    description: 'Smart TVs, soundbars, audio, cameras, gaming consoles & gadgets',
    icon: Tv,
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-600',
    gradient: 'from-cyan-500 to-blue-600',
    aliases: ['electronic', 'audio', 'appliances', 'gadgets', 'tv'],
  },
  {
    id: 'fashion',
    slug: 'fashion',
    name: 'Fashion',
    description: 'Men & women clothing, footwear, luxury watches, bags & beauty products',
    icon: Shirt,
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-600',
    gradient: 'from-pink-500 to-rose-600',
    aliases: ['fashion & beauty', 'clothing', 'shoes', 'apparel', 'beauty'],
  },
  {
    id: 'jobs',
    slug: 'jobs',
    name: 'Jobs',
    description: 'Full-time, part-time, remote, technical, sales & local job vacancies',
    icon: Briefcase,
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-600',
    gradient: 'from-indigo-500 to-blue-700',
    aliases: ['job', 'employment', 'careers', 'vacancies'],
  },
  {
    id: 'services',
    slug: 'services',
    name: 'Services',
    description: 'Home repair, packers & movers, tutoring, IT services & freelancers',
    icon: Wrench,
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-600',
    gradient: 'from-teal-500 to-emerald-600',
    aliases: ['service', 'repair', 'freelance', 'others'],
  },
];

/**
 * Finds a category definition by slug, name, id, or alias (case-insensitive)
 */
export function findCategory(term?: string | null): CategoryDefinition | undefined {
  if (!term) return undefined;
  const clean = term.trim().toLowerCase();

  return CATEGORIES.find(
    (c) =>
      c.slug === clean ||
      c.id === clean ||
      c.name.toLowerCase() === clean ||
      c.aliases.some((a) => a.toLowerCase() === clean)
  );
}

/**
 * Returns canonical slug for a category name or slug
 */
export function getCategorySlug(term: string): string {
  const cat = findCategory(term);
  return cat ? cat.slug : term.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Returns canonical name for a category slug or alias
 */
export function getCategoryName(term: string): string {
  const cat = findCategory(term);
  return cat ? cat.name : term;
}
