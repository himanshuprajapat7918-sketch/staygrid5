import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Droplets,
  Flame,
  Lock,
  Mail,
  Phone,
  Send,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { Property, Room, TenantProfile } from '../types';
import { formatINR } from '../utils/storage';
import ResilientImage from './ResilientImage';

interface RoomDetailModalProps {
  property: Property;
  floorName: string;
  room: Room;
  tenantProfile: TenantProfile | null;
  hasRequestedVisit: boolean;
  onRequestVisit: (property: Property, room: Room) => void;
  onClose: () => void;
}

export default function RoomDetailModal({
  property,
  floorName,
  room,
  tenantProfile,
  hasRequestedVisit,
  onRequestVisit,
  onClose,
}: RoomDetailModalProps) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showContactPanel, setShowContactPanel] = useState(hasRequestedVisit);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const images = room.images ?? [];
  const isAvailable = room.status === 'available';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(property.owner.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 1800);
    } catch {
      setCopiedPhone(false);
    }
  };

  const handleConfirmVisit = () => {
    onRequestVisit(property, room);
    setShowContactPanel(true);
  };

  const utilityItems = [
    {
      key: 'electricity',
      label: 'Electricity Bill',
      included: room.utilities.electricity,
      icon: <Zap className="h-4 w-4 text-amber-600" aria-hidden="true" />,
    },
    {
      key: 'water',
      label: 'Water Bill',
      included: room.utilities.water,
      icon: <Droplets className="h-4 w-4 text-sky-600" aria-hidden="true" />,
    },
    {
      key: 'gas',
      label: 'Gas Bill',
      included: room.utilities.gas,
      icon: <Flame className="h-4 w-4 text-orange-600" aria-hidden="true" />,
    },
  ];

  return (
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-detail-title"
      onClick={onClose}
    >
      <div
        className="animate-modal-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {property.name} · {floorName} · {property.location}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2
                id="room-detail-title"
                className="font-display text-xl font-bold text-slate-900"
              >
                Room {room.label}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                  isAvailable
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {isAvailable ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{isAvailable ? 'Available' : 'Occupied'}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close room details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Room Image Gallery */}
          <div>
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <ResilientImage
                src={images[activeImageIdx] ?? null}
                alt={`${property.name} Room ${room.label} photo ${activeImageIdx + 1}`}
                className="h-full w-full object-cover"
                fallbackLabel={`No photos uploaded for Room ${room.label}`}
              />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length)
                    }
                    className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm transition-colors hover:bg-white"
                    aria-label="Previous room photo"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageIdx((prev) => (prev + 1) % images.length)}
                    className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm transition-colors hover:bg-white"
                    aria-label="Next room photo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-slate-950/75 px-2.5 py-1 font-mono text-xs text-white tabular-nums">
                    {activeImageIdx + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
                {images.map((imgSrc, idx) => (
                  <button
                    key={`${idx}-${imgSrc.slice(0, 20)}`}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`h-16 w-22 shrink-0 overflow-hidden rounded-lg border-2 transition-opacity ${
                      idx === activeImageIdx
                        ? 'border-indigo-600 opacity-100'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`View photo ${idx + 1}`}
                  >
                    <ResilientImage
                      src={imgSrc}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rent & Status Summary */}
          <div className="flex flex-col justify-between gap-4 border-y border-slate-200 py-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-medium text-slate-500">Monthly Rent</p>
              <p className="mt-0.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {formatINR(room.rent)}
                <span className="ml-1 font-sans text-sm font-normal text-slate-500">/ month</span>
              </p>
            </div>
            <div className="text-sm text-slate-600 sm:text-right">
              <p className="font-medium text-slate-900">Managed by {property.owner.name}</p>
              <p className="text-xs text-slate-500">{property.owner.phone}</p>
            </div>
          </div>

          {/* Utility Inclusions */}
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Utility Bill Inclusions
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {utilityItems.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                    item.included
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p
                      className={`mt-0.5 text-xs font-medium ${
                        item.included ? 'text-emerald-700' : 'text-slate-600'
                      }`}
                    >
                      {item.included ? 'Included in rent' : 'Billed separately'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance Details & Notes */}
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Maintenance Details & Notes
              </h3>
            </div>
            <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm leading-relaxed text-slate-700">
              {room.maintenanceNotes
                ? room.maintenanceNotes
                : 'No additional maintenance notes have been listed for this room yet. Reach out to the landlord for recent inspection details.'}
            </p>
          </div>

          {/* Contact Landlord / Visit Request Panel */}
          {showContactPanel && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h4 className="font-display text-sm font-bold text-slate-900">
                    Landlord Contact Details
                  </h4>
                  <p className="mt-1 text-sm font-medium text-slate-800">{property.owner.name}</p>
                  <div className="mt-2 flex flex-col gap-1.5 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                      <a
                        href={`tel:${property.owner.phone.replace(/\s+/g, '')}`}
                        className="font-mono hover:text-indigo-700 hover:underline"
                      >
                        {property.owner.phone}
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                      >
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                      <a
                        href={`mailto:${property.owner.email}`}
                        className="hover:text-indigo-700 hover:underline"
                      >
                        {property.owner.email}
                      </a>
                    </div>
                  </div>
                </div>

                {isAvailable && (
                  <div className="shrink-0">
                    {hasRequestedVisit ? (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>Visit Request Sent</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConfirmVisit}
                        className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Send Visit Request</span>
                      </button>
                    )}
                    {tenantProfile && (
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Shares {tenantProfile.fullName} ({tenantProfile.phone})
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Close
          </button>

          {isAvailable ? (
            hasRequestedVisit ? (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Visit request sent to {property.owner.name}
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                {!showContactPanel && (
                  <button
                    type="button"
                    onClick={() => setShowContactPanel(true)}
                    className="min-h-[42px] whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100"
                  >
                    Contact Landlord
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirmVisit}
                  className="inline-flex min-h-[42px] items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>Request Visit</span>
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                This room is currently occupied.
              </span>
              {!showContactPanel && (
                <button
                  type="button"
                  onClick={() => setShowContactPanel(true)}
                  className="min-h-[40px] whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Contact Landlord
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
