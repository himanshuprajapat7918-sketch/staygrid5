import { INITIAL_PROPERTIES } from '../data/seedData';
import { Property, TenantProfile, VisitRequest } from '../types';

const KEYS = {
  PROPERTIES: 'staygrid_properties_v1',
  TENANT_PROFILE: 'staygrid_tenant_profile_v1',
  VISIT_REQUESTS: 'staygrid_visit_requests_v1',
} as const;

export function loadProperties(): Property[] {
  try {
    const raw = localStorage.getItem(KEYS.PROPERTIES);
    if (!raw) {
      localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(INITIAL_PROPERTIES));
      return INITIAL_PROPERTIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(INITIAL_PROPERTIES));
    return INITIAL_PROPERTIES;
  } catch {
    return INITIAL_PROPERTIES;
  }
}

export function saveProperties(properties: Property[]): boolean {
  try {
    localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(properties));
    return true;
  } catch {
    return false;
  }
}

export function loadTenantProfile(): TenantProfile | null {
  try {
    const raw = localStorage.getItem(KEYS.TENANT_PROFILE);
    if (!raw) return null;
    return JSON.parse(raw) as TenantProfile;
  } catch {
    return null;
  }
}

export function saveTenantProfile(profile: TenantProfile): void {
  try {
    localStorage.setItem(KEYS.TENANT_PROFILE, JSON.stringify(profile));
  } catch {
    // Ignore quota errors on profile
  }
}

export function loadVisitRequests(): VisitRequest[] {
  try {
    const raw = localStorage.getItem(KEYS.VISIT_REQUESTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveVisitRequests(requests: VisitRequest[]): void {
  try {
    localStorage.setItem(KEYS.VISIT_REQUESTS, JSON.stringify(requests));
  } catch {
    // Ignore quota errors
  }
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function getPropertyStats(property: Property) {
  let totalRooms = 0;
  let availableRooms = 0;
  let occupiedRooms = 0;
  let minRent = Infinity;

  for (const floor of property.floors) {
    for (const room of floor.rooms) {
      totalRooms += 1;
      if (room.status === 'available') {
        availableRooms += 1;
      } else {
        occupiedRooms += 1;
      }
      if (room.rent > 0 && room.rent < minRent) {
        minRent = room.rent;
      }
    }
  }

  return {
    totalFloors: property.floors.length,
    totalRooms,
    availableRooms,
    occupiedRooms,
    minRent: minRent === Infinity ? 0 : minRent,
    occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
  };
}

export function getPropertyCoverImage(property: Property): string | null {
  for (const floor of property.floors) {
    for (const room of floor.rooms) {
      if (room.images && room.images.length > 0) {
        return room.images[0];
      }
    }
  }
  return null;
}

/**
 * Reads an uploaded image file via FileReader and safely compresses large images
 * so localStorage persistence remains fast and reliable.
 */
export function readAndOptimizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 960;
        let { width, height } = img;
        if (width <= MAX_DIM && height <= MAX_DIM && dataUrl.length < 280_000) {
          resolve(dataUrl);
          return;
        }
        const scale = Math.min(MAX_DIM / width, MAX_DIM / height, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}
