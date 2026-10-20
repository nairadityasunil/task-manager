import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { IconTile, type TileTone } from '@/components/ui';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
  /** Tint of the icon tile; one per product area (see AREA_TONES). */
  tone?: TileTone;
  /** Content under the title row, e.g. tabs or stats. */
  children?: ReactNode;
}

/** The top section of a page: title, description and actions; stacks on small screens. */
function PageHeader({ title, description, actions, icon, tone = 'slate', children }: PageHeaderProps): JSX.Element {
  return (
    <div className="header-band border-b border-slate-200 px-3 pt-3.5 sm:px-5 lg:px-6">
      <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 ${children ? 'pb-3' : 'pb-3.5'}`}>
        <div className="flex min-w-0 items-center gap-3">
          {icon ? <IconTile className="hidden sm:inline-flex" icon={icon} size="lg" tone={tone} /> : null}
          <div className="min-w-0">
            <h1 className="m-0 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
            {description ? <p className="m-0 mt-0.5 text-[13px] text-slate-500">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default PageHeader;
