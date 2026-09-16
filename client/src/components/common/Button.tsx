import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'tertiary';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  type = 'button',
  ...rest
}) => {
  // Base styles: clear tap target (min 44px on mobile), bold typography, affordance cues
  const baseStyles =
    'inline-flex items-center justify-center font-bold tracking-tight rounded-xl transition-all select-none cursor-pointer ' +
    'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2';

  // Sizing definitions ensuring WCAG 44x44px touch compliance
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'min-h-[38px] px-3.5 py-1.5 text-xs gap-1.5',
    md: 'min-h-[44px] px-5 py-2.5 text-sm gap-2',
    lg: 'min-h-[50px] px-6 py-3 text-base gap-2.5',
  };

  // Variant definitions adhering strictly to the approved marketplace palette
  const variantStyles: Record<ButtonVariant, string> = {
    // Primary CTA: Vivid Coral Accent (#FF5A5F), highest visual dominance, white text, raised shadow
    primary:
      'bg-brand-accent hover:bg-brand-accent-hover text-white shadow-cta hover:shadow-lg focus:ring-brand-accent',

    // Secondary Action: Solid Deep Blue (#1B4B8F), authoritative secondary weight, white text
    secondary:
      'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-primary hover:shadow-lg focus:ring-brand-primary',

    // Outline Action: Crisp 2px Deep Blue border + text, hover fill
    outline:
      'bg-white hover:bg-brand-primary-light text-brand-primary border-2 border-brand-primary shadow-xs focus:ring-brand-primary',

    // Semantic Success: Solid Natural Green (#2E7D32), white text, high contrast
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg focus:ring-emerald-500',

    // Semantic Danger: Solid Safety Red (#D32F2F), white text, high contrast
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg focus:ring-rose-500',

    // Low-emphasis / Ghost: Colored text with background hover affordance (never grey-on-grey)
    tertiary:
      'bg-transparent hover:bg-slate-100 text-brand-primary hover:text-brand-primary-hover focus:ring-slate-300',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
