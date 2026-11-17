import React from 'react';
import logoImg from '@/assets/logo.png';
import { LOGO_OUTLINE_PATHS, LOGO_VIEWBOX } from './logoOutline';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  center?: boolean;
  /** Accessible name; the drawing is decorative. */
  label?: string;
}

/** Widths in pixels. Large enough to be seen on a full page; sm fits inside a card. */
const SIZES = { sm: 56, md: 112, lg: 168 } as const;

/** Each outline starts a little after the one before, so the mark is drawn piece by piece. */
const STAGGER_S = [0, 0.18, 0.36, 0.54];

/**
 * The Pristine logo drawn stroke by stroke, then filled in with the real logo, then drawn again while loading.
 * With reduced motion it shows the finished logo and only fades slowly.
 */
const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  className = '',
  center = false,
  label = 'Loading',
}) => {
  const width = SIZES[size];
  const height = Math.round((width * LOGO_VIEWBOX.height) / LOGO_VIEWBOX.width);
  const loader = (
    <div
      aria-label={label}
      aria-live="polite"
      className={`pristine-loader relative flex items-center justify-center ${className}`}
      role="status"
      style={{ width, height }}
    >
      <svg
        aria-hidden
        className="h-full w-full overflow-visible"
        viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}
      >
        <image
          className="pristine-loader-fill"
          height={LOGO_VIEWBOX.height}
          href={logoImg}
          width={LOGO_VIEWBOX.width}
        />
        {LOGO_OUTLINE_PATHS.map((d, i) => (
          <path
            className="pristine-loader-stroke"
            d={d}
            fill="none"
            key={i}
            pathLength={1}
            style={{ animationDelay: `${STAGGER_S[i] ?? 0}s` }}
          />
        ))}
      </svg>
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
