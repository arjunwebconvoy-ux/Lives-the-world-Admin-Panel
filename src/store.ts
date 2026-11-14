import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  type Unsubscribe
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  SEED_BOOKINGS,
  SEED_CMS_ITEMS,
  SEED_CUSTOMERS,
  SEED_DESTINATIONS,
  SEED_ENQUIRIES,
  SEED_MARKETING,
  SEED_PACKAGES,
  SEED_PAYMENTS,
  SEED_SETTINGS,
  SEED_VEHICLES
} from './seed';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  type AdminInvite,
  type AdminRole,
  type AdminUser,
  type Booking,
  type BookingStatus,
  type CmsItem,
  type Customer,
  type Destination,
  type Enquiry,
  type MarketingItem,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
  type RouteKey,
  type SiteSetting,
  type TourPackage,
  type Vehicle
} from './types';
import { getTimestampMs, makeId, slugify } from './utils/format';

export interface AppState {
  authReady: boolean;
  firebaseUser: User | null;
  adminProfile: AdminUser | null;
  accessDenied: boolean;
  loadingData: boolean;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  activeRoute: RouteKey;
  admins: AdminUser[];
  adminInvites: AdminInvite[];
  destinations: Destination[];
  packages: TourPackage[];
  customers: Customer[];
  bookings: Booking[];
  payments: Payment[];
  enquiries: Enquiry[];
  vehicles: Vehicle[];
  cmsItems: CmsItem[];
  marketing: MarketingItem[];
  settings: SiteSetting[];
}

const savedTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('ltw_theme') === 'dark') ? 'dark' : 'light';
const savedRoute = (typeof localStorage !== 'undefined' && (localStorage.getItem('ltw_route') as RouteKey)) || 'dashboard-overview';

export const state: AppState = {
  authReady: false,
  firebaseUser: null,
  adminProfile: null,
  accessDenied: false,
  loadingData: false,
  theme: savedTheme,
  sidebarCollapsed: false,
  activeRoute: savedRoute,
  admins: [],
  adminInvites: [],
  destinations: [],
  packages: [],
  customers: [],
  bookings: [],
  payments: [],
  enquiries: [],
  vehicles: [],
  cmsItems: [],
  marketing: [],
  settings: []
};

type Listener = () => void;
const listeners = new Set<Listener>();
let unsubscribes: Unsubscribe[] = [];
let seededForSession = false;

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(): void {
  listeners.forEach((fn) => fn());
}

export function setTheme(theme: 'light' | 'dark'): void {
  state.theme = theme;
  document.documentElement.setAttribute('data-bs-theme', theme);
  try {
    localStorage.setItem('ltw_theme', theme);
  } catch {
    // ignore storage errors
  }
  emit();
}

export function toggleTheme(): void {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
}

export function navigateTo(route: RouteKey): void {
  state.activeRoute = route;
  try {
    localStorage.setItem('ltw_route', route);
  } catch {
    // ignore
  }
  emit();
}

export function toggleSidebarCollapsed(): void {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  emit();
}

function clearSubscriptions(): void {
  unsubscribes.forEach((u) => u());
  unsubscribes = [];
  state.admins = [];
  state.adminInvites = [];
  state.destinations = [];
  state.packages = [];
  state.customers = [];
  state.bookings = [];
  state.payments = [];
  state.enquiries = [];
  state.vehicles = [];
  state.cmsItems = [];
  state.marketing = [];
  state.settings = [];
}

function sortDescByTime<T extends { createdAt?: unknown; updatedAt?: unknown }>(list: T[]): T[] {
  const nowFallback = Date.now() + 60000;
  return [...list].sort((a, b) => {
    const tA = getTimestampMs(a.createdAt) || getTimestampMs(a.updatedAt) || nowFallback;
    const tB = getTimestampMs(b.createdAt) || getTimestampMs(b.updatedAt) || nowFallback;
    return tB - tA;
  });
}

async function seedIfEmpty(uid: string): Promise<void> {
  if (seededForSession) return;
  seededForSession = true;
  try {
    const destSnap = await getDocs(collection(db, 'destinations'));
    if (!destSnap.empty) {
      const hasDharamshala = destSnap.docs.some(
        (d) => d.id === 'dest_dharamshala' || /dharamshala/i.test(String(d.data().name || ''))
      );
      const alreadyAttempted =
        typeof localStorage !== 'undefined' && localStorage.getItem('ltw_seeded_dharamshala_v1') === '1';
      if (!hasDharamshala && !alreadyAttempted) {
        const dharamshalaSeed = SEED_DESTINATIONS.find((d) => d.id === 'dest_dharamshala');
        if (dharamshalaSeed) {
          await setDoc(doc(db, 'destinations', dharamshalaSeed.id), {
            ...dharamshalaSeed,
            createdBy: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          try {
            localStorage.setItem('ltw_seeded_dharamshala_v1', '1');
          } catch {
            // ignore storage errors
          }
        }
      }
      return;
    }

    const batch1 = writeBatch(db);
    for (const d of SEED_DESTINATIONS) {
      batch1.set(doc(db, 'destinations', d.id), {
        ...d,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    for (const c of SEED_CUSTOMERS) {
      batch1.set(doc(db, 'customers', c.id), {
        ...c,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    for (const v of SEED_VEHICLES) {
      batch1.set(doc(db, 'vehicles', v.id), {
        ...v,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    await batch1.commit();

    const batch2 = writeBatch(db);
    for (const p of SEED_PACKAGES) {
      batch2.set(doc(db, 'packages', p.id), {
        ...p,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    for (const e of SEED_ENQUIRIES) {
      batch2.set(doc(db, 'enquiries', e.id), {
        ...e,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    for (const cms of SEED_CMS_ITEMS) {
      batch2.set(doc(db, 'cmsItems', cms.id), {
        ...cms,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    for (const m of SEED_MARKETING) {
      batch2.set(doc(db, 'marketing', m.id), {
        ...m,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    for (const s of SEED_SETTINGS) {
      batch2.set(doc(db, 'settings', s.id), {
        ...s,
        updatedAt: serverTimestamp()
      });
    }
    await batch2.commit();

    const batch3 = writeBatch(db);
    for (const b of SEED_BOOKINGS) {
      batch3.set(doc(db, 'bookings', b.id), {
        ...b,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    await batch3.commit();

    const batch4 = writeBatch(db);
    for (const pay of SEED_PAYMENTS) {
      batch4.set(doc(db, 'payments', pay.id), {
        ...pay,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    await batch4.commit();
  } catch (err) {
    console.error('Seed check error:', err);
  }
}

function attachRealtimeListeners(): void {
  clearSubscriptions();
  state.loadingData = true;
  emit();

  const listen = <T>(
    path: string,
    assign: (items: T[]) => void,
    sort = true
  ) => {
    const unsub = onSnapshot(
      collection(db, path),
      (snap) => {
        const items = snap.docs.map((d) => ({ ...(d.data() as Record<string, unknown>), id: d.id })) as T[];
        assign(sort ? (sortDescByTime(items as (T & { createdAt?: unknown; updatedAt?: unknown })[]) as T[]) : items);
        state.loadingData = false;
        emit();
      },
      (error) => {
        state.loadingData = false;
        emit();
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    unsubscribes.push(unsub);
  };

  listen<AdminUser>('admins', (items) => { state.admins = items; });
  listen<AdminInvite>('adminInvites', (items) => { state.adminInvites = items; });
  listen<Destination>('destinations', (items) => { state.destinations = items; });
  listen<TourPackage>('packages', (items) => { state.packages = items; });
  listen<Customer>('customers', (items) => { state.customers = items; });
  listen<Booking>('bookings', (items) => { state.bookings = items; });
  listen<Payment>('payments', (items) => { state.payments = items; });
  listen<Enquiry>('enquiries', (items) => { state.enquiries = items; });
  listen<Vehicle>('vehicles', (items) => { state.vehicles = items; });
  listen<CmsItem>('cmsItems', (items) => {
    state.cmsItems = [...items].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  }, false);
  listen<MarketingItem>('marketing', (items) => { state.marketing = items; });
  listen<SiteSetting>('settings', (items) => { state.settings = items; }, false);
}

async function resolveAdminSession(user: User): Promise<void> {
  const adminRef = doc(db, 'admins', user.uid);
  let snap;
  try {
    snap = await getDoc(adminRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `admins/${user.uid}`);
  }

  if (snap.exists()) {
    const profile = snap.data() as AdminUser;
    if (profile.status === 'active') {
      state.adminProfile = profile;
      state.accessDenied = false;
      await seedIfEmpty(user.uid);
      attachRealtimeListeners();
      return;
    }
    state.adminProfile = null;
    state.accessDenied = true;
    emit();
    return;
  }

  // Not yet registered in /admins/{uid}
  if (user.email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified) {
    const newProfile: Record<string, unknown> = {
      uid: user.uid,
      email: user.email,
      displayName: (user.displayName || 'Admin').slice(0, 120),
      photoUrl: (user.photoURL || '').slice(0, 500),
      role: 'super_admin',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    try {
      await setDoc(adminRef, newProfile);
      const created = await getDoc(adminRef);
      state.adminProfile = created.data() as AdminUser;
      state.accessDenied = false;
      await seedIfEmpty(user.uid);
      attachRealtimeListeners();
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `admins/${user.uid}`);
    }
  }

  // Check if invited via /adminInvites
  if (user.email && user.emailVerified) {
    try {
      const inviteQ = query(collection(db, 'adminInvites'), where('email', '==', user.email.toLowerCase()));
      const inviteSnap = await getDocs(inviteQ);
      if (!inviteSnap.empty) {
        const inviteDoc = inviteSnap.docs[0];
        const invite = inviteDoc.data() as AdminInvite;
        const newProfile: Record<string, unknown> = {
          uid: user.uid,
          email: user.email.toLowerCase(),
          displayName: (user.displayName || invite.displayName || 'Admin').slice(0, 120),
          photoUrl: (user.photoURL || '').slice(0, 500),
          role: invite.role,
          status: 'active',
          inviteId: inviteDoc.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(adminRef, newProfile);
        const created = await getDoc(adminRef);
        state.adminProfile = created.data() as AdminUser;
        state.accessDenied = false;
        await seedIfEmpty(user.uid);
        attachRealtimeListeners();
        return;
      }
    } catch (err) {
      console.error('Invite check error:', err);
    }
  }

  state.adminProfile = null;
  state.accessDenied = true;
  emit();
}

export function initAuthObserver(): void {
  document.documentElement.setAttribute('data-bs-theme', state.theme);
  onAuthStateChanged(auth, async (user) => {
    state.firebaseUser = user;
    if (!user) {
      clearSubscriptions();
      state.adminProfile = null;
      state.accessDenied = false;
      state.authReady = true;
      emit();
      return;
    }

    try {
      await resolveAdminSession(user);
    } catch (err) {
      console.error(err);
    } finally {
      state.authReady = true;
      emit();
    }
  });
}

// ============================================================
// CRUD OPERATIONS (Strict Blueprint & Rules Conformance)
// ============================================================

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required.');
  return uid;
}

export function getCurrency(): string {
  const gen = state.settings.find((s) => s.group === 'general');
  return gen?.currency || 'INR';
}

async function callBackendApi<T>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, unknown>
): Promise<{ handled: true; data: T } | { handled: false }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  const token = await user.getIdToken();

  let resp: Response;
  try {
    resp = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    return { handled: false };
  }

  // Only fall back to direct Firestore SDK if no Express backend is mounted (e.g., static hosting)
  if (resp.status === 404 || resp.status === 405) {
    return { handled: false };
  }

  const text = await resp.text();
  let parsed: { error?: string } & Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as { error?: string } & Record<string, unknown>) : {};
  } catch {
    parsed = { error: text };
  }

  if (!resp.ok) {
    const err = new Error(parsed.error || `Request failed (${resp.status})`);
    if (resp.status === 401 || resp.status === 403) {
      throw Object.assign(err, { isFirestoreAuthError: true });
    }
    throw err;
  }

  return { handled: true, data: parsed as T };
}

export async function saveDestination(input: Partial<Destination> & { id?: string }): Promise<string> {
  const uid = requireUid();
  const isNew = !input.id;
  const id = input.id || makeId('dest');
  const name = String(input.name || '').trim().slice(0, 120);
  const region = String(input.region || '').trim().slice(0, 120);
  const shortDescription = String(input.shortDescription || '').trim().slice(0, 300);
  const description = String(input.description || '').trim().slice(0, 4000);

  if (name.length < 2) throw new Error('Destination name must be at least 2 characters.');
  if (region.length < 2) throw new Error('Region / State must be at least 2 characters.');
  if (shortDescription.length < 2) throw new Error('Short summary must be at least 2 characters.');
  if (description.length < 2) throw new Error('Full description must be at least 2 characters.');

  let slug = slugify(input.slug || name || id);
  if (slug.length < 2) {
    slug = slug ? `${slug}-${id.slice(-4).toLowerCase()}` : id.toLowerCase();
  }
  const path = `destinations/${id}`;

  const payload = {
    name,
    slug: slug.slice(0, 120),
    region,
    category: input.category || 'Hill Station',
    shortDescription,
    description,
    bestSeason: String(input.bestSeason || '').trim().slice(0, 100),
    elevation: String(input.elevation || '').trim().slice(0, 60),
    imageUrl: String(input.imageUrl || '').slice(0, 250000),
    featured: Boolean(input.featured),
    status: input.status || 'active'
  };

  try {
    const apiResult = await callBackendApi<{ id: string }>(
      isNew ? '/api/destinations' : `/api/destinations/${encodeURIComponent(id)}`,
      isNew ? 'POST' : 'PUT',
      isNew ? { id, ...payload } : payload
    );

    if (apiResult.handled) {
      try {
        const snap = await getDocFromServer(doc(db, 'destinations', id));
        if (snap.exists()) {
          const synced = { id: snap.id, ...(snap.data() as Omit<Destination, 'id'>) } as Destination;
          state.destinations = [synced, ...state.destinations.filter((d) => d.id !== id)];
          emit();
        }
      } catch {
        // Real-time onSnapshot listener will still sync the saved destination
      }
      return id;
    }

    if (isNew) {
      await setDoc(doc(db, 'destinations', id), {
        id,
        ...payload,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'destinations', id), {
        ...payload,
        updatedAt: serverTimestamp()
      });
    }
    return id;
  } catch (err) {
    if (err instanceof Error && !('isFirestoreAuthError' in err) && !err.message.toLowerCase().includes('permission')) {
      throw err;
    }
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteDestination(id: string): Promise<void> {
  try {
    const apiResult = await callBackendApi<{ id: string }>(`/api/destinations/${encodeURIComponent(id)}`, 'DELETE');
    if (apiResult.handled) {
      state.destinations = state.destinations.filter((d) => d.id !== id);
      emit();
      return;
    }
    await deleteDoc(doc(db, 'destinations', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `destinations/${id}`);
  }
}

export async function savePackage(input: Partial<TourPackage> & { id?: string }): Promise<string> {
  const uid = requireUid();
  const isNew = !input.id;
  const id = input.id || makeId('pkg');
  const title = String(input.title || '').trim().slice(0, 150);
  const dest = state.destinations.find((d) => d.id === input.destinationId);
  const destinationId = String(input.destinationId || dest?.id || '').trim();
  const destinationName = String(dest?.name || input.destinationName || '').trim().slice(0, 120);

  if (title.length < 3) throw new Error('Package title must be at least 3 characters.');
  if (!destinationId || destinationName.length < 2) {
    throw new Error('Please select a valid destination for this tour package.');
  }

  let slug = slugify(input.slug || title || id);
  if (slug.length < 2) {
    slug = slug ? `${slug}-${id.slice(-4).toLowerCase()}` : id.toLowerCase();
  }

  const payload = {
    title,
    slug: slug.slice(0, 150),
    destinationId,
    destinationName,
    category: input.category || 'Hill Retreat',
    durationDays: Math.max(1, Math.min(60, Math.round(Number(input.durationDays) || 1))),
    durationNights: Math.max(0, Math.min(60, Math.round(Number(input.durationNights) || 0))),
    pricePerPerson: Math.max(0, Number(input.pricePerPerson) || 0),
    discountPercent: Math.max(0, Math.min(95, Number(input.discountPercent) || 0)),
    maxGroupSize: Math.max(1, Math.min(200, Math.round(Number(input.maxGroupSize) || 12))),
    difficulty: input.difficulty || 'Easy',
    inclusions: (input.inclusions || []).map((s) => s.trim().slice(0, 200)).filter(Boolean).slice(0, 25),
    itinerary: (input.itinerary || []).map((s) => s.trim().slice(0, 400)).filter(Boolean).slice(0, 30),
    imageUrl: String(input.imageUrl || '').slice(0, 250000),
    galleryImages: (input.galleryImages || []).filter(Boolean).slice(0, 12),
    featured: Boolean(input.featured),
    status: input.status || 'active'
  };

  try {
    const apiResult = await callBackendApi<{ id: string }>(
      isNew ? '/api/packages' : `/api/packages/${encodeURIComponent(id)}`,
      isNew ? 'POST' : 'PUT',
      isNew ? { id, ...payload } : payload
    );

    if (apiResult.handled) {
      try {
        const snap = await getDocFromServer(doc(db, 'packages', id));
        if (snap.exists()) {
          const synced = { id: snap.id, ...(snap.data() as Omit<TourPackage, 'id'>) } as TourPackage;
          state.packages = [synced, ...state.packages.filter((p) => p.id !== id)];
          emit();
        }
      } catch {
        // Real-time onSnapshot listener will still sync the saved package
      }
      return id;
    }

    if (isNew) {
      await setDoc(doc(db, 'packages', id), {
        id,
        ...payload,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'packages', id), {
        ...payload,
        updatedAt: serverTimestamp()
      });
    }
    return id;
  } catch (err) {
    if (err instanceof Error && !('isFirestoreAuthError' in err) && !err.message.toLowerCase().includes('permission')) {
      throw err;
    }
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `packages/${id}`);
  }
}

export async function deletePackage(id: string): Promise<void> {
  try {
    const apiResult = await callBackendApi<{ id: string }>(`/api/packages/${encodeURIComponent(id)}`, 'DELETE');
    if (apiResult.handled) {
      state.packages = state.packages.filter((p) => p.id !== id);
      emit();
      return;
    }
    await deleteDoc(doc(db, 'packages', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `packages/${id}`);
  }
}

export async function saveCustomer(input: Partial<Customer> & { id?: string }): Promise<string> {
  requireUid();
  const isNew = !input.id;
  const id = input.id || makeId('cust');
  const fullName = String(input.fullName || '').trim().slice(0, 120);
  const email = String(input.email || '').trim().toLowerCase().slice(0, 160);
  const phone = String(input.phone || '').trim().slice(0, 30);
  const city = String(input.city || '').trim().slice(0, 100);
  const country = String(input.country || 'India').trim().slice(0, 100) || 'India';
  const status = input.status || 'active';
  const notes = String(input.notes || '').trim().slice(0, 1000);

  if (fullName.length < 2) throw new Error('Customer full name must be at least 2 characters.');
  if (email.length < 5 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid customer email address.');
  }
  if (phone.length < 6) throw new Error('Customer phone number must be at least 6 characters.');

  const payload = {
    fullName,
    email,
    phone,
    city,
    country,
    status,
    notes
  };

  try {
    const apiResult = await callBackendApi<{ id: string }>(
      isNew ? '/api/customers' : `/api/customers/${encodeURIComponent(id)}`,
      isNew ? 'POST' : 'PUT',
      isNew ? { id, ...payload } : payload
    );

    if (apiResult.handled) {
      try {
        const snap = await getDocFromServer(doc(db, 'customers', id));
        if (snap.exists()) {
          const synced = { id: snap.id, ...(snap.data() as Omit<Customer, 'id'>) } as Customer;
          state.customers = [synced, ...state.customers.filter((c) => c.id !== id)];
          emit();
        }
      } catch {
        // Real-time onSnapshot listener will still sync the saved customer
      }
      return id;
    }

    if (isNew) {
      await setDoc(doc(db, 'customers', id), {
        id,
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'customers', id), {
        ...payload,
        updatedAt: serverTimestamp()
      });
    }
    return id;
  } catch (err) {
    if (err instanceof Error && !('isFirestoreAuthError' in err) && !err.message.toLowerCase().includes('permission')) {
      throw err;
    }
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `customers/${id}`);
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    const apiResult = await callBackendApi<{ id: string }>(`/api/customers/${encodeURIComponent(id)}`, 'DELETE');
    if (apiResult.handled) {
      state.customers = state.customers.filter((c) => c.id !== id);
      emit();
      return;
    }
    await deleteDoc(doc(db, 'customers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `customers/${id}`);
  }
}

export async function saveBooking(input: Partial<Booking> & { id?: string }): Promise<void> {
  const isNew = !input.id;
  const id = input.id || makeId('bk');
  const cust = state.customers.find((c) => c.id === input.customerId);
  const pkg = state.packages.find((p) => p.id === input.packageId);
  const veh = state.vehicles.find((v) => v.id === input.vehicleId);

  const payload = {
    customerId: String(input.customerId || cust?.id || ''),
    customerName: String(cust?.fullName || input.customerName || '').trim().slice(0, 120),
    customerEmail: String(cust?.email || input.customerEmail || '').trim().slice(0, 160),
    customerPhone: String(cust?.phone || input.customerPhone || '').trim().slice(0, 30),
    destinationId: String(pkg?.destinationId || input.destinationId || ''),
    destinationName: String(pkg?.destinationName || input.destinationName || '').trim().slice(0, 120),
    packageId: String(input.packageId || pkg?.id || ''),
    packageTitle: String(pkg?.title || input.packageTitle || '').trim().slice(0, 150),
    vehicleId: String(veh?.id || input.vehicleId || ''),
    vehicleName: String(veh?.name || input.vehicleName || ''),
    travelDate: String(input.travelDate || '').slice(0, 32),
    returnDate: String(input.returnDate || '').slice(0, 32),
    adults: Math.max(1, Math.min(100, Math.round(Number(input.adults) || 1))),
    children: Math.max(0, Math.min(100, Math.round(Number(input.children) || 0))),
    passengerDetails: String(input.passengerDetails || '').trim().slice(0, 1000),
    totalAmount: Math.max(0, Number(input.totalAmount) || 0),
    paidAmount: Math.max(0, Number(input.paidAmount) || 0),
    paymentStatus: (input.paymentStatus || 'pending') as PaymentStatus,
    paymentMethod: (input.paymentMethod || 'UPI') as PaymentMethod,
    bookingStatus: (input.bookingStatus || 'pending') as BookingStatus,
    specialRequests: String(input.specialRequests || '').trim().slice(0, 1000),
    updatedAt: serverTimestamp()
  };

  try {
    if (isNew) {
      const code = `LTW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await setDoc(doc(db, 'bookings', id), {
        id,
        bookingCode: input.bookingCode || code,
        ...payload,
        createdAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'bookings', id), payload);
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `bookings/${id}`);
  }
}

export async function updateBookingStatus(
  id: string,
  bookingStatus: BookingStatus,
  paymentStatus?: PaymentStatus,
  paidAmount?: number
): Promise<void> {
  const existing = state.bookings.find((b) => b.id === id);
  if (!existing) return;
  const patch: Record<string, unknown> = {
    bookingStatus,
    updatedAt: serverTimestamp()
  };
  if (paymentStatus) patch.paymentStatus = paymentStatus;
  if (typeof paidAmount === 'number') patch.paidAmount = Math.max(0, paidAmount);

  try {
    await updateDoc(doc(db, 'bookings', id), patch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${id}`);
  }
}

export async function recordPaymentForBooking(
  booking: Booking,
  amount: number,
  method: PaymentMethod,
  transactionRef: string
): Promise<void> {
  const payId = makeId('pay');
  const newPaid = Math.min(booking.totalAmount, (booking.paidAmount || 0) + amount);
  const newPayStatus: PaymentStatus = newPaid >= booking.totalAmount ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'payments', payId), {
      id: payId,
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      customerName: booking.customerName,
      amount,
      method,
      transactionRef: transactionRef.trim().slice(0, 120) || `TXN-${Date.now().toString(36).toUpperCase()}`,
      status: 'paid',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    batch.update(doc(db, 'bookings', booking.id), {
      paidAmount: newPaid,
      paymentStatus: newPayStatus,
      paymentMethod: method,
      updatedAt: serverTimestamp()
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `payments/${payId}`);
  }
}

export async function deleteBooking(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'bookings', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `bookings/${id}`);
  }
}

export async function saveEnquiry(input: Partial<Enquiry> & { id?: string }): Promise<void> {
  const isNew = !input.id;
  const id = input.id || makeId('enq');

  try {
    if (isNew) {
      await setDoc(doc(db, 'enquiries', id), {
        id,
        type: input.type || 'contact',
        senderName: String(input.senderName || '').trim().slice(0, 120),
        senderEmail: String(input.senderEmail || '').trim().slice(0, 160),
        senderPhone: String(input.senderPhone || '').trim().slice(0, 30),
        subject: String(input.subject || '').trim().slice(0, 200),
        packageTitle: String(input.packageTitle || '').trim().slice(0, 150),
        preferredDate: String(input.preferredDate || '').trim().slice(0, 32),
        travelersCount: Math.max(1, Math.min(200, Math.round(Number(input.travelersCount) || 1))),
        message: String(input.message || '').trim().slice(0, 2500),
        status: input.status || 'new',
        adminReply: String(input.adminReply || '').trim().slice(0, 2500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'enquiries', id), {
        status: input.status || 'in_progress',
        adminReply: String(input.adminReply || '').trim().slice(0, 2500),
        subject: String(input.subject || '').trim().slice(0, 200),
        packageTitle: String(input.packageTitle || '').trim().slice(0, 150),
        preferredDate: String(input.preferredDate || '').trim().slice(0, 32),
        travelersCount: Math.max(1, Math.min(200, Math.round(Number(input.travelersCount) || 1))),
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `enquiries/${id}`);
  }
}

export async function deleteEnquiry(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'enquiries', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `enquiries/${id}`);
  }
}

export async function saveVehicle(input: Partial<Vehicle> & { id?: string }): Promise<void> {
  const isNew = !input.id;
  const id = input.id || makeId('veh');
  const payload = {
    name: String(input.name || '').trim().slice(0, 120),
    category: input.category || 'SUV',
    registrationNo: String(input.registrationNo || '').trim().toUpperCase().slice(0, 32),
    seatCapacity: Math.max(1, Math.min(80, Math.round(Number(input.seatCapacity) || 4))),
    pricePerDay: Math.max(0, Number(input.pricePerDay) || 0),
    pricePerKm: Math.max(0, Number(input.pricePerKm) || 0),
    driverName: String(input.driverName || '').trim().slice(0, 120),
    driverPhone: String(input.driverPhone || '').trim().slice(0, 30),
    acAvailable: Boolean(input.acAvailable),
    imageUrl: String(input.imageUrl || '').slice(0, 250000),
    status: input.status || 'available',
    updatedAt: serverTimestamp()
  };

  try {
    if (isNew) {
      await setDoc(doc(db, 'vehicles', id), {
        id,
        ...payload,
        createdAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'vehicles', id), payload);
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `vehicles/${id}`);
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'vehicles', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `vehicles/${id}`);
  }
}

export async function saveCmsItem(input: Partial<CmsItem> & { id?: string }): Promise<void> {
  const isNew = !input.id;
  const id = input.id || makeId('cms');
  const payload = {
    title: String(input.title || '').trim().slice(0, 200),
    subtitle: String(input.subtitle || '').trim().slice(0, 300),
    body: String(input.body || '').trim().slice(0, 6000),
    authorName: String(input.authorName || '').trim().slice(0, 120),
    authorRole: String(input.authorRole || '').trim().slice(0, 120),
    rating: Math.max(1, Math.min(5, Math.round(Number(input.rating) || 5))),
    category: String(input.category || '').trim().slice(0, 80),
    imageUrl: String(input.imageUrl || '').slice(0, 250000),
    sortOrder: Math.max(0, Math.min(10000, Math.round(Number(input.sortOrder) || 1))),
    status: input.status || 'published',
    updatedAt: serverTimestamp()
  };

  try {
    if (isNew) {
      await setDoc(doc(db, 'cmsItems', id), {
        id,
        section: input.section || 'homepage',
        ...payload,
        createdAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'cmsItems', id), payload);
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `cmsItems/${id}`);
  }
}

export async function deleteCmsItem(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'cmsItems', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `cmsItems/${id}`);
  }
}

export async function saveMarketingItem(input: Partial<MarketingItem> & { id?: string }): Promise<void> {
  const isNew = !input.id;
  const id = input.id || makeId('mkt');
  const payload = {
    pageKey: String(input.pageKey || '').trim().slice(0, 80),
    metaTitle: String(input.metaTitle || '').trim().slice(0, 160),
    metaDescription: String(input.metaDescription || '').trim().slice(0, 320),
    keywords: String(input.keywords || '').trim().slice(0, 300),
    bannerTitle: String(input.bannerTitle || '').trim().slice(0, 160),
    bannerCta: String(input.bannerCta || '').trim().slice(0, 80),
    platform: String(input.platform || '').trim().slice(0, 60),
    url: String(input.url || '').trim().slice(0, 500),
    status: input.status || 'active',
    updatedAt: serverTimestamp()
  };

  try {
    if (isNew) {
      await setDoc(doc(db, 'marketing', id), {
        id,
        kind: input.kind || 'seo_page',
        ...payload,
        createdAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'marketing', id), payload);
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `marketing/${id}`);
  }
}

export async function deleteMarketingItem(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'marketing', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `marketing/${id}`);
  }
}

export async function saveSetting(setting: Partial<SiteSetting> & { id: string; group: SiteSetting['group'] }): Promise<void> {
  const exists = state.settings.some((s) => s.id === setting.id);
  const { id, group, ...rest } = setting;
  try {
    if (!exists) {
      await setDoc(doc(db, 'settings', id), {
        id,
        group,
        ...rest,
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'settings', id), {
        ...rest,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    handleFirestoreError(err, exists ? OperationType.UPDATE : OperationType.CREATE, `settings/${id}`);
  }
}

export async function createAdminInvite(email: string, displayName: string, role: AdminRole): Promise<void> {
  const uid = requireUid();
  const normalized = email.trim().toLowerCase().slice(0, 160);
  const id = `inv_${normalized.replace(/[^a-z0-9]/g, '_').slice(0, 90)}`;
  try {
    await setDoc(doc(db, 'adminInvites', id), {
      email: normalized,
      displayName: displayName.trim().slice(0, 120),
      role,
      invitedBy: uid,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `adminInvites/${id}`);
  }
}

export async function deleteAdminInvite(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'adminInvites', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `adminInvites/${id}`);
  }
}

export async function updateAdminProfile(uid: string, data: Partial<AdminUser>): Promise<void> {
  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp()
  };
  if (typeof data.displayName === 'string') patch.displayName = data.displayName.trim().slice(0, 120);
  if (typeof data.phone === 'string') patch.phone = data.phone.trim().slice(0, 30);
  if (typeof data.photoUrl === 'string') patch.photoUrl = data.photoUrl.trim().slice(0, 500);
  if (data.role) patch.role = data.role;
  if (data.status) patch.status = data.status;

  try {
    await updateDoc(doc(db, 'admins', uid), patch);
    if (state.adminProfile?.uid === uid) {
      state.adminProfile = { ...state.adminProfile, ...data };
      emit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `admins/${uid}`);
  }
}

export async function deleteAdminUser(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'admins', uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `admins/${uid}`);
  }
}
