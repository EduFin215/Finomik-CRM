import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  as?: 'div' | 'article' | 'section';
}

export function Card({
  children,
  className = '',
  hover = false,
  as: Component = 'div',
}: CardProps) {
  return (
    <Component
      className={`
        bg-white rounded-xl border border-brand-200/60 shadow-card
        ${hover ? 'transition-shadow hover:shadow-md' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}
