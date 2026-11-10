// POST /api/acct : sign-in and saved downloads for people who PAID for resume downloads.
import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { SITE_ORIGINS } from "./lib.mjs";
import { handle, verifyGoogleToken } from "./acctlib.mjs";

function cors(origin: string) {
  return { "access-control-allow-origin": origin, "vary": "origin", "cache-control": "no-store", "content-type": "application/json" };
}

export default async (req: Request, context: Context) => {
  const origin = req.headers.get("origin") || "";
  if (!SITE_ORIGINS.has(origin)) return new Response(null, { status: 403 });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors(origin), "access-control-allow-methods": "POST", "access-control-allow-headers": "content-type" } });
  let body: any = null;
  try { body = JSON.parse((await req.text()).slice(0, 6000)); } catch {}
  if (!body || typeof body.op !== "string") return new Response(JSON.stringify({ error: "body" }), { status: 400, headers: cors(origin) });
  const blobs = getStore({ name: "accounts", consistency: "strong" });
  const store = {
    get: (k: string) => blobs.get(k, { type: "json" }),
    set: (k: string, v: any) => blobs.setJSON(k, v),
    del: (k: string) => blobs.delete(k),
  };
  try {
    const out = await handle(body.op, body, store, (c: string) => verifyGoogleToken(c));
    return new Response(JSON.stringify(out), { status: 200, headers: cors(origin) });
  } catch (e) {
    return new Response(JSON.stringify({ error: "server" }), { status: 500, headers: cors(origin) });
  }
};

export const config: Config = { path: "/api/acct", method: ["POST", "OPTIONS"] };
