import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loading,
      leftIcon,
      rightIcon,
      icon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isBusy = isLoading || loading || false;
    const effectiveLeftIcon = leftIcon || icon;

    // Base styles
    const baseClasses =
      'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';

    // Variant styles
    const variantClasses = {
      primary:
        'bg-[#7847CB] text-white hover:bg-[#6336b3] focus-visible:ring-[#7847CB]/30 shadow-sm shadow-[#7847CB]/20',
      secondary:
        'bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-300 border border-slate-200/80',
      outline:
        'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 focus-visible:ring-slate-300 shadow-2xs',
      ghost:
        'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-200',
      destructive:
        'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/30 shadow-sm shadow-rose-600/20',
    };

    // Sizing styles
    const sizeClasses = {
      sm: 'text-xs h-8 px-3 rounded-lg gap-1.5',
      md: 'text-xs md:text-sm h-9 px-4 rounded-xl gap-2',
      lg: 'text-sm h-11 px-5 rounded-xl gap-2.5',
      icon: 'h-9 w-9 p-0 rounded-xl justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isBusy}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isBusy ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          effectiveLeftIcon && <span className="shrink-0">{effectiveLeftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isBusy && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
