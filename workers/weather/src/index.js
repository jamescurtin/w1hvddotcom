/**
 * W1HVD weather proxy (Cloudflare Worker).
 *
 * Calls the Ambient Weather REST API server-side so the secret apiKey never
 * reaches the browser, returns only sensor readings (no location/coords), and
 * edge-caches the upstream response so we stay under AWN's 1 req/sec limit.
 *
 * Required secrets (set with `wrangler secret put <NAME>`):
 *   AW_APPLICATION_KEY  - Ambient Weather application key
 *   AW_API_KEY          - Ambient Weather API key (grants read access; keep secret)
 * Optional var (wrangler.toml [vars]):
 *   AW_MAC              - station MAC address to select a specific device
 */

const AWN_DEVICES = "https://rt.ambientweather.net/v1/devices";

// Origins allowed to call this proxy (production site + local Hugo dev server).
const ALLOWED_ORIGINS = new Set([
  "https://w1hvd.com",
  "https://www.w1hvd.com",
  "http://localhost:1313",
]);

// Only these (location-free) sensor fields are exposed to the client.
const FIELDS = [
  "date",
  "tempf",
  "feelsLike",
  "humidity",
  "windspeedmph",
  "windgustmph",
  "winddir",
  "baromrelin",
  "hourlyrainin",
  "dailyrainin",
  "uv",
  "solarradiation",
];

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://w1hvd.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
}

function json(request, body, status, extra) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request),
      ...(extra || {}),
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }
    if (request.method !== "GET") {
      return json(request, { error: "method not allowed" }, 405);
    }
    if (!env.AW_APPLICATION_KEY || !env.AW_API_KEY) {
      return json(request, { error: "proxy not configured" }, 500);
    }

    const upstreamUrl = `${AWN_DEVICES}?applicationKey=${encodeURIComponent(
      env.AW_APPLICATION_KEY,
    )}&apiKey=${encodeURIComponent(env.AW_API_KEY)}`;

    let upstream;
    try {
      // Edge-cache the AWN response for 60s (it updates ~once/min) so repeated
      // visitors don't blow the upstream rate limit.
      upstream = await fetch(upstreamUrl, {
        cf: { cacheTtl: 60, cacheEverything: true },
      });
    } catch {
      return json(request, { error: "upstream unreachable" }, 502);
    }
    if (!upstream.ok) {
      return json(request, { error: "upstream " + upstream.status }, 502);
    }

    let devices;
    try {
      devices = await upstream.json();
    } catch {
      return json(request, { error: "bad upstream response" }, 502);
    }

    const device = env.AW_MAC
      ? devices.find((d) => d.macAddress === env.AW_MAC)
      : devices[0];
    if (!device || !device.lastData) {
      return json(request, { error: "device not found" }, 404);
    }

    const data = {};
    for (const field of FIELDS) {
      if (field in device.lastData) data[field] = device.lastData[field];
    }

    return json(request, { data }, 200, {
      "Cache-Control": "public, max-age=60",
    });
  },
};
