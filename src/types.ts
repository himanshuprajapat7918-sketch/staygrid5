export type UserRole = 'landing' | 'tenant' | 'landlord';

export type RoomStatus = 'available' | 'occupied';

export interface UtilityInclusions {
  electricity: boolean;
  water: boolean;
  gas: boolean;
}

export interface Room {
  id: string;
  label: string;
  rent: number;
  status: RoomStatus;
  utilities: UtilityInclusions;
  images: string[];
  maintenanceNotes: string;
}

export interface Floor {
  id: string;
  name: string;
  rooms: Room[];
}

export interface OwnerDetails {
  name: string;
  phone: string;
  email: string;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  owner: OwnerDetails;
  floors: Floor[];
  updatedAt: string;
}

export interface TenantProfile {
  fullName: string;
  phone: string;
  email: string;
  preferredLocation: string;
}

export interface VisitRequest {
  id: string;
  propertyId: string;
  propertyName: string;
  roomId: string;
  roomLabel: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'info' | 'error';
}
