import { ArrowLeftRight } from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  role: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export default function Navbar({ role, onSelectRole }: NavbarProps) {
  const handleSwitchRole = () => {
    if (role === 'landing') {
      const el = document.getElementById('role-selection-grid');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    onSelectRole('landing');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectRole('landing')}
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
          aria-label="StayGrid Home"
        >
          <span
            className="grid h-8 w-8 shrink-0 grid-cols-2 gap-1 rounded-lg bg-slate-900 p-1.5"
            aria-hidden="true"
          >
            <span className="rounded-[2px] bg-white" />
            <span className="rounded-[2px] bg-indigo-400" />
            <span className="rounded-[2px] bg-emerald-400" />
            <span className="rounded-[2px] bg-white/85" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">
            StayGrid
          </span>
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-7 text-sm font-medium md:flex"
        >
          <button
            type="button"
            onClick={() => onSelectRole('landing')}
            className={`whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors ${
              role === 'landing'
                ? 'border-indigo-600 text-slate-900'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => onSelectRole('tenant')}
            className={`whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors ${
              role === 'tenant'
                ? 'border-indigo-600 text-slate-900'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            Student / Tenant
          </button>
          <button
            type="button"
            onClick={() => onSelectRole('landlord')}
            className={`whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors ${
              role === 'landlord'
                ? 'border-indigo-600 text-slate-900'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            Landlord Studio
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={handleSwitchRole}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <ArrowLeftRight className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            <span>Switch Role</span>
          </button>
        </div>
      </div>
    </header>
  );
}
