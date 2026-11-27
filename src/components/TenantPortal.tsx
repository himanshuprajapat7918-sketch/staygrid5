import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Search,
  User,
  X,
} from 'lucide-react';
import { Property, Room, TenantProfile, VisitRequest } from '../types';
import {
  formatINR,
  getPropertyCoverImage,
  getPropertyStats,
  isValidEmail,
  isValidPhone,
} from '../utils/storage';
import ResilientImage from './ResilientImage';
import RoomDetailModal from './RoomDetailModal';

interface TenantPortalProps {
  properties: Property[];
  tenantProfile: TenantProfile | null;
  visitRequests: VisitRequest[];
  onSaveTenantProfile: (profile: TenantProfile) => void;
  onCreateVisitRequest: (property: Property, room: Room) => void;
}

function renderHighlightedMatch(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const idx = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + trimmed.length);
  const after = text.slice(idx + trimmed.length);
  return (
    <>
      {before}
      <span className="font-semibold text-indigo-700">{match}</span>
      {after}
    </>
  );
}

export default function TenantPortal({
  properties,
  tenantProfile,
  visitRequests,
  onSaveTenantProfile,
  onCreateVisitRequest,
}: TenantPortalProps) {
  const [fullName, setFullName] = useState(tenantProfile?.fullName ?? '');
  const [phone, setPhone] = useState(tenantProfile?.phone ?? '');
  const [email, setEmail] = useState(tenantProfile?.email ?? '');
  const [preferredLocation, setPreferredLocation] = useState(
    tenantProfile?.preferredLocation ?? properties[0]?.location ?? ''
  );
  const [isEditingProfile, setIsEditingProfile] = useState(!tenantProfile);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Predictive hostel-name search state
  const [hostelQuery, setHostelQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  // Selected hostel for 2D floor grid inspection
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  // Room detail modal state
  const [selectedRoomCtx, setSelectedRoomCtx] = useState<{
    property: Property;
    floorName: string;
    room: Room;
  } | null>(null);

  const availableLocations = useMemo(
    () => Array.from(new Set(properties.map((p) => p.location.trim()).filter(Boolean))),
    [properties]
  );

  // Close predictive dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const activeLocation = (tenantProfile?.preferredLocation ?? preferredLocation).trim();

  // Properties matching the tenant's preferred location
  const locationMatchedProperties = useMemo(() => {
    if (!activeLocation) return properties;
    const locNeedle = activeLocation.toLowerCase();
    return properties.filter((p) => p.location.toLowerCase().includes(locNeedle));
  }, [properties, activeLocation]);

  // Predictive typing suggestions across all hostel names (prioritizing prefix matches & preferred location)
  const predictiveSuggestions = useMemo(() => {
    const q = hostelQuery.trim().toLowerCase();
    if (!q) return [];
    const locNeedle = activeLocation.toLowerCase();

    return [...properties]
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 1 : 0;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;

        const aInLoc = locNeedle && a.location.toLowerCase().includes(locNeedle) ? 1 : 0;
        const bInLoc = locNeedle && b.location.toLowerCase().includes(locNeedle) ? 1 : 0;
        if (aInLoc !== bInLoc) return bInLoc - aInLoc;

        return a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [properties, hostelQuery, activeLocation]);

  // Inline ghost-text completion when top suggestion starts with the exact typed prefix
  const inlinePrediction = useMemo(() => {
    const raw = hostelQuery;
    if (!raw.trim() || predictiveSuggestions.length === 0) return '';
    const topName = predictiveSuggestions[0].name;
    if (topName.toLowerCase().startsWith(raw.toLowerCase())) {
      return raw + topName.slice(raw.length);
    }
    return '';
  }, [hostelQuery, predictiveSuggestions]);

  // Displayed hostels:
  // - If hostelQuery is empty: show hostels in preferred location
  // - If hostelQuery is typed: filter preferred location hostels by name; if none in preferred location
  //   match the typed name directly, surface exact name matches across all locations so predictive selection works seamlessly
  const displayedProperties = useMemo(() => {
    const q = hostelQuery.trim().toLowerCase();
    if (!q) return locationMatchedProperties;

    const inLocation = locationMatchedProperties.filter((p) =>
      p.name.toLowerCase().includes(q)
    );
    if (inLocation.length > 0) return inLocation;

    return properties.filter((p) => p.name.toLowerCase().includes(q));
  }, [hostelQuery, locationMatchedProperties, properties]);

  // Keep expanded property fresh if properties update in localStorage
  const activeModalData = useMemo(() => {
    if (!selectedRoomCtx) return null;
    const latestProp = properties.find((p) => p.id === selectedRoomCtx.property.id);
    if (!latestProp) return null;
    for (const fl of latestProp.floors) {
      const rm = fl.rooms.find((r) => r.id === selectedRoomCtx.room.id);
      if (rm) return { property: latestProp, floorName: fl.name, room: rm };
    }
    return null;
  }, [properties, selectedRoomCtx]);

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Full name is required.';
    if (!isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit phone number.';
    if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
    if (!preferredLocation.trim())
      errors.preferredLocation = 'Please enter or select your preferred location.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const nextProfile: TenantProfile = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      preferredLocation: preferredLocation.trim(),
    };
    onSaveTenantProfile(nextProfile);
    setFormErrors({});
    setIsEditingProfile(false);
    setHostelQuery('');
    setExpandedPropertyId(null);
  };

  const handleQuickLocationSwitch = (loc: string) => {
    setPreferredLocation(loc);
    setHostelQuery('');
    setExpandedPropertyId(null);
    if (tenantProfile) {
      onSaveTenantProfile({ ...tenantProfile, preferredLocation: loc });
    }
  };

  const handleSelectPrediction = (property: Property) => {
    setHostelQuery(property.name);
    setIsDropdownOpen(false);
    setExpandedPropertyId(property.id);
    // If selected hostel belongs to another location, align preferred location cleanly
    if (
      tenantProfile &&
      !property.location.toLowerCase().includes(activeLocation.toLowerCase())
    ) {
      setPreferredLocation(property.location);
      onSaveTenantProfile({ ...tenantProfile, preferredLocation: property.location });
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && inlinePrediction && inlinePrediction !== hostelQuery) {
      const input = e.currentTarget;
      if (input.selectionStart === hostelQuery.length) {
        e.preventDefault();
        setHostelQuery(inlinePrediction);
        return;
      }
    }

    if (!isDropdownOpen || predictiveSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % predictiveSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(
        (prev) => (prev - 1 + predictiveSuggestions.length) % predictiveSuggestions.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = predictiveSuggestions[highlightedIndex] ?? predictiveSuggestions[0];
      if (chosen) {
        handleSelectPrediction(chosen);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-medium text-indigo-600">Student / Tenant Portal</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Find your hostel or PG room
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Inspect live 2D floor plans, transparent monthly rent, utility bills, and maintenance
          notes.
        </p>
      </div>

      {/* Onboarding & Preferred Location Section */}
      {isEditingProfile ? (
        <section
          aria-labelledby="tenant-onboarding-heading"
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
        >
          <div className="mb-5">
            <h2
              id="tenant-onboarding-heading"
              className="font-display text-lg font-bold text-slate-900"
            >
              Your Details & Preferred Location
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Enter your contact information and preferred area to see matching hostels and request
              visits.
            </p>
          </div>

          <form onSubmit={handleOnboardingSubmit} noValidate className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="tenant-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  id="tenant-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setFormErrors((p) => ({ ...p, fullName: '' }));
                  }}
                  placeholder="e.g. Aarav Kulkarni"
                  className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                    formErrors.fullName
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
                {formErrors.fullName && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.fullName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="tenant-phone"
                  className="block text-sm font-medium text-slate-700"
                >
                  Phone Number <span className="text-rose-600">*</span>
                </label>
                <input
                  id="tenant-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setFormErrors((p) => ({ ...p, phone: '' }));
                  }}
                  placeholder="+91 98765 43210"
                  className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                    formErrors.phone
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
                {formErrors.phone && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="tenant-email"
                  className="block text-sm font-medium text-slate-700"
                >
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  id="tenant-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormErrors((p) => ({ ...p, email: '' }));
                  }}
                  placeholder="aarav.k@university.edu"
                  className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                    formErrors.email
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
                {formErrors.email && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="tenant-location"
                  className="block text-sm font-medium text-slate-700"
                >
                  Preferred Location <span className="text-rose-600">*</span>
                </label>
                <input
                  id="tenant-location"
                  type="text"
                  list="tenant-locations-datalist"
                  value={preferredLocation}
                  onChange={(e) => {
                    setPreferredLocation(e.target.value);
                    setFormErrors((p) => ({ ...p, preferredLocation: '' }));
                  }}
                  placeholder="Type or choose a neighborhood..."
                  className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                    formErrors.preferredLocation
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
                <datalist id="tenant-locations-datalist">
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
                {formErrors.preferredLocation && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.preferredLocation}</p>
                )}
              </div>
            </div>

            {availableLocations.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                <span>Available locations:</span>
                {availableLocations.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setPreferredLocation(loc);
                      setFormErrors((p) => ({ ...p, preferredLocation: '' }));
                    }}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      preferredLocation.trim().toLowerCase() === loc.toLowerCase()
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
              {tenantProfile && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="min-h-[42px] whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="min-h-[42px] whitespace-nowrap rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Explore Hostels & PGs
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          {/* Compact Tenant Profile Summary Bar */}
          <section
            aria-label="Active tenant search profile"
            className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                <User className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                {tenantProfile?.fullName}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Preferred Location:{' '}
                <strong className="font-semibold text-slate-900">{activeLocation}</strong>
              </span>
              <span className="hidden text-slate-300 md:inline" aria-hidden="true">
                ·
              </span>
              <span className="hidden text-xs text-slate-500 md:inline">
                {tenantProfile?.phone} · {tenantProfile?.email}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 self-start whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:self-auto"
            >
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Edit Details / Location</span>
            </button>
          </section>

          {/* Predictive Typing Search Bar for Hostel Names (no extra filters or sorting controls) */}
          <section aria-label="Search hostels by name" className="mt-6">
            <div ref={searchBoxRef} className="relative max-w-2xl">
              <label htmlFor="hostel-predictive-search" className="sr-only">
                Search hostel or PG by name
              </label>

              <div className="relative flex items-center rounded-xl border border-slate-300 bg-white transition-colors focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100">
                <Search
                  className="pointer-events-none ml-4 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />

                {/* Stacked Ghost Predictive Layer + Real Input */}
                <div className="relative flex-1 overflow-hidden">
                  {inlinePrediction && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 flex items-center truncate px-3 text-sm text-slate-400 select-none"
                    >
                      <span className="invisible whitespace-pre">{hostelQuery}</span>
                      <span className="truncate">{inlinePrediction.slice(hostelQuery.length)}</span>
                    </div>
                  )}
                  <input
                    id="hostel-predictive-search"
                    type="text"
                    value={hostelQuery}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={isDropdownOpen && predictiveSuggestions.length > 0}
                    aria-controls="hostel-predictions-listbox"
                    aria-autocomplete="both"
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setHostelQuery(e.target.value);
                      setIsDropdownOpen(true);
                      setHighlightedIndex(0);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search hostels by name (e.g., Horizon, Cedar, Maple)..."
                    className="relative z-10 w-full bg-transparent px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                {inlinePrediction && inlinePrediction !== hostelQuery && (
                  <span className="mr-2 hidden shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline">
                    Tab
                  </span>
                )}

                {hostelQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setHostelQuery('');
                      setIsDropdownOpen(false);
                    }}
                    className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Predictive Typing Suggestions Dropdown */}
              {isDropdownOpen && predictiveSuggestions.length > 0 && (
                <ul
                  id="hostel-predictions-listbox"
                  role="listbox"
                  className="absolute right-0 left-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
                >
                  {predictiveSuggestions.map((prop, idx) => {
                    const pStats = getPropertyStats(prop);
                    const isHighlighted = idx === highlightedIndex;
                    const inPreferred =
                      !activeLocation ||
                      prop.location.toLowerCase().includes(activeLocation.toLowerCase());

                    return (
                      <li
                        key={prop.id}
                        role="option"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectPrediction(prop);
                        }}
                        className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-2.5 text-sm transition-colors ${
                          isHighlighted ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {renderHighlightedMatch(prop.name, hostelQuery)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {prop.location}
                            {!inPreferred && ' · Different location'}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-medium text-emerald-700 tabular-nums">
                          {pStats.availableRooms} avail.
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Matching Hostels & PGs Section */}
          <section aria-labelledby="matching-hostels-heading" className="mt-7">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id="matching-hostels-heading"
                className="font-display text-lg font-bold text-slate-900"
              >
                {hostelQuery.trim()
                  ? `Search Results for “${hostelQuery.trim()}”`
                  : `Hostels & PGs in ${activeLocation}`}
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {displayedProperties.length}{' '}
                {displayedProperties.length === 1 ? 'property' : 'properties'} found
              </span>
            </div>

            {displayedProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <Building2 className="h-9 w-9 text-slate-400" aria-hidden="true" />
                <h3 className="mt-3 font-display text-base font-bold text-slate-900">
                  No hostels or PGs found
                </h3>
                <p className="mt-1 max-w-md text-sm text-slate-600">
                  {hostelQuery.trim()
                    ? `We could not find any hostel matching “${hostelQuery.trim()}”. Clear the search or explore one of our active neighborhoods below.`
                    : `There are currently no listed hostels in “${activeLocation}”. Try one of our active locations below or add one in the Landlord Studio.`}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {hostelQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => setHostelQuery('')}
                      className="min-h-[38px] rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Clear Search
                    </button>
                  )}
                  {availableLocations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => handleQuickLocationSwitch(loc)}
                      className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700"
                    >
                      Explore {loc}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {displayedProperties.map((property) => {
                  const pStats = getPropertyStats(property);
                  const coverImage = getPropertyCoverImage(property);
                  const isExpanded = expandedPropertyId === property.id;

                  return (
                    <article
                      key={property.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-sm"
                    >
                      {/* Property Card Summary Row */}
                      <div className="grid grid-cols-1 lg:grid-cols-12">
                        <div className="h-52 bg-slate-100 lg:col-span-4 lg:h-full">
                          <ResilientImage
                            src={coverImage}
                            alt={`${property.name} room preview`}
                            className="h-full w-full object-cover"
                            fallbackLabel={property.name}
                          />
                        </div>

                        <div className="flex flex-col justify-between p-6 lg:col-span-8">
                          <div>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <h3 className="font-display text-xl font-bold text-slate-900">
                                  {property.name}
                                </h3>
                                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                                  <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                  <span>{property.location}</span>
                                </p>
                              </div>

                              <div className="text-left sm:text-right">
                                <p className="text-xs text-slate-500">Starting from</p>
                                <p className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                                  {pStats.minRent > 0 ? formatINR(pStats.minRent) : '—'}
                                  <span className="font-sans text-xs font-normal text-slate-500">
                                    /mo
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Clean Unboxed Metadata Row */}
                            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-slate-100 py-3 text-sm">
                              <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                                {pStats.availableRooms} Available
                              </span>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="font-mono font-medium text-rose-700 tabular-nums">
                                {pStats.occupiedRooms} Occupied
                              </span>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-slate-600">
                                {pStats.totalFloors}{' '}
                                {pStats.totalFloors === 1 ? 'Floor' : 'Floors'} ({pStats.totalRooms}{' '}
                                rooms)
                              </span>
                            </div>

                            {/* Landlord Contact Info */}
                            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
                              <span className="font-medium text-slate-800">
                                Landlord: {property.owner.name}
                              </span>
                              <span className="inline-flex items-center gap-1.5 font-mono">
                                <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                {property.owner.phone}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                {property.owner.email}
                              </span>
                            </div>
                          </div>

                          <div className="mt-6 flex items-center justify-between gap-4">
                            <span className="text-xs text-slate-500">
                              Click any room in the floor plan to inspect photos, bills & notes
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPropertyId(isExpanded ? null : property.id)
                              }
                              className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                                isExpanded
                                  ? 'border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              <span>{isExpanded ? 'Hide 2D Floor Plan' : 'View 2D Floor Plan'}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Interactive 2D Floor Grid */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 bg-slate-50/75 p-6">
                          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="font-display text-base font-bold text-slate-900">
                                Interactive 2D Floor Plan — {property.name}
                              </h4>
                              <p className="text-xs text-slate-500">
                                Select any room box to view full gallery, utility inclusions, and
                                landlord notes.
                              </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-medium">
                              <span className="flex items-center gap-1.5 text-emerald-700">
                                <span
                                  className="h-2.5 w-2.5 rounded-xs border border-emerald-400 bg-emerald-100"
                                  aria-hidden="true"
                                />
                                Available
                              </span>
                              <span className="flex items-center gap-1.5 text-rose-700">
                                <span
                                  className="h-2.5 w-2.5 rounded-xs border border-rose-400 bg-rose-100"
                                  aria-hidden="true"
                                />
                                Occupied
                              </span>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {property.floors.map((floor) => {
                              const flAvail = floor.rooms.filter(
                                (r) => r.status === 'available'
                              ).length;

                              return (
                                <div key={floor.id}>
                                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                                    <h5 className="font-display text-sm font-bold text-slate-900">
                                      {floor.name}
                                    </h5>
                                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                                      {flAvail} of {floor.rooms.length} available
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                                    {floor.rooms.map((room) => {
                                      const isAvail = room.status === 'available';
                                      const requested = visitRequests.some(
                                        (vr) =>
                                          vr.propertyId === property.id && vr.roomId === room.id
                                      );

                                      return (
                                        <button
                                          key={room.id}
                                          type="button"
                                          onClick={() =>
                                            setSelectedRoomCtx({
                                              property,
                                              floorName: floor.name,
                                              room,
                                            })
                                          }
                                          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                                            isAvail
                                              ? 'border-emerald-300 bg-emerald-50/75 hover:border-emerald-500'
                                              : 'border-rose-300 bg-rose-50/75 hover:border-rose-400'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                                              {room.label}
                                            </span>
                                            <span
                                              className={`text-[11px] font-semibold ${
                                                isAvail ? 'text-emerald-700' : 'text-rose-700'
                                              }`}
                                            >
                                              {isAvail ? 'Available' : 'Occupied'}
                                            </span>
                                          </div>

                                          <div className="mt-3">
                                            <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                                              {formatINR(room.rent)}
                                              <span className="font-sans text-[11px] font-normal text-slate-500">
                                                /mo
                                              </span>
                                            </p>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                              {requested ? 'Visit requested' : 'Inspect room'}
                                            </p>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Room Detail Modal */}
      {activeModalData && (
        <RoomDetailModal
          property={activeModalData.property}
          floorName={activeModalData.floorName}
          room={activeModalData.room}
          tenantProfile={tenantProfile}
          hasRequestedVisit={visitRequests.some(
            (vr) =>
              vr.propertyId === activeModalData.property.id &&
              vr.roomId === activeModalData.room.id
          )}
          onRequestVisit={onCreateVisitRequest}
          onClose={() => setSelectedRoomCtx(null)}
        />
      )}
    </main>
  );
}
