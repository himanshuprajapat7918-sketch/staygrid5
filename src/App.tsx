import { useCallback, useEffect, useState } from 'react';
import LandingScreen from './components/LandingScreen';
import LandlordDashboard from './components/LandlordDashboard';
import Navbar from './components/Navbar';
import TenantPortal from './components/TenantPortal';
import ToastContainer from './components/ToastContainer';
import {
  Property,
  Room,
  TenantProfile,
  ToastMessage,
  UserRole,
  VisitRequest,
} from './types';
import {
  loadProperties,
  loadTenantProfile,
  loadVisitRequests,
  saveProperties,
  saveTenantProfile,
  saveVisitRequests,
} from './utils/storage';

export default function App() {
  const [role, setRole] = useState<UserRole>('landing');
  const [properties, setProperties] = useState<Property[]>(() => loadProperties());
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(() =>
    loadTenantProfile()
  );
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>(() =>
    loadVisitRequests()
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync changes across browser tabs if open in two windows
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'staygrid_properties_v1') {
        setProperties(loadProperties());
      } else if (e.key === 'staygrid_tenant_profile_v1') {
        setTenantProfile(loadTenantProfile());
      } else if (e.key === 'staygrid_visit_requests_v1') {
        setVisitRequests(loadVisitRequests());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (title: string, description?: string, variant: ToastMessage['variant'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, description, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const handleSelectRole = useCallback((nextRole: UserRole) => {
    setRole(nextRole);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSaveProperty = useCallback((saved: Property): boolean => {
    const current = loadProperties();
    const existsInStorage = current.some((p) => p.id === saved.id);
    const persistedList = existsInStorage
      ? current.map((p) => (p.id === saved.id ? saved : p))
      : [saved, ...current];
    const ok = saveProperties(persistedList);
    if (ok) {
      setProperties(persistedList);
    }
    return ok;
  }, []);

  const handleSaveTenantProfile = useCallback(
    (profile: TenantProfile) => {
      setTenantProfile(profile);
      saveTenantProfile(profile);
      pushToast(
        'Preferences updated',
        `Showing hostels and PGs in ${profile.preferredLocation}.`,
        'info'
      );
    },
    [pushToast]
  );

  const handleCreateVisitRequest = useCallback(
    (property: Property, room: Room) => {
      const request: VisitRequest = {
        id: `vr-${Date.now()}`,
        propertyId: property.id,
        propertyName: property.name,
        roomId: room.id,
        roomLabel: room.label,
        tenantName: tenantProfile?.fullName ?? 'Prospective Tenant',
        tenantPhone: tenantProfile?.phone ?? '',
        tenantEmail: tenantProfile?.email ?? '',
        createdAt: new Date().toISOString(),
      };

      setVisitRequests((prev) => {
        const alreadySent = prev.some(
          (vr) => vr.propertyId === property.id && vr.roomId === room.id
        );
        if (alreadySent) return prev;
        const next = [request, ...prev];
        saveVisitRequests(next);
        return next;
      });

      pushToast(
        'Visit request sent',
        `${property.owner.name} has been notified about Room ${room.label} at ${property.name}.`,
        'success'
      );
    },
    [tenantProfile, pushToast]
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar role={role} onSelectRole={handleSelectRole} />

      <div className="flex-1">
        {role === 'landing' && (
          <LandingScreen properties={properties} onSelectRole={handleSelectRole} />
        )}

        {role === 'landlord' && (
          <LandlordDashboard
            properties={properties}
            onSaveProperty={handleSaveProperty}
            onNotify={pushToast}
          />
        )}

        {role === 'tenant' && (
          <TenantPortal
            properties={properties}
            tenantProfile={tenantProfile}
            visitRequests={visitRequests}
            onSaveTenantProfile={handleSaveTenantProfile}
            onCreateVisitRequest={handleCreateVisitRequest}
          />
        )}
      </div>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} StayGrid. Hostel & PG Management Platform.</p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => handleSelectRole('tenant')}
              className="transition-colors hover:text-slate-900"
            >
              Student / Tenant
            </button>
            <button
              type="button"
              onClick={() => handleSelectRole('landlord')}
              className="transition-colors hover:text-slate-900"
            >
              Landlord Studio
            </button>
          </div>
        </div>
      </footer>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
