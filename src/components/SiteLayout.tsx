import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Camera, Instagram, Menu, Pin, X } from 'lucide-react';
import { fetchSiteSettings } from '@/lib/api/public';
import { useAsyncData } from '@/hooks/useAsyncData';
import type { SiteSettings } from '@/lib/types';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/services', label: 'Services' },
  { to: '/booking', label: 'Booking' },
  { to: '/contact', label: 'Contact' },
];

export function BrandMark({ name }: { name: string }) {
  return (
    <Link to="/" className="group flex items-center gap-3" aria-label={`${name} photography home`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-800 text-cream-50 transition duration-500 group-hover:rotate-[-8deg]">
        <Camera className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="font-display text-2xl font-semibold tracking-wide text-charcoal-900">{name}</span>
    </Link>
  );
}

export function SocialLinks({ settings, className = '' }: { settings: SiteSettings; className?: string }) {
  const links = [
    { href: settings.instagram_url, label: 'Instagram', icon: Instagram },
    { href: settings.pinterest_url, label: 'Pinterest', icon: Pin },
  ].filter((link) => link.href);

  if (links.length === 0) return null;

  return (
    <ul className={`flex items-center gap-3 ${className}`}>
      {links.map(({ href, label, icon: Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${settings.photographer_name} on ${label}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-charcoal-800/15 bg-white/70 text-charcoal-800 transition duration-300 hover:-translate-y-0.5 hover:bg-baby-200 hover:text-charcoal-900"
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function Navbar({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-500 ${
        scrolled || open ? 'bg-cream-100/95 shadow-soft backdrop-blur-md' : 'bg-cream-100/70'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Main">
        <BrandMark name={name} />
        <ul className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm transition duration-300 ${
                    isActive ? 'bg-charcoal-800 text-cream-50' : 'text-charcoal-700 hover:bg-baby-200/70 hover:text-charcoal-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full p-2 text-charcoal-800 transition hover:bg-charcoal-800/5 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </nav>
      {open && (
        <ul id="mobile-menu" className="animate-fade-in border-t border-charcoal-800/10 px-5 pb-6 pt-3 lg:hidden">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-base transition ${isActive ? 'bg-baby-200 text-charcoal-900' : 'text-charcoal-700 hover:bg-baby-100'}`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

function Footer({ settings }: { settings: SiteSettings | null }) {
  return (
    <footer className="mt-24 border-t border-charcoal-800/10 bg-charcoal-900 text-cream-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-3">
        <div className="space-y-4">
          <p className="font-display text-3xl">{settings?.photographer_name ?? 'Shasank'}</p>
          <p className="max-w-xs text-sm leading-relaxed text-cream-200/80">
            {settings?.tagline || 'Quiet, honest photography for portraits, celebrations and live moments.'}
          </p>
          {settings && <SocialLinks settings={settings} />}
        </div>
        <div className="space-y-3 text-sm text-cream-200/90">
          <p className="eyebrow text-baby-200">Explore</p>
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="transition hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 text-sm text-cream-200/90">
          <p className="eyebrow text-baby-200">Contact</p>
          {settings?.city && <p>{settings.city}</p>}
          {settings?.contact_email && (
            <p>
              <a className="transition hover:text-white" href={`mailto:${settings.contact_email}`}>
                {settings.contact_email}
              </a>
            </p>
          )}
          {settings?.contact_phone && (
            <p>
              <a className="transition hover:text-white" href={`tel:${settings.contact_phone.replace(/\s/g, '')}`}>
                {settings.contact_phone}
              </a>
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-cream-200/70 sm:px-8">
        &copy; {new Date().getFullYear()} {settings?.photographer_name ?? 'Shasank'} Photography. All rights reserved.
      </div>
    </footer>
  );
}

export default function SiteLayout() {
  const { data: settings } = useAsyncData(fetchSiteSettings, []);
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-charcoal-800 focus:px-4 focus:py-2 focus:text-cream-50"
      >
        Skip to content
      </a>
      <Navbar name={settings?.photographer_name ?? 'Shasank'} />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer settings={settings} />
    </div>
  );
}
