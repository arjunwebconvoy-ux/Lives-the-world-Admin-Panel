import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as FirebaseAppletConfig;
const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
const FIRESTORE_DOC_ROOT = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/${FIRESTORE_DOC_ROOT}`;

const VALID_DEST_CATEGORIES = new Set([
  'Hill Station',
  'Adventure Hub',
  'Riverside & Trek',
  'High-Altitude Expedition',
  'Spiritual & Heritage'
]);

const VALID_PKG_CATEGORIES = new Set([
  'Hill Retreat',
  'Adventure Sports',
  'Riverside Escape',
  'Snow Expedition',
  'Family Holiday',
  'Backpacking'
]);

const VALID_PKG_DIFFICULTIES = new Set(['Easy', 'Moderate', 'Challenging']);
const VALID_PUBLISH_STATUSES = new Set(['active', 'draft', 'archived']);
const VALID_CUSTOMER_STATUSES = new Set(['active', 'vip', 'inactive']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthenticatedRequest extends Request {
  authToken?: string;
  authUid?: string;
  authEmail?: string;
}

interface FirestoreValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

function toFirestoreValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: FirestoreValue | undefined): unknown {
  if (!val) return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map((item) => fromFirestoreValue(item));
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

function fromFirestoreDoc(doc: { name?: string; fields?: Record<string, FirestoreValue> }): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (doc.name) {
    const parts = doc.name.split('/');
    out.id = parts[parts.length - 1];
  }
  if (doc.fields) {
    for (const [k, v] of Object.entries(doc.fields)) {
      out[k] = fromFirestoreValue(v);
    }
  }
  return out;
}

function makeServerId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function serverSlugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function requireFirebaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = decodeJwtPayload(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid authentication token.' });
    return;
  }
  const uid = String(payload.user_id || payload.sub || '').trim();
  const aud = String(payload.aud || '').trim();
  const exp = Number(payload.exp || 0);
  if (!uid || (aud && aud !== PROJECT_ID)) {
    res.status(401).json({ error: 'Token does not match this Firebase project.' });
    return;
  }
  if (exp && exp * 1000 < Date.now() - 30000) {
    res.status(401).json({ error: 'Session token expired. Please sign in again.' });
    return;
  }

  req.authToken = token;
  req.authUid = uid;
  req.authEmail = typeof payload.email === 'string' ? payload.email : '';
  next();
}

async function firestoreRequest(
  url: string,
  token: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: unknown; errorMessage?: string }> {
  const resp = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  });
  const text = await resp.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { message: text };
  }
  if (!resp.ok) {
    const errObj = parsed as { error?: { message?: string } } | null;
    const msg = errObj?.error?.message || `Firestore API error (${resp.status})`;
    return { ok: false, status: resp.status, data: parsed, errorMessage: msg };
  }
  return { ok: true, status: resp.status, data: parsed };
}

function validateAndNormalizeCustomer(body: Record<string, unknown>, id: string) {
  const fullName = String(body.fullName || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 160);
  const phone = String(body.phone || '').trim().slice(0, 30);
  const city = String(body.city || '').trim().slice(0, 100);
  const country = String(body.country || 'India').trim().slice(0, 100) || 'India';
  const status = String(body.status || 'active').trim();
  const notes = String(body.notes || '').trim().slice(0, 1000);

  if (fullName.length < 2) {
    return { error: 'Full name must be at least 2 characters.' } as const;
  }
  if (email.length < 5 || !EMAIL_REGEX.test(email)) {
    return { error: 'Please provide a valid email address.' } as const;
  }
  if (phone.length < 6) {
    return { error: 'Phone number must be at least 6 characters.' } as const;
  }
  if (!VALID_CUSTOMER_STATUSES.has(status)) {
    return { error: 'Invalid customer status.' } as const;
  }
  if (!/^[a-zA-Z0-9_-]{2,128}$/.test(id)) {
    return { error: 'Invalid customer ID format.' } as const;
  }

  return {
    data: {
      id,
      fullName,
      email,
      phone,
      city,
      country,
      status,
      notes
    }
  } as const;
}

function validateAndNormalizeDestination(body: Record<string, unknown>, id: string) {
  const name = String(body.name || '').trim().slice(0, 120);
  const region = String(body.region || '').trim().slice(0, 120);
  const category = String(body.category || 'Hill Station').trim();
  const shortDescription = String(body.shortDescription || '').trim().slice(0, 300);
  const description = String(body.description || '').trim().slice(0, 4000);
  const bestSeason = String(body.bestSeason || '').trim().slice(0, 100);
  const elevation = String(body.elevation || '').trim().slice(0, 60);
  const imageUrl = String(body.imageUrl || '').slice(0, 250000);
  const featured = Boolean(body.featured);
  const status = String(body.status || 'active').trim();

  if (name.length < 2) {
    return { error: 'Destination name must be at least 2 characters.' } as const;
  }
  if (region.length < 2) {
    return { error: 'Region / State must be at least 2 characters.' } as const;
  }
  if (!VALID_DEST_CATEGORIES.has(category)) {
    return { error: 'Invalid destination category.' } as const;
  }
  if (shortDescription.length < 2) {
    return { error: 'Short summary must be at least 2 characters.' } as const;
  }
  if (description.length < 2) {
    return { error: 'Full description must be at least 2 characters.' } as const;
  }
  if (!VALID_PUBLISH_STATUSES.has(status)) {
    return { error: 'Invalid destination status.' } as const;
  }
  if (!/^[a-zA-Z0-9_-]{2,128}$/.test(id)) {
    return { error: 'Invalid destination ID format.' } as const;
  }

  let slug = serverSlugify(String(body.slug || name || id));
  if (slug.length < 2) {
    slug = slug ? `${slug}-${id.slice(-4).toLowerCase()}` : id.toLowerCase();
  }
  slug = slug.slice(0, 120);
  if (!/^[a-z0-9_-]+$/.test(slug)) {
    slug = id.toLowerCase();
  }

  return {
    data: {
      id,
      name,
      slug,
      region,
      category,
      shortDescription,
      description,
      bestSeason,
      elevation,
      imageUrl,
      featured,
      status
    }
  } as const;
}

function normalizeStringList(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item || '').trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function validateAndNormalizePackage(body: Record<string, unknown>, id: string) {
  const title = String(body.title || '').trim().slice(0, 150);
  const destinationId = String(body.destinationId || '').trim();
  const destinationName = String(body.destinationName || '').trim().slice(0, 120);
  const category = String(body.category || 'Hill Retreat').trim();
  const difficulty = String(body.difficulty || 'Easy').trim();
  const status = String(body.status || 'active').trim();
  const durationDays = Math.round(Number(body.durationDays));
  const durationNights = Math.round(Number(body.durationNights));
  const pricePerPerson = Number(body.pricePerPerson);
  const discountPercent = Number(body.discountPercent ?? 0);
  const maxGroupSize = Math.round(Number(body.maxGroupSize));
  const inclusions = normalizeStringList(body.inclusions, 25, 200);
  const itinerary = normalizeStringList(body.itinerary, 30, 400);
  const imageUrl = String(body.imageUrl || '').slice(0, 250000);
  const galleryImages = normalizeStringList(body.galleryImages, 12, 250000);
  const featured = Boolean(body.featured);

  if (title.length < 3) {
    return { error: 'Package title must be at least 3 characters.' } as const;
  }
  if (!/^[a-zA-Z0-9_-]{2,128}$/.test(id)) {
    return { error: 'Invalid package ID format.' } as const;
  }
  if (!/^[a-zA-Z0-9_-]{2,128}$/.test(destinationId)) {
    return { error: 'Please select a valid destination.' } as const;
  }
  if (!VALID_PKG_CATEGORIES.has(category)) {
    return { error: 'Invalid tour package category.' } as const;
  }
  if (!VALID_PKG_DIFFICULTIES.has(difficulty)) {
    return { error: 'Invalid package difficulty level.' } as const;
  }
  if (!VALID_PUBLISH_STATUSES.has(status)) {
    return { error: 'Invalid package status.' } as const;
  }
  if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 60) {
    return { error: 'Duration days must be between 1 and 60.' } as const;
  }
  if (!Number.isFinite(durationNights) || durationNights < 0 || durationNights > 60) {
    return { error: 'Duration nights must be between 0 and 60.' } as const;
  }
  if (!Number.isFinite(pricePerPerson) || pricePerPerson < 0 || pricePerPerson > 10000000) {
    return { error: 'Price per person must be between 0 and 10,000,000.' } as const;
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 95) {
    return { error: 'Discount must be between 0% and 95%.' } as const;
  }
  if (!Number.isFinite(maxGroupSize) || maxGroupSize < 1 || maxGroupSize > 200) {
    return { error: 'Max group size must be between 1 and 200.' } as const;
  }

  let slug = serverSlugify(String(body.slug || title || id));
  if (slug.length < 2) {
    slug = slug ? `${slug}-${id.slice(-4).toLowerCase()}` : id.toLowerCase();
  }
  slug = slug.slice(0, 150);
  if (!/^[a-z0-9_-]+$/.test(slug)) {
    slug = id.toLowerCase();
  }

  return {
    data: {
      id,
      title,
      slug,
      destinationId,
      destinationName,
      category,
      durationDays,
      durationNights,
      pricePerPerson,
      discountPercent,
      maxGroupSize,
      difficulty,
      inclusions,
      itinerary,
      imageUrl,
      galleryImages,
      featured,
      status
    }
  } as const;
}

async function createApp(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'live-the-world-admin-api', projectId: PROJECT_ID });
  });

  // ============================================================
  // CUSTOMERS BACKEND API
  // ============================================================
  app.get('/api/customers', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const result = await firestoreRequest(`${FIRESTORE_BASE_URL}/customers?pageSize=200`, req.authToken!);
    if (!result.ok) {
      res.status(result.status).json({ error: result.errorMessage });
      return;
    }
    const docs = ((result.data as { documents?: Array<{ name?: string; fields?: Record<string, FirestoreValue> }> })?.documents || []).map(
      fromFirestoreDoc
    );
    res.json({ ok: true, customers: docs });
  });

  app.post('/api/customers', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : makeServerId('cust');
    const validated = validateAndNormalizeCustomer(body, id);
    if ('error' in validated) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const d = validated.data;
    const commitResp = await firestoreRequest(`${FIRESTORE_BASE_URL}:commit`, req.authToken!, {
      method: 'POST',
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `${FIRESTORE_DOC_ROOT}/customers/${d.id}`,
              fields: {
                id: toFirestoreValue(d.id),
                fullName: toFirestoreValue(d.fullName),
                email: toFirestoreValue(d.email),
                phone: toFirestoreValue(d.phone),
                city: toFirestoreValue(d.city),
                country: toFirestoreValue(d.country),
                status: toFirestoreValue(d.status),
                notes: toFirestoreValue(d.notes)
              }
            },
            currentDocument: { exists: false },
            updateTransforms: [
              { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
              { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }
            ]
          }
        ]
      })
    });

    if (!commitResp.ok) {
      res.status(commitResp.status).json({ error: commitResp.errorMessage });
      return;
    }

    res.status(201).json({ ok: true, id: d.id, customer: d });
  });

  app.put('/api/customers/:id', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || '').trim();
    const validated = validateAndNormalizeCustomer((req.body || {}) as Record<string, unknown>, id);
    if ('error' in validated) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const d = validated.data;
    const commitResp = await firestoreRequest(`${FIRESTORE_BASE_URL}:commit`, req.authToken!, {
      method: 'POST',
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `${FIRESTORE_DOC_ROOT}/customers/${d.id}`,
              fields: {
                fullName: toFirestoreValue(d.fullName),
                email: toFirestoreValue(d.email),
                phone: toFirestoreValue(d.phone),
                city: toFirestoreValue(d.city),
                country: toFirestoreValue(d.country),
                status: toFirestoreValue(d.status),
                notes: toFirestoreValue(d.notes)
              }
            },
            updateMask: {
              fieldPaths: ['fullName', 'email', 'phone', 'city', 'country', 'status', 'notes']
            },
            currentDocument: { exists: true },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]
          }
        ]
      })
    });

    if (!commitResp.ok) {
      res.status(commitResp.status).json({ error: commitResp.errorMessage });
      return;
    }

    res.json({ ok: true, id: d.id, customer: d });
  });

  app.delete('/api/customers/:id', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || '').trim();
    if (!/^[a-zA-Z0-9_-]{2,128}$/.test(id)) {
      res.status(400).json({ error: 'Invalid customer ID.' });
      return;
    }
    const delResp = await firestoreRequest(`${FIRESTORE_BASE_URL}/customers/${encodeURIComponent(id)}`, req.authToken!, {
      method: 'DELETE'
    });
    if (!delResp.ok) {
      res.status(delResp.status).json({ error: delResp.errorMessage });
      return;
    }
    res.json({ ok: true, id });
  });

  // ============================================================
  // DESTINATIONS BACKEND API
  // ============================================================
  app.get('/api/destinations', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const result = await firestoreRequest(`${FIRESTORE_BASE_URL}/destinations?pageSize=200`, req.authToken!);
    if (!result.ok) {
      res.status(result.status).json({ error: result.errorMessage });
      return;
    }
    const docs = ((result.data as { documents?: Array<{ name?: string; fields?: Record<string, FirestoreValue> }> })?.documents || []).map(
      fromFirestoreDoc
    );
    res.json({ ok: true, destinations: docs });
  });

  app.post('/api/destinations', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : makeServerId('dest');
    const validated = validateAndNormalizeDestination(body, id);
    if ('error' in validated) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const d = validated.data;
    const commitResp = await firestoreRequest(`${FIRESTORE_BASE_URL}:commit`, req.authToken!, {
      method: 'POST',
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `${FIRESTORE_DOC_ROOT}/destinations/${d.id}`,
              fields: {
                id: toFirestoreValue(d.id),
                name: toFirestoreValue(d.name),
                slug: toFirestoreValue(d.slug),
                region: toFirestoreValue(d.region),
                category: toFirestoreValue(d.category),
                shortDescription: toFirestoreValue(d.shortDescription),
                description: toFirestoreValue(d.description),
                bestSeason: toFirestoreValue(d.bestSeason),
                elevation: toFirestoreValue(d.elevation),
                imageUrl: toFirestoreValue(d.imageUrl),
                featured: toFirestoreValue(d.featured),
                status: toFirestoreValue(d.status),
                createdBy: toFirestoreValue(req.authUid!)
              }
            },
            currentDocument: { exists: false },
            updateTransforms: [
              { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
              { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }
            ]
          }
        ]
      })
    });

    if (!commitResp.ok) {
      res.status(commitResp.status).json({ error: commitResp.errorMessage });
      return;
    }

    res.status(201).json({ ok: true, id: d.id, destination: { ...d, createdBy: req.authUid } });
  });

  app.put('/api/destinations/:id', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || '').trim();
    const validated = validateAndNormalizeDestination((req.body || {}) as Record<string, unknown>, id);
    if ('error' in validated) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const d = validated.data;
    const commitResp = await firestoreRequest(`${FIRESTORE_BASE_URL}:commit`, req.authToken!, {
      method: 'POST',
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `${FIRESTORE_DOC_ROOT}/destinations/${d.id}`,
              fields: {
                name: toFirestoreValue(d.name),
                slug: toFirestoreValue(d.slug),
                region: toFirestoreValue(d.region),
                category: toFirestoreValue(d.category),
                shortDescription: toFirestoreValue(d.shortDescription),
                description: toFirestoreValue(d.description),
                bestSeason: toFirestoreValue(d.bestSeason),
                elevation: toFirestoreValue(d.elevation),
                imageUrl: toFirestoreValue(d.imageUrl),
                featured: toFirestoreValue(d.featured),
                status: toFirestoreValue(d.status)
              }
            },
            updateMask: {
              fieldPaths: [
                'name',
                'slug',
                'region',
                'category',
                'shortDescription',
                'description',
                'bestSeason',
                'elevation',
                'imageUrl',
                'featured',
                'status'
              ]
            },
            currentDocument: { exists: true },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]
          }
        ]
      })
    });

    if (!commitResp.ok) {
      res.status(commitResp.status).json({ error: commitResp.errorMessage });
      return;
    }

    res.json({ ok: true, id: d.id, destination: d });
  });

  app.delete('/api/destinations/:id', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || '').trim();
    if (!/^[a-zA-Z0-9_-]{2,128}$/.test(id)) {
      res.status(400).json({ error: 'Invalid destination ID.' });
      return;
    }
    const delResp = await firestoreRequest(`${FIRESTORE_BASE_URL}/destinations/${encodeURIComponent(id)}`, req.authToken!, {
      method: 'DELETE'
    });
    if (!delResp.ok) {
      res.status(delResp.status).json({ error: delResp.errorMessage });
      return;
    }
    res.json({ ok: true, id });
  });

  // ============================================================
  // TOUR PACKAGES BACKEND API
  // ============================================================
  app.get('/api/packages', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const result = await firestoreRequest(`${FIRESTORE_BASE_URL}/packages?pageSize=200`, req.authToken!);
    if (!result.ok) {
      res.status(result.status).json({ error: result.errorMessage });
      return;
    }
    const docs = ((result.data as { documents?: Array<{ name?: string; fields?: Record<string, FirestoreValue> }> })?.documents || []).map(
      fromFirestoreDoc
    );
    res.json({ ok: true, packages: docs });
  });

  app.post('/api/packages', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : makeServerId('pkg');
    const validated = validateAndNormalizePackage(body, id);
    if ('error' in validated) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const d = validated.data;
    const destResp = await firestoreRequest(
      `${FIRESTORE_BASE_URL}/destinations/${encodeURIComponent(d.destinationId)}`,
      req.authToken!
    );
    if (!destResp.ok) {
      res.status(destResp.status === 404 ? 400 : destResp.status).json({
        error: destResp.status === 404 ? 'Selected destination was not found.' : destResp.errorMessage
      });
      return;
    }
    const destDoc = fromFirestoreDoc(destResp.data as { name?: string; fields?: Record<string, FirestoreValue> });
    const destinationName = String(destDoc.name || d.destinationName || '').trim().slice(0, 120);
    if (destinationName.length < 2) {
      res.status(400).json({ error: 'Selected destination has an invalid name.' });
      return;
    }

    const commitResp = await firestoreRequest(`${FIRESTORE_BASE_URL}:commit`, req.authToken!, {
      method: 'POST',
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `${FIRESTORE_DOC_ROOT}/packages/${d.id}`,
              fields: {
                id: toFirestoreValue(d.id),
                title: toFirestoreValue(d.title),
                slug: toFirestoreValue(d.slug),
                destinationId: toFirestoreValue(d.destinationId),
                destinationName: toFirestoreValue(destinationName),
                category: toFirestoreValue(d.category),
                durationDays: toFirestoreValue(d.durationDays),
                durationNights: toFirestoreValue(d.durationNights),
                pricePerPerson: toFirestoreValue(d.pricePerPerson),
                discountPercent: toFirestoreValue(d.discountPercent),
                maxGroupSize: toFirestoreValue(d.maxGroupSize),
                difficulty: toFirestoreValue(d.difficulty),
                inclusions: toFirestoreValue(d.inclusions),
                itinerary: toFirestoreValue(d.itinerary),
                imageUrl: toFirestoreValue(d.imageUrl),
                galleryImages: toFirestoreValue(d.galleryImages),
                featured: toFirestoreValue(d.featured),
                status: toFirestoreValue(d.status),
                createdBy: toFirestoreValue(req.authUid!)
              }
            },
            currentDocument: { exists: false },
            updateTransforms: [
              { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
              { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }
            ]
          }
        ]
      })
    });

    if (!commitResp.ok) {
      res.status(commitResp.status).json({ error: commitResp.errorMessage });
      return;
    }

    res.status(201).json({
      ok: true,
      id: d.id,
      package: { ...d, destinationName, createdBy: req.authUid }
    });
  });

  app.put('/api/packages/:id', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || '').trim();
    const validated = validateAndNormalizePackage((req.body || {}) as Record<string, unknown>, id);
    if ('error' in validated) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const d = validated.data;
    const destResp = await firestoreRequest(
      `${FIRESTORE_BASE_URL}/destinations/${encodeURIComponent(d.destinationId)}`,
      req.authToken!
    );
    if (!destResp.ok) {
      res.status(destResp.status === 404 ? 400 : destResp.status).json({
        error: destResp.status === 404 ? 'Selected destination was not found.' : destResp.errorMessage
      });
      return;
    }
    const destDoc = fromFirestoreDoc(destResp.data as { name?: string; fields?: Record<string, FirestoreValue> });
    const destinationName = String(destDoc.name || d.destinationName || '').trim().slice(0, 120);
    if (destinationName.length < 2) {
      res.status(400).json({ error: 'Selected destination has an invalid name.' });
      return;
    }

    const commitResp = await firestoreRequest(`${FIRESTORE_BASE_URL}:commit`, req.authToken!, {
      method: 'POST',
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `${FIRESTORE_DOC_ROOT}/packages/${d.id}`,
              fields: {
                title: toFirestoreValue(d.title),
                slug: toFirestoreValue(d.slug),
                destinationId: toFirestoreValue(d.destinationId),
                destinationName: toFirestoreValue(destinationName),
                category: toFirestoreValue(d.category),
                durationDays: toFirestoreValue(d.durationDays),
                durationNights: toFirestoreValue(d.durationNights),
                pricePerPerson: toFirestoreValue(d.pricePerPerson),
                discountPercent: toFirestoreValue(d.discountPercent),
                maxGroupSize: toFirestoreValue(d.maxGroupSize),
                difficulty: toFirestoreValue(d.difficulty),
                inclusions: toFirestoreValue(d.inclusions),
                itinerary: toFirestoreValue(d.itinerary),
                imageUrl: toFirestoreValue(d.imageUrl),
                galleryImages: toFirestoreValue(d.galleryImages),
                featured: toFirestoreValue(d.featured),
                status: toFirestoreValue(d.status)
              }
            },
            updateMask: {
              fieldPaths: [
                'title',
                'slug',
                'destinationId',
                'destinationName',
                'category',
                'durationDays',
                'durationNights',
                'pricePerPerson',
                'discountPercent',
                'maxGroupSize',
                'difficulty',
                'inclusions',
                'itinerary',
                'imageUrl',
                'galleryImages',
                'featured',
                'status'
              ]
            },
            currentDocument: { exists: true },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]
          }
        ]
      })
    });

    if (!commitResp.ok) {
      res.status(commitResp.status).json({ error: commitResp.errorMessage });
      return;
    }

    res.json({ ok: true, id: d.id, package: { ...d, destinationName } });
  });

  app.delete('/api/packages/:id', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || '').trim();
    if (!/^[a-zA-Z0-9_-]{2,128}$/.test(id)) {
      res.status(400).json({ error: 'Invalid package ID.' });
      return;
    }
    const delResp = await firestoreRequest(`${FIRESTORE_BASE_URL}/packages/${encodeURIComponent(id)}`, req.authToken!, {
      method: 'DELETE'
    });
    if (!delResp.ok) {
      res.status(delResp.status).json({ error: delResp.errorMessage });
      return;
    }
    res.json({ ok: true, id });
  });

  // ============================================================
  // VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
  // ============================================================
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Live The World Admin server running on http://0.0.0.0:${port}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start Live The World server:', err);
  process.exit(1);
});
