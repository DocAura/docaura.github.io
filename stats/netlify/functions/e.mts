// POST /api/e : records one anonymous event sent by docaura.github.io (via navigator.sendBeacon).
import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { buildKey, device, istDay, refHost, validate, visitorId } from "./lib.mjs";

export default async (req: Request, context: Context) => {
  const text = (await req.text()).slice(0, 2048);
  let body: any = null;
  try { body = JSON.parse(text); } catch {}
  const bad = validate(body, req.headers.get("origin") || "");
  if (bad) return new Response(null, { status: 204 }); // ignore quietly; nothing to tell a bot
  const ts = Date.now();
  const ua = req.headers.get("user-agent") || "";
  const vid = await visitorId(context.ip || "", ua, istDay(ts), Netlify.env.get("DASH_KEY") || context.site?.id || "docaura");
  const key = buildKey({
    ts, vid, ev: body.n, page: body.p || "/", country: context.geo?.country?.code || "--",
    dev: device(ua), ref: body.n === "pageview" ? refHost(body.r || "") : "", props: body.d || {},
  });
  // One log line per event: lets the site owner's assistant read today's activity from Netlify logs
  console.log("EV " + key);
  context.waitUntil(getStore("events").set(key, ""));
  return new Response(null, { status: 204 });
};

export const config: Config = { path: "/api/e", method: ["POST"] };
