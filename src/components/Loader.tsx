import React from 'react';
import logoImg from '@/assets/logo.png';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  center?: boolean;
  /** Accessible name; the logo is decorative. */
  label?: string;
}

/** Pixel sizes. Big enough to be seen on a full page, small enough to sit inside a card (sm). */
const SIZES = { sm: 44, md: 88, lg: 128 } as const;

/**
 * The Pristine logo, breathing, with a light sweeping across it. It replaces the small spinning ring.
 * With reduced motion it only fades slowly.
 */
const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  className = '',
  center = false,
  label = 'Loading',
}) => {
  const px = SIZES[size];
  const loader = (
    <div
      aria-label={label}
      aria-live="polite"
      className={`pristine-loader relative flex items-center justify-center ${className}`}
      role="status"
      style={{ width: px, height: px }}
    >
      <span aria-hidden className="pristine-loader-glow absolute inset-0 rounded-full" />
      <div className="pristine-loader-logo relative h-full w-full">
        <img alt="" className="h-full w-full object-contain" draggable={false} src={logoImg} />
        <span
          aria-hidden
          className="pristine-loader-shine absolute inset-0"
          style={{
            WebkitMaskImage: `url(${logoImg})`,
            maskImage: `url(${logoImg})`,
          }}
        />
      </div>
    </div>
  );

  if (center) {
    return (
      <div className="flex h-full min-h-[200px] w-full items-center justify-center">{loader}</div>
    );
  }

  return loader;
};

export default Loader;
