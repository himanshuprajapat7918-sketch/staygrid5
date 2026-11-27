import 'dotenv/config';
import crypto from 'crypto';
import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// ============================================================================
// SERVER-SIDE AUTHENTICATION & ACCOUNT STORAGE (scrypt + HMAC-SHA256 Bearer)
// ============================================================================
type UserRole = 'student' | 'landlord';

interface StudentProfileDetails {
  fullName: string;
  phone: string;
  collegeName: string;
  courseYear: string;
  preferredLocation: string;
  preferredCategory: 'hostel' | 'flat';
  genderPreference: 'Boys' | 'Girls' | 'Co-living';
  guardianPhone?: string;
}

interface LandlordProfileDetails {
  fullName: string;
  phone: string;
  businessName: string;
  operatingCity: string;
  propertyFocus: 'hostel' | 'flat' | 'both';
  totalUnits?: number;
  businessRegId?: string;
}

interface StoredUser {
  id: string;
  role: UserRole;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  profile: StudentProfileDetails | LandlordProfileDetails;
  createdAt: string;
  updatedAt: string;
}

interface PublicUser {
  id: string;
  role: UserRole;
  email: string;
  profile: StudentProfileDetails | LandlordProfileDetails;
  createdAt: string;
  updatedAt: string;
}

interface AuthenticatedRequest extends Request {
  authUser?: PublicUser;
  authJti?: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PRIMARY_DATA_DIR = path.resolve(__dirname, '.staygrid-data');
const FALLBACK_DATA_DIR = path.resolve(os.tmpdir(), 'staygrid-data');

function resolveWritableDataDir(): string {
  for (const dir of [PRIMARY_DATA_DIR, FALLBACK_DATA_DIR]) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      }
      fs.accessSync(dir, fs.constants.W_OK | fs.constants.R_OK);
      return dir;
    } catch {
      // Try next candidate directory
    }
  }
  return FALLBACK_DATA_DIR;
}

let activeDataDir = resolveWritableDataDir();

function getUsersFilePath(dir: string): string {
  const target = path.resolve(dir, 'users.json');
  if (!target.startsWith(dir + path.sep)) {
    throw new Error('Invalid account storage path configuration.');
  }
  return target;
}

const revokedJtis = new Set<string>();
const authRateMap = new Map<string, number[]>();

function checkAuthRateLimit(ip: string, limit = 60, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const prev = authRateMap.get(ip) || [];
  const recent = prev.filter((ts) => now - ts < windowMs);
  if (recent.length >= limit) {
    authRateMap.set(ip, recent);
    return false;
  }
  recent.push(now);
  authRateMap.set(ip, recent);
  return true;
}

function loadUsersFromDisk(): StoredUser[] {
  for (const dir of [activeDataDir, PRIMARY_DATA_DIR, FALLBACK_DATA_DIR]) {
    try {
      const file = getUsersFilePath(dir);
      if (!fs.existsSync(file)) continue;
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as StoredUser[];
      }
    } catch {
      // Try next candidate
    }
  }
  return [];
}

function saveUsersToDisk(users: StoredUser[]): boolean {
  const candidates = activeDataDir === PRIMARY_DATA_DIR ? [PRIMARY_DATA_DIR, FALLBACK_DATA_DIR] : [FALLBACK_DATA_DIR];
  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      }
      const targetFile = getUsersFilePath(dir);
      const tmpFile = path.resolve(dir, `users.${process.pid}.${Date.now()}.tmp`);
      if (!tmpFile.startsWith(dir + path.sep)) {
        throw new Error('Invalid temporary storage path.');
      }
      fs.writeFileSync(tmpFile, JSON.stringify(users, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tmpFile, targetFile);
      activeDataDir = dir;
      return true;
    } catch {
      // Fallback to next candidate directory
    }
  }
  return false;
}

let usersCache: StoredUser[] = loadUsersFromDisk();

function sanitizeUser(u: StoredUser): PublicUser {
  return {
    id: u.id,
    role: u.role,
    email: u.email,
    profile: u.profile,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(expectedHash, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function signSessionToken(user: StoredUser): string {
  const now = Date.now();
  const payload = {
    jti: crypto.randomBytes(16).toString('hex'),
    sub: user.id,
    role: user.role,
    email: user.email,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sigB64}`;
}

function verifySessionToken(token: string): { user: StoredUser; jti: string } | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(sigB64, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      jti?: string;
      sub?: string;
      exp?: number;
    };
    if (!payload.jti || !payload.sub || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    if (revokedJtis.has(payload.jti)) return null;

    const user = usersCache.find((u) => u.id === payload.sub);
    if (!user) return null;
    return { user, jti: payload.jti };
  } catch {
    return null;
  }
}

function cleanStr(val: unknown, maxLen: number): string {
  return typeof val === 'string' ? val.trim().slice(0, maxLen) : '';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 120;
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Please sign in to access this feature.' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const verified = verifySessionToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    return;
  }
  req.authUser = sanitizeUser(verified.user);
  req.authJti = verified.jti;
  next();
}

function requireRole(role: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (req.authUser.role !== role) {
      res.status(403).json({
        error: `This action requires a ${role === 'landlord' ? 'Landlord' : 'Student'} account.`,
      });
      return;
    }
    next();
  };
}

// Shared server-side Gemini SDK client with required telemetry header
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check your API key in the Settings > Secrets panel.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Graceful exponential backoff for transient 5xx / rate-limit errors
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : 0;
      const isRetryable = status === 500 || status === 502 || status === 503 || status === 504;
      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt - 1)));
    }
  }
  throw lastError;
}

interface GroundingLink {
  type: 'web' | 'maps';
  title: string;
  uri: string;
  snippets?: string[];
}

function extractGroundingLinks(response: unknown): GroundingLink[] {
  const links: GroundingLink[] = [];
  const seen = new Set<string>();
  const r = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
          maps?: {
            uri?: string;
            title?: string;
            placeAnswerSources?: {
              reviewSnippets?: Array<{
                content?: string;
                uri?: string;
                author?: string;
              }>;
            };
          };
        }>;
      };
    }>;
  };

  const chunks = r?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return links;

  for (const chunk of chunks) {
    if (chunk?.web?.uri && !seen.has(chunk.web.uri)) {
      seen.add(chunk.web.uri);
      links.push({
        type: 'web',
        title: chunk.web.title || chunk.web.uri,
        uri: chunk.web.uri,
      });
    }
    if (chunk?.maps?.uri) {
      const snippets: string[] = [];
      const reviewSnippets = chunk.maps.placeAnswerSources?.reviewSnippets;
      if (Array.isArray(reviewSnippets)) {
        for (const sn of reviewSnippets) {
          if (sn?.content) snippets.push(sn.content);
          if (sn?.uri && !seen.has(sn.uri)) {
            seen.add(sn.uri);
            links.push({
              type: 'maps',
              title: `${chunk.maps.title || 'Google Maps Place'} — Review`,
              uri: sn.uri,
              snippets: sn.content ? [sn.content] : undefined,
            });
          }
        }
      }
      if (!seen.has(chunk.maps.uri)) {
        seen.add(chunk.maps.uri);
        links.push({
          type: 'maps',
          title: chunk.maps.title || 'View on Google Maps',
          uri: chunk.maps.uri,
          snippets: snippets.length > 0 ? snippets.slice(0, 2) : undefined,
        });
      }
    }
  }
  return links;
}

function formatApiError(err: unknown): { status: number; message: string } {
  const e = err as { status?: number; message?: string };
  const status = typeof e?.status === 'number' && e.status >= 400 && e.status < 600 ? e.status : 500;
  const rawMessage = e?.message || 'Unexpected error communicating with Gemini API.';

  if (status === 403 || rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('API_KEY_INVALID')) {
    return {
      status: status === 500 ? 403 : status,
      message: 'Gemini API key error. Please verify your API key in the Settings > Secrets panel.',
    };
  }
  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'Gemini API quota exceeded. Please try again shortly or select a billing-enabled key in Settings > Secrets.',
    };
  }
  return { status, message: rawMessage };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // 1. Runtime Google Maps Platform browser config endpoint (never hardcodes API key)
  app.get('/api/config/maps', (_req, res) => {
    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.MAPS_API_KEY ||
      '';
    res.json({ apiKey });
  });

  // 1B. Server-side Reverse Geocoding proxy (avoids legacy JS Geocoder & browser CORS restrictions)
  app.get('/api/maps/reverse-geocode', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
      return;
    }

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.MAPS_API_KEY ||
      '';
    if (!apiKey) {
      res.json({ locationLabel: '', formattedAddress: '', placeId: '' });
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
        `${lat},${lng}`
      )}&language=en&key=${encodeURIComponent(apiKey)}`;
      const upstream = await fetch(url);
      if (upstream.status === 429) {
        res.status(429).json({ error: 'Google Maps quota exceeded.', quotaExceeded: true });
        return;
      }
      const data = (await upstream.json()) as {
        status?: string;
        results?: Array<{
          formatted_address?: string;
          place_id?: string;
          address_components?: Array<{ long_name?: string; types?: string[] }>;
        }>;
      };

      if (data.status === 'OVER_QUERY_LIMIT') {
        res.status(429).json({ error: 'Google Maps quota exceeded.', quotaExceeded: true });
        return;
      }

      const top = Array.isArray(data.results) ? data.results[0] : null;
      if (!top) {
        res.json({ locationLabel: '', formattedAddress: '', placeId: '' });
        return;
      }

      const comps = Array.isArray(top.address_components) ? top.address_components : [];
      const pick = (...types: string[]) =>
        comps.find((c) => Array.isArray(c.types) && types.some((t) => c.types!.includes(t)))?.long_name || '';

      const sublocality = pick('sublocality_level_1', 'sublocality', 'neighborhood', 'route');
      const locality = pick('locality', 'administrative_area_level_2', 'administrative_area_level_1');
      const parts = [sublocality, locality].filter(Boolean);
      const uniqueParts = Array.from(new Set(parts));
      const locationLabel = uniqueParts.join(', ') || top.formatted_address || '';

      res.json({
        locationLabel,
        formattedAddress: top.formatted_address || locationLabel,
        placeId: top.place_id || '',
      });
    } catch {
      res.json({ locationLabel: '', formattedAddress: '', placeId: '' });
    }
  });

  // 1C. Authentication & Account Routes (Students & Landlords)
  app.post('/api/auth/register', (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkAuthRateLimit(ip)) {
      res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
      return;
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const role = body.role === 'landlord' ? 'landlord' : body.role === 'student' ? 'student' : null;
    if (!role) {
      res.status(400).json({ error: 'Please select whether you are registering as a Student or Landlord.' });
      return;
    }

    const email = cleanStr(body.email, 120).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const fullName = cleanStr(body.fullName, 80);
    const phone = cleanStr(body.phone, 24);

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!isValidPhone(phone)) {
      res.status(400).json({ error: 'Please enter a valid phone number (at least 10 digits).' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
      return;
    }

    const existing = usersCache.find((u) => u.email === email);
    if (existing) {
      res.status(409).json({
        error: 'An account with this email already exists. Please sign in instead.',
      });
      return;
    }

    let profile: StudentProfileDetails | LandlordProfileDetails;
    if (role === 'student') {
      const collegeName = cleanStr(body.collegeName, 120);
      const courseYear = cleanStr(body.courseYear, 80);
      const preferredLocation = cleanStr(body.preferredLocation, 120);
      const preferredCategory = body.preferredCategory === 'flat' ? 'flat' : 'hostel';
      const genderRaw = cleanStr(body.genderPreference, 20);
      const genderPreference: 'Boys' | 'Girls' | 'Co-living' =
        genderRaw === 'Boys' || genderRaw === 'Girls' ? genderRaw : 'Co-living';
      const guardianPhone = cleanStr(body.guardianPhone, 24);

      if (collegeName.length < 2) {
        res.status(400).json({ error: 'Please enter your college or university name.' });
        return;
      }
      if (courseYear.length < 2) {
        res.status(400).json({ error: 'Please enter your course and year of study.' });
        return;
      }
      if (preferredLocation.length < 2) {
        res.status(400).json({ error: 'Please enter your preferred city or neighborhood.' });
        return;
      }

      profile = {
        fullName,
        phone,
        collegeName,
        courseYear,
        preferredLocation,
        preferredCategory,
        genderPreference,
        ...(guardianPhone ? { guardianPhone } : {}),
      };
    } else {
      const businessName = cleanStr(body.businessName, 120);
      const operatingCity = cleanStr(body.operatingCity, 120);
      const focusRaw = cleanStr(body.propertyFocus, 20);
      const propertyFocus: 'hostel' | 'flat' | 'both' =
        focusRaw === 'flat' || focusRaw === 'both' ? focusRaw : 'hostel';
      const totalUnitsNum = Number(body.totalUnits);
      const totalUnits =
        Number.isFinite(totalUnitsNum) && totalUnitsNum >= 0 && totalUnitsNum <= 5000
          ? Math.floor(totalUnitsNum)
          : undefined;
      const businessRegId = cleanStr(body.businessRegId, 60);

      if (businessName.length < 2) {
        res.status(400).json({ error: 'Please enter your PG, hostel, or property business name.' });
        return;
      }
      if (operatingCity.length < 2) {
        res.status(400).json({ error: 'Please enter the city or area where your property is located.' });
        return;
      }

      profile = {
        fullName,
        phone,
        businessName,
        operatingCity,
        propertyFocus,
        ...(typeof totalUnits === 'number' ? { totalUnits } : {}),
        ...(businessRegId ? { businessRegId } : {}),
      };
    }

    const { salt, hash } = hashPassword(password);
    const nowIso = new Date().toISOString();
    const newUser: StoredUser = {
      id: `usr_${crypto.randomBytes(10).toString('hex')}`,
      role,
      email,
      passwordSalt: salt,
      passwordHash: hash,
      profile,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    usersCache.push(newUser);
    saveUsersToDisk(usersCache);

    const token = signSessionToken(newUser);
    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkAuthRateLimit(ip)) {
      res.status(429).json({ error: 'Too many login attempts. Please wait a few minutes and try again.' });
      return;
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const email = cleanStr(body.email, 120).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const expectedRole =
      body.expectedRole === 'student' || body.expectedRole === 'landlord' ? body.expectedRole : null;

    if (!isValidEmail(email) || !password) {
      res.status(400).json({ error: 'Please enter a valid email address and password.' });
      return;
    }

    const user = usersCache.find((u) => u.email === email);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    if (expectedRole && user.role !== expectedRole) {
      const actualLabel = user.role === 'landlord' ? 'Landlord / Owner' : 'Student / Tenant';
      res.status(403).json({
        error: `This email is registered as a ${actualLabel} account. Switch to ${actualLabel} to sign in.`,
        actualRole: user.role,
      });
      return;
    }

    const token = signSessionToken(user);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.authUser });
  });

  app.patch('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const idx = usersCache.findIndex((u) => u.id === authUser.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const current = usersCache[idx];
    const fullName = cleanStr(body.fullName, 80) || current.profile.fullName;
    const phone = cleanStr(body.phone, 24) || current.profile.phone;

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }
    if (!isValidPhone(phone)) {
      res.status(400).json({ error: 'Please enter a valid phone number.' });
      return;
    }

    let nextProfile: StudentProfileDetails | LandlordProfileDetails;
    if (current.role === 'student') {
      const prev = current.profile as StudentProfileDetails;
      const genderRaw = cleanStr(body.genderPreference, 20);
      nextProfile = {
        fullName,
        phone,
        collegeName: cleanStr(body.collegeName, 120) || prev.collegeName,
        courseYear: cleanStr(body.courseYear, 80) || prev.courseYear,
        preferredLocation: cleanStr(body.preferredLocation, 120) || prev.preferredLocation,
        preferredCategory:
          body.preferredCategory === 'flat'
            ? 'flat'
            : body.preferredCategory === 'hostel'
            ? 'hostel'
            : prev.preferredCategory,
        genderPreference:
          genderRaw === 'Boys' || genderRaw === 'Girls' || genderRaw === 'Co-living'
            ? genderRaw
            : prev.genderPreference,
        ...(cleanStr(body.guardianPhone, 24) ? { guardianPhone: cleanStr(body.guardianPhone, 24) } : {}),
      };
    } else {
      const prev = current.profile as LandlordProfileDetails;
      const focusRaw = cleanStr(body.propertyFocus, 20);
      const totalUnitsNum = Number(body.totalUnits);
      const totalUnits =
        body.totalUnits !== '' &&
        body.totalUnits !== undefined &&
        Number.isFinite(totalUnitsNum) &&
        totalUnitsNum >= 0 &&
        totalUnitsNum <= 5000
          ? Math.floor(totalUnitsNum)
          : prev.totalUnits;
      const regId = cleanStr(body.businessRegId, 60);
      nextProfile = {
        fullName,
        phone,
        businessName: cleanStr(body.businessName, 120) || prev.businessName,
        operatingCity: cleanStr(body.operatingCity, 120) || prev.operatingCity,
        propertyFocus:
          focusRaw === 'hostel' || focusRaw === 'flat' || focusRaw === 'both'
            ? focusRaw
            : prev.propertyFocus,
        ...(typeof totalUnits === 'number' ? { totalUnits } : {}),
        ...(regId ? { businessRegId: regId } : {}),
      };
    }

    const updated: StoredUser = {
      ...current,
      profile: nextProfile,
      updatedAt: new Date().toISOString(),
    };
    usersCache[idx] = updated;
    try {
      saveUsersToDisk(usersCache);
    } catch {
      usersCache[idx] = current;
      res.status(500).json({ error: 'Could not update profile right now.' });
      return;
    }

    res.json({ user: sanitizeUser(updated) });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    if (req.authJti) {
      revokedJtis.add(req.authJti);
    }
    res.json({ ok: true });
  });

  // 2. Multi-turn Landlord AI Agent (Rent Dues, Complaints, Notices, Search & Maps Grounding)
  app.post('/api/ai/landlord-agent', requireAuth, requireRole('landlord'), async (req, res) => {
    try {
      const { messages, mode = 'ops', context = {}, userLocation } = req.body || {};
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Messages array is required.' });
        return;
      }

      const ai = getGeminiClient();
      const safeHistory = messages
        .slice(-14)
        .map((m: { role?: string; text?: string }) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(m.text || '').slice(0, 4000) }],
        }))
        .filter((m: { parts: Array<{ text: string }> }) => m.parts[0].text.trim().length > 0);

      if (safeHistory.length === 0) {
        res.status(400).json({ error: 'At least one non-empty message is required.' });
        return;
      }

      const contextSnapshot = JSON.stringify(context).slice(0, 24000);
      const baseInstruction = [
        'You are the StayGrid Landlord AI Operations Agent for an Indian college hostel, PG, and residential flats management platform.',
        'Always format currency in Indian Rupees (₹) with commas (e.g., ₹9,200).',
        'Be concise, structured, accurate, and directly actionable. Use crisp bullet points or compact tables when summarizing dues, pending rents, or maintenance complaints.',
        'Never invent tenant names, phone numbers, rent amounts, or complaints that are not in the LIVE PORTFOLIO DATA below.',
        'When asked about dues or rents, break down: (1) Total Collected vs Total Pending Dues, (2) exact tenants with pending rent status including property, room/flat number, monthly rent, and contact info, and (3) offer or draft ready-to-send polite rent reminders.',
        'When asked about maintenance complaints, prioritize High/Urgent issues first, cite the exact room/flat and tenant name, and recommend clear next steps.',
        `LIVE PORTFOLIO DATA (JSON): ${contextSnapshot}`,
      ].join('\n');

      // Note: googleMaps cannot be combined with googleSearch in the same request
      let config: Record<string, unknown> = {
        systemInstruction: baseInstruction,
      };

      if (mode === 'maps') {
        const lat = Number(userLocation?.lat);
        const lng = Number(userLocation?.lng);
        config = {
          systemInstruction:
            baseInstruction +
            '\nYou are currently in Google Maps Grounding mode. Help the landlord locate real nearby maintenance vendors (plumbers, electricians, hardware stores), colleges, transit hubs, or neighborhood landmarks around their property.',
          tools: [{ googleMaps: {} }],
          ...(Number.isFinite(lat) && Number.isFinite(lng)
            ? {
                toolConfig: {
                  retrievalConfig: {
                    latLng: { latitude: lat, longitude: lng },
                  },
                },
              }
            : {}),
        };
      } else if (mode === 'search') {
        config = {
          systemInstruction:
            baseInstruction +
            '\nYou are currently in Google Search Grounding mode. Provide up-to-date real-world rental benchmarks, local utility/electricity tariff norms, hostel/PG regulations, or maintenance cost estimates grounded in current web search results.',
          tools: [{ googleSearch: {} }],
        };
      }

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: safeHistory,
          config,
        })
      );

      const text = response.text || 'I could not generate a response right now. Please try rephrasing your request.';
      const groundingLinks = extractGroundingLinks(response);

      res.json({
        reply: text,
        mode,
        model: 'gemini-4-hydrogen',
        groundingLinks,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 3. Fast AI Triage when a Tenant files a Maintenance Complaint Letter (gemini-3.1-flash-lite)
  app.post('/api/ai/complaint-alert', requireAuth, async (req, res) => {
    try {
      const { complaint } = req.body || {};
      if (!complaint || !complaint.subject || !complaint.letterBody) {
        res.status(400).json({ error: 'Complaint subject and letter body are required.' });
        return;
      }

      const ai = getGeminiClient();
      const prompt = [
        'Analyze this tenant maintenance complaint letter and produce a concise landlord alert briefing.',
        `Property: ${complaint.propertyName || 'Unknown'}`,
        `Room/Flat: ${complaint.roomLabel || 'General'}`,
        `Tenant: ${complaint.tenantName || 'Tenant'}`,
        `Category: ${complaint.category || 'Maintenance'}`,
        `Tenant-selected urgency: ${complaint.urgency || 'Medium'}`,
        `Subject: ${complaint.subject}`,
        `Letter: ${complaint.letterBody}`,
      ].join('\n');

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            systemInstruction:
              'You triage student hostel and residential flat maintenance complaints for landlords. Return strictly valid JSON matching the schema.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                priority: {
                  type: Type.STRING,
                  description: 'One of: Urgent, High, Medium, Low',
                },
                alertHeadline: {
                  type: Type.STRING,
                  description: 'One-sentence notification headline for the landlord.',
                },
                recommendedAction: {
                  type: Type.STRING,
                  description: 'Practical next step for the landlord or maintenance staff in 1-2 sentences.',
                },
                suggestedSla: {
                  type: Type.STRING,
                  description: 'Target resolution timeframe, e.g. "Within 4 hours" or "Within 24 hours".',
                },
              },
              required: ['priority', 'alertHeadline', 'recommendedAction', 'suggestedSla'],
            },
          },
        })
      );

      const raw = (response.text || '{}').trim();
      const parsed = JSON.parse(raw);
      res.json({ triage: parsed, model: 'gemini-3.1-flash-lite' });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 4. Tenant Neighborhood Discovery (Google Maps Grounding & Google Search Grounding)
  app.post('/api/ai/neighborhood-guide', requireAuth, async (req, res) => {
    try {
      const { query, locationName, mode = 'maps', latLng } = req.body || {};
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'A neighborhood question or search query is required.' });
        return;
      }

      const ai = getGeminiClient();
      const prompt = `Location context: ${locationName || 'India'}.\nStudent/Tenant question: ${query.slice(0, 1200)}`;

      let config: Record<string, unknown>;
      if (mode === 'search') {
        config = {
          systemInstruction:
            'You help college students and tenants evaluate neighborhoods, commute options, safety, living costs, and nearby colleges using live Google Search data. Be concise and helpful.',
          tools: [{ googleSearch: {} }],
        };
      } else {
        const lat = Number(latLng?.lat);
        const lng = Number(latLng?.lng);
        config = {
          systemInstruction:
            'You help college students and tenants find real nearby colleges, metro/bus stops, affordable mess/cafes, libraries, gyms, hospitals, and supermarkets using Google Maps data. Be concise and list standout options clearly.',
          tools: [{ googleMaps: {} }],
          ...(Number.isFinite(lat) && Number.isFinite(lng)
            ? {
                toolConfig: {
                  retrievalConfig: {
                    latLng: { latitude: lat, longitude: lng },
                  },
                },
              }
            : {}),
        };
      }

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config,
        })
      );

      res.json({
        answer: response.text || 'No neighborhood details were returned. Try another query.',
        mode,
        model: 'gemini-4-hydrogen',
        groundingLinks: extractGroundingLinks(response),
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Ensure /api/* always responds with JSON (never HTML) on unknown routes or malformed bodies
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { status?: number; type?: string; message?: string };
    if (e?.type === 'entity.parse.failed' || e?.status === 400) {
      res.status(400).json({ error: 'Invalid request payload.' });
      return;
    }
    res.status(500).json({ error: 'StayGrid server error. Please try again.' });
  });

  // Static / Vite middleware
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StayGrid server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start StayGrid server:', err);
  process.exit(1);
});
