import { useMemo, useState } from 'react';
import {
  Camera,
  Check,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { Floor, Property, Room } from '../types';
import {
  formatINR,
  getPropertyStats,
  isValidEmail,
  isValidPhone,
} from '../utils/storage';
import OccupancyChart from './OccupancyChart';
import RoomEditorModal from './RoomEditorModal';

interface LandlordDashboardProps {
  properties: Property[];
  onSaveProperty: (property: Property) => boolean;
  onNotify: (title: string, description: string, variant?: 'success' | 'info' | 'error') => void;
}

function createDefaultFloorName(index: number): string {
  return index === 0 ? 'Ground Floor' : `Floor ${index}`;
}

function generateRoomLabel(floorIndex: number, roomIndex: number): string {
  const num = roomIndex + 1;
  if (floorIndex === 0) {
    return `G-${String(num).padStart(2, '0')}`;
  }
  return `${floorIndex}${String(num).padStart(2, '0')}`;
}

function createEmptyProperty(): Property {
  return {
    id: `prop-${Date.now()}`,
    name: '',
    location: '',
    owner: {
      name: '',
      phone: '',
      email: '',
    },
    floors: [
      {
        id: `fl-${Date.now()}-0`,
        name: 'Ground Floor',
        rooms: [
          {
            id: `rm-${Date.now()}-1`,
            label: 'G-01',
            rent: 9500,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [],
            maintenanceNotes: '',
          },
          {
            id: `rm-${Date.now()}-2`,
            label: 'G-02',
            rent: 9500,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [],
            maintenanceNotes: '',
          },
          {
            id: `rm-${Date.now()}-3`,
            label: 'G-03',
            rent: 9500,
            status: 'occupied',
            utilities: { electricity: false, water: true, gas: true },
            images: [],
            maintenanceNotes: '',
          },
          {
            id: `rm-${Date.now()}-4`,
            label: 'G-04',
            rent: 9500,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [],
            maintenanceNotes: '',
          },
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function cloneProperty(p: Property): Property {
  return JSON.parse(JSON.stringify(p)) as Property;
}

export default function LandlordDashboard({
  properties,
  onSaveProperty,
  onNotify,
}: LandlordDashboardProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties[0]?.id ?? 'new'
  );
  const [draft, setDraft] = useState<Property>(() =>
    properties[0] ? cloneProperty(properties[0]) : createEmptyProperty()
  );
  const [roomCountInputs, setRoomCountInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const target = properties[0] ?? draft;
    for (const fl of target.floors) {
      initial[fl.id] = String(fl.rooms.length);
    }
    return initial;
  });
  const [editingRoomRef, setEditingRoomRef] = useState<{
    floorId: string;
    roomId: string;
  } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const existingLocations = useMemo(
    () => Array.from(new Set(properties.map((p) => p.location.trim()).filter(Boolean))),
    [properties]
  );

  const stats = useMemo(() => getPropertyStats(draft), [draft]);

  const handleSelectExistingProperty = (id: string) => {
    if (id === 'new') {
      const fresh = createEmptyProperty();
      setSelectedPropertyId('new');
      setDraft(fresh);
      setRoomCountInputs({ [fresh.floors[0].id]: String(fresh.floors[0].rooms.length) });
      setFormErrors({});
      setIsDirty(false);
      return;
    }

    const found = properties.find((p) => p.id === id);
    if (!found) return;
    const cloned = cloneProperty(found);
    setSelectedPropertyId(found.id);
    setDraft(cloned);
    const counts: Record<string, string> = {};
    for (const fl of cloned.floors) {
      counts[fl.id] = String(fl.rooms.length);
    }
    setRoomCountInputs(counts);
    setFormErrors({});
    setIsDirty(false);
  };

  const updateOwnerField = (field: 'name' | 'phone' | 'email', value: string) => {
    setDraft((prev) => ({
      ...prev,
      owner: { ...prev.owner, [field]: value },
    }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[`owner_${field}`];
      return next;
    });
    setIsDirty(true);
  };

  const updatePropertyField = (field: 'name' | 'location', value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setIsDirty(true);
  };

  const handleAddFloor = () => {
    const newFloorIndex = draft.floors.length;
    const newFloorId = `fl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const defaultRooms: Room[] = Array.from({ length: 4 }, (_, idx) => ({
      id: `rm-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      label: generateRoomLabel(newFloorIndex, idx),
      rent: 9500,
      status: 'available',
      utilities: { electricity: false, water: true, gas: true },
      images: [],
      maintenanceNotes: '',
    }));

    const newFloor: Floor = {
      id: newFloorId,
      name: createDefaultFloorName(newFloorIndex),
      rooms: defaultRooms,
    };

    setDraft((prev) => ({
      ...prev,
      floors: [...prev.floors, newFloor],
    }));
    setRoomCountInputs((prev) => ({ ...prev, [newFloorId]: '4' }));
    setIsDirty(true);
  };

  const handleRemoveFloor = (floorId: string) => {
    setDraft((prev) => ({
      ...prev,
      floors: prev.floors.filter((fl) => fl.id !== floorId),
    }));
    setIsDirty(true);
  };

  const handleFloorNameChange = (floorId: string, name: string) => {
    setDraft((prev) => ({
      ...prev,
      floors: prev.floors.map((fl) => (fl.id === floorId ? { ...fl, name } : fl)),
    }));
    setIsDirty(true);
  };

  const handleGenerateRoomsForFloor = (floorId: string, floorIndex: number) => {
    const rawCount = Number(roomCountInputs[floorId]);
    if (!Number.isInteger(rawCount) || rawCount < 1 || rawCount > 30) {
      onNotify(
        'Enter between 1 and 30 rooms',
        'Choose a valid room count for this floor before generating the grid.',
        'error'
      );
      return;
    }

    setDraft((prev) => ({
      ...prev,
      floors: prev.floors.map((fl) => {
        if (fl.id !== floorId) return fl;
        const current = fl.rooms;
        if (rawCount === current.length) return fl;
        if (rawCount < current.length) {
          return { ...fl, rooms: current.slice(0, rawCount) };
        }
        const additions: Room[] = [];
        for (let i = current.length; i < rawCount; i += 1) {
          additions.push({
            id: `rm-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            label: generateRoomLabel(floorIndex, i),
            rent: current[0]?.rent ?? 9500,
            status: 'available',
            utilities: { electricity: false, water: true, gas: true },
            images: [],
            maintenanceNotes: '',
          });
        }
        return { ...fl, rooms: [...current, ...additions] };
      }),
    }));
    setIsDirty(true);
  };

  const handleQuickToggleStatus = (floorId: string, roomId: string) => {
    setDraft((prev) => ({
      ...prev,
      floors: prev.floors.map((fl) => {
        if (fl.id !== floorId) return fl;
        return {
          ...fl,
          rooms: fl.rooms.map((rm) =>
            rm.id === roomId
              ? { ...rm, status: rm.status === 'available' ? 'occupied' : 'available' }
              : rm
          ),
        };
      }),
    }));
    setIsDirty(true);
  };

  const handleSaveRoom = (updatedRoom: Room) => {
    if (!editingRoomRef) return;
    setDraft((prev) => ({
      ...prev,
      floors: prev.floors.map((fl) => {
        if (fl.id !== editingRoomRef.floorId) return fl;
        return {
          ...fl,
          rooms: fl.rooms.map((rm) => (rm.id === updatedRoom.id ? updatedRoom : rm)),
        };
      }),
    }));
    setEditingRoomRef(null);
    setIsDirty(true);
    onNotify(
      `Room ${updatedRoom.label} updated`,
      'Remember to click "Save Property" to publish changes to tenants.',
      'info'
    );
  };

  const validateAndSaveProperty = () => {
    const errors: Record<string, string> = {};
    if (!draft.owner.name.trim()) errors.owner_name = 'Owner name is required.';
    if (!isValidPhone(draft.owner.phone))
      errors.owner_phone = 'Enter a valid 10-digit phone number.';
    if (!isValidEmail(draft.owner.email))
      errors.owner_email = 'Enter a valid email address.';
    if (!draft.name.trim()) errors.name = 'Hostel or PG name is required.';
    if (!draft.location.trim()) errors.location = 'Location is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      onNotify(
        'Please complete required details',
        'Check highlighted owner and property fields before saving.',
        'error'
      );
      return;
    }

    if (draft.floors.length === 0 || stats.totalRooms === 0) {
      onNotify(
        'Add at least one floor and room',
        'Your property needs at least one room in the 2D floor plan before publishing.',
        'error'
      );
      return;
    }

    const propertyToSave: Property = {
      ...draft,
      name: draft.name.trim(),
      location: draft.location.trim(),
      owner: {
        name: draft.owner.name.trim(),
        phone: draft.owner.phone.trim(),
        email: draft.owner.email.trim(),
      },
      floors: draft.floors.map((fl, idx) => ({
        ...fl,
        name: fl.name.trim() || createDefaultFloorName(idx),
      })),
      updatedAt: new Date().toISOString(),
    };

    const ok = onSaveProperty(propertyToSave);
    if (ok) {
      setSelectedPropertyId(propertyToSave.id);
      setDraft(cloneProperty(propertyToSave));
      setIsDirty(false);
      onNotify(
        'Property saved & published',
        `${propertyToSave.name} (${propertyToSave.location}) is now live in the Student / Tenant portal.`,
        'success'
      );
    } else {
      onNotify(
        'Storage limit reached',
        'Try removing a few high-resolution room photos and save again.',
        'error'
      );
    }
  };

  const activeEditingContext = useMemo(() => {
    if (!editingRoomRef) return null;
    const floor = draft.floors.find((f) => f.id === editingRoomRef.floorId);
    const room = floor?.rooms.find((r) => r.id === editingRoomRef.roomId);
    if (!floor || !room) return null;
    return { floor, room };
  }, [draft.floors, editingRoomRef]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Workspace Header & Property Switcher */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-medium text-indigo-600">Landlord / Property Owner Studio</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {draft.name.trim() || 'New Hostel / PG Listing'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure owner contacts, build 2D floor layouts, and publish live availability to
            students.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="property-selector" className="sr-only">
              Select property to manage
            </label>
            <select
              id="property-selector"
              value={selectedPropertyId}
              onChange={(e) => handleSelectExistingProperty(e.target.value)}
              className="min-h-[42px] rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.location}
                </option>
              ))}
              <option value="new">+ Create New Hostel / PG</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleSelectExistingProperty('new')}
            className="inline-flex min-h-[42px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New Property</span>
          </button>

          <button
            type="button"
            onClick={validateAndSaveProperty}
            className="inline-flex min-h-[42px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>Save Property</span>
          </button>
        </div>
      </div>

      {/* Live Occupancy Analytics Strip + Chart.js Doughnut */}
      <section
        aria-label="Live occupancy analytics"
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Live Occupancy Analytics
              </h2>
              {isDirty && (
                <span className="text-xs font-medium text-amber-700">
                  Unsaved changes — click Save Property to publish
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:divide-x sm:divide-slate-200">
              <div className="sm:pr-4">
                <p className="text-xs font-medium text-slate-500">Total Floors</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                  {stats.totalFloors}
                </p>
              </div>
              <div className="sm:px-4">
                <p className="text-xs font-medium text-slate-500">Total Rooms</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                  {stats.totalRooms}
                </p>
              </div>
              <div className="sm:px-4">
                <p className="text-xs font-medium text-emerald-700">Available</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
                  {stats.availableRooms}
                </p>
              </div>
              <div className="sm:pl-4">
                <p className="text-xs font-medium text-rose-700">Occupied</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-rose-700 tabular-nums">
                  {stats.occupiedRooms}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            <OccupancyChart available={stats.availableRooms} occupied={stats.occupiedRooms} />
          </div>
        </div>
      </section>

      {/* Onboarding & Property Setup Form */}
      <section
        aria-labelledby="property-setup-heading"
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div className="mb-5">
          <h2
            id="property-setup-heading"
            className="font-display text-lg font-bold text-slate-900"
          >
            Owner & Property Details
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Tenants see your contact details and property location when browsing rooms.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label
              htmlFor="owner-name"
              className="block text-sm font-medium text-slate-700"
            >
              Owner Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="owner-name"
              type="text"
              value={draft.owner.name}
              onChange={(e) => updateOwnerField('name', e.target.value)}
              placeholder="e.g. Rajeshwari Menon"
              className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                formErrors.owner_name
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            {formErrors.owner_name && (
              <p className="mt-1 text-xs text-rose-600">{formErrors.owner_name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="owner-phone"
              className="block text-sm font-medium text-slate-700"
            >
              Phone Number <span className="text-rose-600">*</span>
            </label>
            <input
              id="owner-phone"
              type="tel"
              value={draft.owner.phone}
              onChange={(e) => updateOwnerField('phone', e.target.value)}
              placeholder="+91 98450 32140"
              className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                formErrors.owner_phone
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            {formErrors.owner_phone && (
              <p className="mt-1 text-xs text-rose-600">{formErrors.owner_phone}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="owner-email"
              className="block text-sm font-medium text-slate-700"
            >
              Email Address <span className="text-rose-600">*</span>
            </label>
            <input
              id="owner-email"
              type="email"
              value={draft.owner.email}
              onChange={(e) => updateOwnerField('email', e.target.value)}
              placeholder="owner@hostelname.in"
              className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                formErrors.owner_email
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            {formErrors.owner_email && (
              <p className="mt-1 text-xs text-rose-600">{formErrors.owner_email}</p>
            )}
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="property-name"
              className="block text-sm font-medium text-slate-700"
            >
              Hostel / PG Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="property-name"
              type="text"
              value={draft.name}
              onChange={(e) => updatePropertyField('name', e.target.value)}
              placeholder="e.g. Horizon Residency PG"
              className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                formErrors.name
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            {formErrors.name && <p className="mt-1 text-xs text-rose-600">{formErrors.name}</p>}
          </div>

          <div>
            <label
              htmlFor="property-location"
              className="block text-sm font-medium text-slate-700"
            >
              Location / Neighborhood <span className="text-rose-600">*</span>
            </label>
            <input
              id="property-location"
              type="text"
              list="staygrid-locations-list"
              value={draft.location}
              onChange={(e) => updatePropertyField('location', e.target.value)}
              placeholder="e.g. Koramangala, Bengaluru"
              className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                formErrors.location
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            <datalist id="staygrid-locations-list">
              {existingLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
            {formErrors.location && (
              <p className="mt-1 text-xs text-rose-600">{formErrors.location}</p>
            )}
          </div>
        </div>
      </section>

      {/* Dynamic Floor & 2D Room Builder */}
      <section aria-labelledby="floor-builder-heading" className="mt-8">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2
              id="floor-builder-heading"
              className="font-display text-xl font-bold text-slate-900"
            >
              Interactive 2D Floor & Room Builder
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Click any room box to edit rent, utilities, photos, and maintenance notes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddFloor}
            className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Floor</span>
          </button>
        </div>

        {draft.floors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Layers className="h-9 w-9 text-slate-400" aria-hidden="true" />
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              No floors added yet
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Add your first floor to start generating a 2D interactive room grid for your property.
            </p>
            <button
              type="button"
              onClick={handleAddFloor}
              className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Add Ground Floor</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {draft.floors.map((floor, floorIndex) => {
              const floorAvail = floor.rooms.filter((r) => r.status === 'available').length;
              const floorOcc = floor.rooms.length - floorAvail;

              return (
                <div
                  key={floor.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                  {/* Floor Controls Header */}
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-center">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        aria-label={`Floor ${floorIndex + 1} name`}
                        value={floor.name}
                        onChange={(e) => handleFloorNameChange(floor.id, e.target.value)}
                        className="w-44 rounded-lg border border-transparent bg-slate-50 px-2.5 py-1.5 font-display text-base font-bold text-slate-900 transition-colors hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-medium text-emerald-700 tabular-nums">
                          {floorAvail} Available
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-medium text-rose-700 tabular-nums">
                          {floorOcc} Occupied
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <label
                        htmlFor={`room-count-${floor.id}`}
                        className="text-xs font-medium text-slate-600"
                      >
                        Rooms:
                      </label>
                      <input
                        id={`room-count-${floor.id}`}
                        type="number"
                        min={1}
                        max={30}
                        value={roomCountInputs[floor.id] ?? String(floor.rooms.length)}
                        onChange={(e) =>
                          setRoomCountInputs((prev) => ({
                            ...prev,
                            [floor.id]: e.target.value,
                          }))
                        }
                        className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm text-slate-900 tabular-nums focus:border-indigo-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleGenerateRoomsForFloor(floor.id, floorIndex)}
                        className="min-h-[36px] whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                      >
                        Update Grid
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFloor(floor.id)}
                        className="inline-flex min-h-[36px] items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                        aria-label={`Remove ${floor.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  {/* 2D Room Grid */}
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {floor.rooms.map((room) => {
                      const isAvailable = room.status === 'available';
                      const includedCount = [
                        room.utilities.electricity,
                        room.utilities.water,
                        room.utilities.gas,
                      ].filter(Boolean).length;

                      return (
                        <div
                          key={room.id}
                          onClick={() =>
                            setEditingRoomRef({ floorId: floor.id, roomId: room.id })
                          }
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setEditingRoomRef({ floorId: floor.id, roomId: room.id });
                            }
                          }}
                          className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                            isAvailable
                              ? 'border-emerald-300 bg-emerald-50/55 hover:border-emerald-400'
                              : 'border-rose-300 bg-rose-50/55 hover:border-rose-400'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                              {room.label}
                            </span>
                            <button
                              type="button"
                              title={`Switch to ${isAvailable ? 'Occupied' : 'Available'}`}
                              aria-label={`Toggle room ${room.label} status`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickToggleStatus(floor.id, room.id);
                              }}
                              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/90 hover:text-slate-800"
                            >
                              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>

                          <div className="mt-2.5">
                            <p
                              className={`text-xs font-semibold ${
                                isAvailable ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isAvailable ? 'Available' : 'Occupied'}
                            </p>
                            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                              {formatINR(room.rent)}
                              <span className="font-sans text-[11px] font-normal text-slate-500">
                                /mo
                              </span>
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2 text-[11px] text-slate-500">
                            <span>{includedCount}/3 bills incl.</span>
                            {room.images.length > 0 && (
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                <Camera className="h-3 w-3" aria-hidden="true" />
                                {room.images.length}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Save Confirmation Bar */}
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Ready to publish?</span> Saving stores
            this property in local storage and makes every floor and room immediately visible to
            tenants searching in{' '}
            <span className="font-medium text-slate-900">
              {draft.location.trim() || 'your location'}
            </span>
            .
          </div>
          <button
            type="button"
            onClick={validateAndSaveProperty}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>Save Property</span>
          </button>
        </div>
      </section>

      {/* Room Editor Modal */}
      {activeEditingContext && (
        <RoomEditorModal
          room={activeEditingContext.room}
          floorName={activeEditingContext.floor.name}
          onSave={handleSaveRoom}
          onClose={() => setEditingRoomRef(null)}
        />
      )}
    </main>
  );
}
