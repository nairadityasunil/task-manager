import { Link } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';

import { Logo } from './primitives';
import { GUIDE_SECTIONS } from './sections';

type FooterLink = { label: string; to: string | { pathname: string; hash: string } };

const linkCls =
  'rounded text-[13px] text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20';

/** Footer shared by the landing page and the guide. */
export default function MarketingFooter(): JSX.Element {
  const { user } = useAuth();

  const product: FooterLink[] = [
    { label: 'Work management', to: { pathname: '/', hash: 'work' } },
    { label: 'SLAs and priorities', to: { pathname: '/', hash: 'slas' } },
    { label: 'Collaboration', to: { pathname: '/', hash: 'collaboration' } },
    { label: 'AI', to: { pathname: '/', hash: 'ai' } },
    { label: 'Product engagement', to: { pathname: '/', hash: 'engagement' } },
    { label: 'Event tracking', to: { pathname: '/', hash: 'events' } },
    { label: 'Developers', to: { pathname: '/', hash: 'developers' } },
    { label: 'Agent governance', to: { pathname: '/', hash: 'governance' } },
    { label: 'Security', to: { pathname: '/', hash: 'security' } }
  ];

  const guideIds = ['getting-started', 'workspaces-and-roles', 'tasks', 'slas', 'ai', 'product-engagement', 'developer-integrations', 'troubleshooting'];
  const guide: FooterLink[] = GUIDE_SECTIONS.filter((s) => guideIds.includes(s.id)).map((s) => ({
    label: s.label,
    to: { pathname: '/guide', hash: s.id }
  }));

  const account: FooterLink[] = user
    ? [
        { label: 'Open app', to: '/dashboard' },
        { label: 'Product guide', to: '/guide' }
      ]
    : [
        { label: 'Log in', to: '/login' },
        { label: 'Create an account', to: '/register' },
        { label: 'Product guide', to: '/guide' }
      ];

  const columns = [
    { title: 'Product', links: product },
    { title: 'Guide', links: guide },
    { title: 'Account', links: account }
  ];

  return (
    <footer className="border-t border-slate-200 bg-white px-4 pb-8 pt-12 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 grid content-start gap-3">
            <Link aria-label="Pristine home" className="w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20" to="/">
              <Logo />
            </Link>
            <p className="m-0 max-w-xs text-[13px] leading-relaxed text-slate-500">
              One workspace to plan and ship work, and to guide and understand the people who use your product.
            </p>
          </div>

          {columns.map((col) => (
            <nav aria-label={`${col.title} links`} className="grid content-start gap-3" key={col.title}>
              <h2 className="m-0 text-sm font-medium text-slate-900">{col.title}</h2>
              <ul className="m-0 grid list-none gap-2 p-0">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link className={linkCls} to={link.to}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Pristine</span>
          <span>Work management, product engagement and developer tools in one workspace.</span>
        </div>
      </div>
    </footer>
  );
}
