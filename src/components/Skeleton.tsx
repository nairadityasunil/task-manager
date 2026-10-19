import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangle' | 'circle' | 'text';
  width?: string | number;
  height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangle', 
  width, 
  height 
}) => {
  const variantClasses = {
    rectangle: 'rounded-lg',
    circle: 'rounded-full',
    text: 'h-3.5 w-full rounded-md'
  };

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    >
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
};

export default Skeleton;