import { ArrowRight, Building2, GraduationCap, Layers, MapPin, ShieldCheck } from 'lucide-react';
import { Property, UserRole } from '../types';
import { getPropertyStats } from '../utils/storage';
import { SEED_IMAGES } from '../data/seedData';
import ResilientImage from './ResilientImage';

interface LandingScreenProps {
  properties: Property[];
  onSelectRole: (role: Exclude<UserRole, 'landing'>) => void;
}

export default function LandingScreen({ properties, onSelectRole }: LandingScreenProps) {
  const uniqueLocations = Array.from(new Set(properties.map((p) => p.location.trim())));
  const totals = properties.reduce(
    (acc, prop) => {
      const s = getPropertyStats(prop);
      acc.floors += s.totalFloors;
      acc.rooms += s.totalRooms;
      acc.available += s.availableRooms;
      return acc;
    },
    { floors: 0, rooms: 0, available: 0 }
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* Hero Header & Balanced Editorial Split */}
      <section className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        <div className="flex flex-col justify-center lg:col-span-7">
          <p className="text-sm font-medium text-indigo-600">
            Hostel & PG Floor-Plan Management
          </p>
          <h1
            className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.12]"
            style={{ textWrap: 'balance' }}
          >
            Visual floor plans and real-time room availability for student housing.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            StayGrid connects property owners and students through clear 2D floor grids—showing
            exact room rents, utility inclusions, maintenance records, and live occupancy without
            phone tag.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span>{properties.length} Listed Properties</span>
            <span aria-hidden="true">·</span>
            <span>{uniqueLocations.length} Neighborhoods</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-medium text-emerald-700 tabular-nums">
              {totals.available} Rooms Available Now
            </span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white sm:h-72 lg:h-full">
            <ResilientImage
              src={SEED_IMAGES.commonLounge}
              alt="Sunlit modern student hostel common lounge and study hall"
              className="h-full w-full object-cover"
              fallbackLabel="StayGrid Student Residences"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-5">
              <p className="text-sm font-semibold text-white">
                Instant Sync Across Landlord & Tenant Views
              </p>
              <p className="mt-0.5 text-xs text-slate-200">
                {totals.floors} mapped floors across {uniqueLocations.join(' · ')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection Interactive Cards */}
      <section
        id="role-selection-grid"
        aria-labelledby="choose-role-heading"
        className="mt-12"
      >
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2
              id="choose-role-heading"
              className="font-display text-2xl font-bold tracking-tight text-slate-900"
            >
              Choose how you want to use StayGrid
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Select your workspace below. You can switch roles at any time from the top bar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
          {/* Student / Tenant Card */}
          <article
            onClick={() => onSelectRole('tenant')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectRole('tenant');
              }
            }}
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 transition-all duration-150 hover:border-indigo-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <GraduationCap className="h-6 w-6" aria-hidden="true" />
                </div>
                <span className="font-mono text-xs font-medium text-emerald-700 tabular-nums">
                  {totals.available} open rooms
                </span>
              </div>

              <h3 className="mt-5 font-display text-xl font-bold text-slate-900">
                Student / Tenant
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Browse hostels and PGs in your preferred neighborhood, search host names with
                predictive typing, inspect color-coded 2D floor plans, and review rent, utility
                inclusions, photos, and maintenance notes before scheduling a visit.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-5 text-sm text-slate-700 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>Location & predictive search</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>Transparent utility bills</span>
                </div>
              </div>
            </div>

            <div className="mt-7">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRole('tenant');
                }}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:w-auto"
              >
                <span>Continue as Student / Tenant</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </article>

          {/* Landlord / Property Owner Card */}
          <article
            onClick={() => onSelectRole('landlord')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectRole('landlord');
              }
            }}
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 transition-all duration-150 hover:border-slate-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-800 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                  <Building2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <span className="font-mono text-xs font-medium text-slate-600 tabular-nums">
                  {totals.rooms} total units
                </span>
              </div>

              <h3 className="mt-5 font-display text-xl font-bold text-slate-900">
                Landlord / Property Owner
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Set up your hostel or PG, add floors dynamically, auto-generate 2D room grids,
                upload room photos, configure electricity/water/gas inclusions, and monitor live
                occupancy with real-time analytics.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-5 text-sm text-slate-700 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>Dynamic 2D floor builder</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>Live occupancy analytics</span>
                </div>
              </div>
            </div>

            <div className="mt-7">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRole('landlord');
                }}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:w-auto"
              >
                <span>Continue as Landlord</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* Full-Width Live Inventory Strip */}
      <section
        aria-label="Live platform inventory summary"
        className="mt-10 grid grid-cols-2 gap-4 border-t border-slate-200 pt-8 sm:grid-cols-4"
      >
        <div>
          <p className="text-xs font-medium text-slate-500">Active Hostels & PGs</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {properties.length}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Mapped Floors</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {totals.floors}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Total Rooms Listed</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {totals.rooms}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Ready to Move In</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
            {totals.available}
          </p>
        </div>
      </section>
    </main>
  );
}
