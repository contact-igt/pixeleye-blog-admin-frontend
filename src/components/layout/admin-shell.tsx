'use client';

import { Activity, ChevronDown, ChevronRight, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { navigation } from '@/constants/navigation';

function initials(name?: string | null) {
  if (!name) return 'PE';
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'PE';
}

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const pathname = usePathname() ?? '/dashboard';
  const { admin, logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const adminInitials = useMemo(() => initials(admin?.name), [admin?.name]);
  const visibleNavigation = useMemo(() => navigation.filter((item) => !admin?.role || item.allowedRoles.includes(admin.role)), [admin?.role]);
  const activeNavItem = visibleNavigation.find((item) => item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href));

  useEffect(() => {
    setExpandedMenus(prev => {
      let changed = false;
      const next = { ...prev };
      visibleNavigation.forEach(item => {
        if (item.children) {
          const isActive = pathname.startsWith(item.href) || item.children.some(c => pathname.startsWith(c.href));
          if (isActive && next[item.href] === undefined) {
            next[item.href] = true;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [pathname, visibleNavigation]);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', closeMenus);
    return () => document.removeEventListener('mousedown', closeMenus);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') setMobileOpen(false); }
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', closeOnEscape); };
  }, [mobileOpen]);

  useEffect(() => {
    function closeUserMenu(event: KeyboardEvent) { if (event.key === 'Escape') setUserMenuOpen(false); }
    document.addEventListener('keydown', closeUserMenu);
    return () => document.removeEventListener('keydown', closeUserMenu);
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  }

  return (
    <div className="crm-panel h-screen overflow-hidden bg-slate-50 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a href="#main-content" className="focus-ring fixed left-3 top-3 z-[70] -translate-y-20 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white focus:translate-y-0">Skip to content</a>

      {mobileOpen && <button type="button" className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <aside id="admin-navigation" aria-label="Admin sidebar" className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-slate-800 bg-slate-950 text-slate-100 shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <Link href="/dashboard" className="focus-ring flex items-center gap-3 rounded-lg">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500 text-white"><Activity size={18} aria-hidden="true" /></span>
            <span><span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-sky-400">Pixel Eye</span><span className="block text-sm font-bold text-white">Healthcare CMS</span></span>
          </Link>
          <button type="button" className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} aria-hidden="true" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6" aria-label="Main navigation">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
          <div className="space-y-1">
            {visibleNavigation.map(({ label, href, icon: Icon, children }) => {
              const active = href === '/dashboard' ? pathname === href : (pathname.startsWith(href) || (children && children.some(c => pathname.startsWith(c.href))));
              const isExpanded = expandedMenus[href] ?? active;
              
              return (
                <div key={href} className="space-y-1">
                  {children ? (
                    <button
                      type="button"
                      onClick={() => setExpandedMenus(prev => ({ ...prev, [href]: !isExpanded }))}
                      className={`focus-ring flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} aria-hidden="true" />
                        <span>{label}</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <Link href={href} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined} className={`focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}>
                      <Icon size={18} aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  )}
                  
                  {children && isExpanded && (
                    <div className="pl-11 pr-3 space-y-1 mt-1">
                      {children.map((child) => {
                        const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
                        return (
                          <Link key={child.href} href={child.href} onClick={() => setMobileOpen(false)} aria-current={childActive ? 'page' : undefined} className={`focus-ring block rounded-md px-3 py-2 text-sm font-medium transition-colors ${childActive ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-xs text-slate-300"><ShieldCheck size={15} className="text-emerald-400" aria-hidden="true" /><span className="truncate capitalize">{admin?.role?.replace('_', ' ') ?? 'Authenticated user'}</span></div>
        </div>
      </aside>

      <div className="h-screen min-w-0 overflow-y-auto overflow-x-hidden">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-controls="admin-navigation" aria-expanded={mobileOpen}><Menu size={18} aria-hidden="true" /></button>
            <div className="flex min-w-0 items-center gap-2 text-sm"><span className="hidden text-slate-500 sm:inline">Pixel Eye Admin</span><ChevronRight size={14} className="hidden text-slate-300 sm:block" aria-hidden="true" /><span className="truncate font-semibold text-slate-900">{activeNavItem?.label ?? 'Admin'}</span></div>
          </div>

          <div className="relative" ref={menuRef}>
            <button type="button" onClick={() => setUserMenuOpen((value) => !value)} className="focus-ring flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2.5 hover:bg-slate-50" aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label="User menu">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-xs font-bold text-sky-700">{adminInitials}</span>
              <span className="hidden text-left sm:block"><span className="block max-w-40 truncate text-xs font-bold text-slate-900">{admin?.name ?? 'Admin'}</span><span className="block text-[10px] capitalize text-slate-500">{admin?.role?.replace('_', ' ') ?? 'User'}</span></span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {userMenuOpen && <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><div className="border-b border-slate-100 px-2 py-2"><p className="truncate text-sm font-bold text-slate-900">{admin?.name ?? 'Administrator'}</p><p className="truncate text-xs text-slate-500">{admin?.email ?? ''}</p></div><button type="button" role="menuitem" onClick={() => void handleLogout()} disabled={loggingOut} className="focus-ring mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"><LogOut size={15} aria-hidden="true" />{loggingOut ? 'Signing out...' : 'Sign out'}</button></div>}
          </div>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-[1440px] min-w-0 overflow-x-clip p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

