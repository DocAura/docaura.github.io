// GET /api/stats?days=7 : private summary for the dashboard (needs the secret key).
import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { istDay, parseKey, summarise } from "./lib.mjs";

const KEY_SHA256 = "14354350ea41427f88f1965688917e1891187973c5836e1adbd52a0c687a1445";
async function sha256(t: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Buffer.from(d).toString("hex");
}

export default async (req: Request, context: Context) => {
  // Only a SHA-256 fingerprint of the dashboard key lives in this (public) code; the key itself does not.
  const got = req.headers.get("x-dash-key") || "";
  const envKey = Netlify.env.get("DASH_KEY");
  const ok = (envKey && got === envKey) || (got.length >= 16 && (await sha256(got)) === KEY_SHA256);
  if (!ok) return Response.json({ error: "Wrong or missing key" }, { status: 401 });
  const url = new URL(req.url);
  const days = Math.min(31, Math.max(1, Number(url.searchParams.get("days")) || 7));
  const store = getStore("events");
  const now = Date.now(), today = istDay(now);
  const events: any[] = [];
  for (let i = 0; i < days; i++) {
    const day = istDay(now - i * 864e5);
    const { blobs } = await store.list({ prefix: day + "/" });
    for (const b of blobs) events.push(parseKey(b.key));
  }
  const s: any = summarise(events, today);
  s.generatedAt = now; s.rangeDays = days; s.totalEvents = events.length;
  // Paid users (email for Google sign-in, else only their restore code). No passwords exist anywhere.
  try {
    const acc = getStore({ name: "accounts", consistency: "strong" });
    const { blobs } = await acc.list({ prefix: "a/" });
    const list: any[] = [];
    for (const b of blobs.slice(0, 500)) {
      const a: any = await acc.get(b.key, { type: "json" }); if (!a) continue;
      list.push({ who: a.email || a.code, google: !!a.email, credits: a.credits, paid: (a.claims || []).reduce((t: number, c: any) => t + (c.amount || 0), 0),
        utrs: (a.claims || []).filter((c: any) => c.utr !== "device").map((c: any) => c.utr), last: a.last });
    }
    s.accounts = list.sort((x, y) => y.last - x.last);
  } catch { s.accounts = []; }
  return Response.json(s, { headers: { "cache-control": "no-store" } });
};

export const config: Config = { path: "/api/stats", method: ["GET"], rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] } }; // Netlify blocks floods; we never store IPs ourselves
