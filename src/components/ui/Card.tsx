import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const Card = ({ className, hover = true, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl overflow-hidden shadow-sm border border-charcoal/5 transition-all duration-300',
        hover && 'hover:shadow-xl hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
