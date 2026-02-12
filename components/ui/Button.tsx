import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-sm hover:shadow-md transition-all',
  secondary:
    'bg-brand-100 hover:bg-brand-200/80 text-brand-600 font-bold transition-colors',
  ghost:
    'bg-transparent hover:bg-brand-100/50 text-brand-600 font-bold transition-colors',
};

export function Button({
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm
        disabled:opacity-60 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
