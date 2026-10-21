// GET /api/stats?days=7 : private summary for the dashboard (needs the secret key).
import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { istDay, parseKey, summarise } from "./lib.mjs";

export default async (req: Request, context: Context) => {
  const want = Netlify.env.get("DASH_KEY");
  const got = req.headers.get("x-dash-key") || "";
  if (!want || got !== want) return Response.json({ error: "Wrong or missing key" }, { status: 401 });
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
  return Response.json(s, { headers: { "cache-control": "no-store" } });
};

export const config: Config = { path: "/api/stats", method: ["GET"] };
