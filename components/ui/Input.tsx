import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`
        w-full rounded-xl border border-brand-200 px-4 py-3
        text-primary font-body placeholder:text-brand-400
        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
        transition-all
        ${className}
      `}
      {...props}
    />
  );
}
