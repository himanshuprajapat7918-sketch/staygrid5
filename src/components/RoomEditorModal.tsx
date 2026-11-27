import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Droplets,
  Flame,
  ImagePlus,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Room, RoomStatus } from '../types';
import { readAndOptimizeImage } from '../utils/storage';
import ResilientImage from './ResilientImage';

interface RoomEditorModalProps {
  room: Room;
  floorName: string;
  onSave: (updatedRoom: Room) => void;
  onClose: () => void;
}

export default function RoomEditorModal({
  room,
  floorName,
  onSave,
  onClose,
}: RoomEditorModalProps) {
  const [label, setLabel] = useState(room.label);
  const [rent, setRent] = useState(String(room.rent));
  const [status, setStatus] = useState<RoomStatus>(room.status);
  const [utilities, setUtilities] = useState({ ...room.utilities });
  const [images, setImages] = useState<string[]>([...room.images]);
  const [maintenanceNotes, setMaintenanceNotes] = useState(room.maintenanceNotes);
  const [error, setError] = useState<string | null>(null);
  const [isReadingImages, setIsReadingImages] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsReadingImages(true);
    try {
      const selectedFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (selectedFiles.length === 0) {
        setError('Please select valid image files (JPG, PNG, or WebP).');
        return;
      }
      const maxToAdd = Math.max(0, 6 - images.length);
      const batch = selectedFiles.slice(0, maxToAdd);
      const dataUrls = await Promise.all(batch.map((file) => readAndOptimizeImage(file)));
      setImages((prev) => [...prev, ...dataUrls]);
      if (selectedFiles.length > maxToAdd) {
        setError('Up to 6 images can be attached per room.');
      }
    } catch {
      setError('Could not read one or more selected images. Please try again.');
    } finally {
      setIsReadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = label.trim();
    const parsedRent = Number(rent);

    if (!trimmedLabel) {
      setError('Room number or label is required.');
      return;
    }
    if (!Number.isFinite(parsedRent) || parsedRent <= 0) {
      setError('Please enter a valid monthly rent greater than 0.');
      return;
    }

    onSave({
      ...room,
      label: trimmedLabel,
      rent: Math.round(parsedRent),
      status,
      utilities,
      images,
      maintenanceNotes: maintenanceNotes.trim(),
    });
  };

  return (
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-editor-title"
      onClick={onClose}
    >
      <div
        className="animate-modal-panel flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-medium text-slate-500">{floorName}</p>
            <h2
              id="room-editor-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              Edit Room {room.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close room editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-6 p-6">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {error}
              </div>
            )}

            {/* Label & Rent */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="room-label-input"
                  className="block text-sm font-medium text-slate-700"
                >
                  Room Number / Label
                </label>
                <input
                  id="room-label-input"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. 101, G-02"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="room-rent-input"
                  className="block text-sm font-medium text-slate-700"
                >
                  Monthly Rent (INR / month)
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-mono text-sm text-slate-500">
                    ₹
                  </span>
                  <input
                    id="room-rent-input"
                    type="number"
                    min={500}
                    step={100}
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    placeholder="9500"
                    className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3.5 pl-8 font-mono text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Room Availability Status */}
            <div>
              <span className="block text-sm font-medium text-slate-700">Room Status</span>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('available')}
                  className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    status === 'available'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Check
                    className={`h-4 w-4 ${status === 'available' ? 'opacity-100' : 'opacity-30'}`}
                    aria-hidden="true"
                  />
                  <span>Available</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('occupied')}
                  className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    status === 'occupied'
                      ? 'border-rose-600 bg-rose-50 text-rose-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Check
                    className={`h-4 w-4 ${status === 'occupied' ? 'opacity-100' : 'opacity-30'}`}
                    aria-hidden="true"
                  />
                  <span>Occupied</span>
                </button>
              </div>
            </div>

            {/* Utility Inclusions */}
            <div>
              <span className="block text-sm font-medium text-slate-700">
                Utilities Included in Monthly Rent
              </span>
              <p className="mt-0.5 text-xs text-slate-500">
                Checked utilities appear as included; unchecked items show as billed separately.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 transition-colors hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={utilities.electricity}
                    onChange={(e) =>
                      setUtilities((prev) => ({ ...prev, electricity: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <Zap className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-800">Electricity Bill</span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 transition-colors hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={utilities.water}
                    onChange={(e) =>
                      setUtilities((prev) => ({ ...prev, water: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <Droplets className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-800">Water Bill</span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 transition-colors hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={utilities.gas}
                    onChange={(e) =>
                      setUtilities((prev) => ({ ...prev, gas: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <Flame className="h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-800">Gas Bill</span>
                </label>
              </div>
            </div>

            {/* Room Images Upload */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="block text-sm font-medium text-slate-700">
                    Room Photos ({images.length}/6)
                  </span>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Upload one or more photos to preview and store locally in your browser.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isReadingImages || images.length >= 6}
                  className="inline-flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ImagePlus className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                  <span>{isReadingImages ? 'Processing...' : 'Upload Photos'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesSelected}
                  className="hidden"
                />
              </div>

              {images.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {images.map((src, index) => (
                    <div
                      key={`${index}-${src.slice(0, 24)}`}
                      className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                    >
                      <ResilientImage
                        src={src}
                        alt={`Room ${label || room.label} photo ${index + 1}`}
                        className="h-full w-full object-cover"
                        fallbackLabel={`Photo ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-slate-900/80 text-white opacity-90 transition-opacity hover:bg-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label={`Remove photo ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <ImagePlus className="h-6 w-6 text-slate-400" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-700">
                    Click to upload room images
                  </span>
                  <span className="text-xs text-slate-500">PNG, JPG, or WebP · Up to 6 images</span>
                </button>
              )}
            </div>

            {/* Maintenance Details & Notes */}
            <div>
              <label
                htmlFor="room-maintenance-input"
                className="block text-sm font-medium text-slate-700"
              >
                Maintenance Details & Room Notes
              </label>
              <textarea
                id="room-maintenance-input"
                rows={3}
                value={maintenanceNotes}
                onChange={(e) => setMaintenanceNotes(e.target.value)}
                placeholder="Include AC servicing dates, housekeeping schedule, Wi-Fi speed, geyser status, or furnishings..."
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] whitespace-nowrap rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Save Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
