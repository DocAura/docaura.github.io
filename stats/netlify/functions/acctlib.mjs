// Accounts for PAID resume downloads only. No passwords are ever stored: people either sign in with
// Google (we keep only their email address and Google's account number) or keep a restore code.
// Free users never create an account.

export const GOOGLE_CLIENT_ID = '554580418104-mtjrc0kc5fnfp2aqu8uu26bmq50mc4m2.apps.googleusercontent.com'; // public OAuth web client id; empty = Google sign-in switched off
const ALPHA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // no 0/O/1/I/L to avoid mix-ups
const SESSION_DAYS = 180;

export function randomCode() {
  const b = crypto.getRandomValues(new Uint8Array(8)); let s = '';
  for (const x of b) s += ALPHA[x % ALPHA.length];
  return 'DA-' + s.slice(0, 4) + '-' + s.slice(4);
}
export function normCode(c) {
  const s = String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^DA/, '');
  return s.length === 8 && [...s].every((ch) => ALPHA.includes(ch)) ? 'DA-' + s.slice(0, 4) + '-' + s.slice(4) : null;
}
function token() { return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url'); }
function publicState(a, extra = {}) {
  return { credits: a.credits, email: a.email || '', code: a.code || '', paid: a.claims.reduce((t, c) => t + c.amount, 0), ...extra };
}

// store: { get(key) -> object|null, set(key, object), del(key) } ; verifyGoogle(credential) -> {sub, email} | null
export async function handle(op, body, store, verifyGoogle, now = Date.now()) {
  async function newSession(id) { const t = token(); await store.set('s/' + t, { id, exp: now + SESSION_DAYS * 864e5 }); return t; }
  async function fromSession(t) {
    if (typeof t !== 'string' || t.length < 20) return null;
    const s = await store.get('s/' + t); if (!s || s.exp < now) return null;
    return await store.get('a/' + s.id);
  }
  async function create(fields) {
    const id = token().slice(0, 16), code = await uniqueCode();
    const a = { id, code, email: '', gsub: '', credits: 0, claims: [], created: now, last: now, ...fields };
    await store.set('a/' + id, a); await store.set('c/' + code, { id });
    return a;
  }
  async function uniqueCode() { for (let i = 0; i < 5; i++) { const c = randomCode(); if (!(await store.get('c/' + c))) return c; } throw new Error('code'); }
  async function save(a) { a.last = now; await store.set('a/' + a.id, a); }

  if (op === 'state') {
    const a = await fromSession(body.session); if (!a) return { error: 'signed-out' };
    return publicState(a);
  }
  if (op === 'code') {
    const c = normCode(body.code); const ref = c && (await store.get('c/' + c));
    const a = ref && (await store.get('a/' + ref.id)); if (!a) return { error: 'bad-code' };
    return publicState(a, { session: await newSession(a.id) });
  }
  if (op === 'google') {
    const g = await verifyGoogle(body.credential); if (!g) return { error: 'bad-google' };
    const ref = await store.get('g/' + g.sub);
    let a = ref && (await store.get('a/' + ref.id));
    const cur = await fromSession(body.session);
    if (!a && cur && !cur.gsub) { a = cur; a.gsub = g.sub; a.email = g.email; } // link Google to a code account
    else if (a && cur && cur.id !== a.id && !cur.gsub) { a.credits += cur.credits; a.claims = a.claims.concat(cur.claims); cur.credits = 0; await save(cur); } // merge
    if (!a) a = await create({ gsub: g.sub, email: g.email });
    a.email = g.email; await save(a); await store.set('g/' + g.sub, { id: a.id });
    return publicState(a, { session: await newSession(a.id) });
  }
  if (op === 'claim') {
    const utr = String(body.utr || '').replace(/\D/g, '').slice(-6), amount = Number(body.amount), downloads = Number(body.downloads);
    const PLANS = { 10: 2, 50: 10 };
    if (utr.length !== 6 || PLANS[amount] !== downloads) return { error: 'bad-claim' };
    if (await store.get('u/' + utr)) return { error: 'utr-used' };
    let a = await fromSession(body.session), fresh = false;
    if (!a) { a = await create({}); fresh = true; }
    a.credits += downloads; a.claims.push({ utr, amount, downloads, ts: now }); await save(a);
    await store.set('u/' + utr, { id: a.id, ts: now });
    return publicState(a, fresh ? { session: await newSession(a.id), newCode: true } : {});
  }
  if (op === 'use') {
    const a = await fromSession(body.session); if (!a) return { error: 'signed-out' };
    if (a.credits <= 0) return publicState(a, { ok: false });
    a.credits -= 1; await save(a); return publicState(a, { ok: true });
  }
  if (op === 'merge') { // move downloads bought before signing in on this device into the account
    const a = await fromSession(body.session); if (!a) return { error: 'signed-out' };
    const add = Math.max(0, Math.min(50, Math.floor(Number(body.credits) || 0)));
    a.credits += add; if (add) a.claims.push({ utr: 'device', amount: 0, downloads: add, ts: now }); await save(a);
    return publicState(a);
  }
  if (op === 'logout') { if (typeof body.session === 'string') await store.del('s/' + body.session); return { ok: true }; }
  return { error: 'op' };
}

// Check a Google sign-in token with Google itself: right app, verified email, not expired.
export async function verifyGoogleToken(credential, fetchFn = fetch) {
  if (!GOOGLE_CLIENT_ID || typeof credential !== 'string' || credential.length > 4096) return null;
  try {
    const r = await fetchFn('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
    if (!r.ok) return null;
    const t = await r.json();
    if (t.aud !== GOOGLE_CLIENT_ID || !['accounts.google.com', 'https://accounts.google.com'].includes(t.iss)) return null;
    if (String(t.email_verified) !== 'true' || Number(t.exp) * 1000 < Date.now()) return null;
    return { sub: String(t.sub), email: String(t.email).toLowerCase() };
  } catch { return null; }
}
