import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, Menu, X } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { buttonClass, cn } from '@/components/ui';

import { Logo } from './primitives';
import { LANDING_NAV_LINKS } from './sections';

const linkCls =
  'whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 xl:px-3';

/** Sticky top navigation shared by the landing page and the guide. */
export default function MarketingNav(): JSX.Element {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the phone menu whenever the route or hash changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash, location.key]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md transition-colors',
        scrolled || menuOpen ? 'border-slate-200' : 'border-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          aria-label="Pristine home"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
          to="/"
        >
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          {LANDING_NAV_LINKS.map((link) => (
            <Link className={linkCls} key={link.id} to={{ pathname: '/', hash: link.id }}>
              {link.label}
            </Link>
          ))}
          <NavLink
            className={({ isActive }) => cn(linkCls, isActive && 'bg-slate-100 text-slate-900')}
            to="/guide"
          >
            Guide
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link className={buttonClass('primary', 'md')} to="/dashboard">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Open app
              <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link className={buttonClass('ghost', 'md', 'hidden sm:inline-flex')} to="/login">
                Log in
              </Link>
              <Link className={buttonClass('primary', 'md')} to="/register">
                Get started
              </Link>
            </>
          )}
          <button
            aria-controls="marketing-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className={buttonClass('ghost', 'icon', 'lg:hidden')}
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 shadow-sm lg:hidden" id="marketing-menu">
          <nav aria-label="Primary (mobile)" className="mx-auto grid max-w-6xl gap-0.5">
            {LANDING_NAV_LINKS.map((link) => (
              <Link
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                key={link.id}
                onClick={() => setMenuOpen(false)}
                to={{ pathname: '/', hash: link.id }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setMenuOpen(false)}
              to="/guide"
            >
              <BookOpen className="text-slate-400" size={16} /> Guide
            </Link>
            {!user ? (
              <Link
                className={buttonClass('secondary', 'md', 'mt-2 h-10 sm:hidden')}
                onClick={() => setMenuOpen(false)}
                to="/login"
              >
                Log in
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
