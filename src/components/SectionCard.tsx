import type { ComponentPropsWithoutRef, ReactNode } from 'react';

interface SectionCardProps extends ComponentPropsWithoutRef<'section'> {
  children: ReactNode;
  className?: string;
}

function SectionCard({ children, className, ...props }: SectionCardProps): JSX.Element {
  return (
    <section
      {...props}
      className={['relative rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]', className ?? ''].join(' ')}
    >
      {children}
    </section>
  );
}

export default SectionCard;
