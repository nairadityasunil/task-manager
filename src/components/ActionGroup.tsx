import type { ReactNode } from 'react';

interface ActionGroupProps {
  children: ReactNode;
}

function ActionGroup({ children }: ActionGroupProps): JSX.Element {
  return (
    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
      {children}
    </div>
  );
}

export default ActionGroup;