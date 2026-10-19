import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
  /** Content under the title row, e.g. tabs or stats. */
  children?: ReactNode;
}

/** The top section of a page: title, description and actions; stacks on small screens. */
function PageHeader({ title, description, actions, icon: Icon, children }: PageHeaderProps): JSX.Element {
  return (
    <div className="border-b border-slate-200 bg-white px-4 pt-5 sm:px-6 lg:px-8">
      <div className={`flex flex-wrap items-start justify-between gap-4 ${children ? 'pb-4' : 'pb-5'}`}>
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 sm:flex">
              <Icon size={18} />
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
            {description ? <p className="m-0 mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default PageHeader;
