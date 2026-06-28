# W1HVD weather proxy

A Cloudflare Worker that fetches the W1HVD station's latest readings from the
Ambient Weather REST API and serves them to the website. It exists so the
Ambient Weather **apiKey stays server-side** (that key grants read access to all
of your devices and must never be shipped to the browser).

What it does:

- Calls `https://rt.ambientweather.net/v1/devices` with your keys.
- Returns **only sensor fields** (temperature, humidity, wind, etc.) — no
  location or coordinates.
- Restricts CORS to the site origins.
- Edge-caches the upstream response for 60s to stay under AWN's 1 req/sec limit.

## Get your keys

1. Sign in at <https://ambientweather.net>, open **Account → API Keys**.
2. Create an **Application Key** and an **API Key**.
3. (Optional) Note your station's **MAC address** (Devices → device info) if the
   account has more than one device.

## Deploy

```sh
cd workers/weather
npm install                 # installs wrangler (pinned in package.json)
npx wrangler login

# store the secrets (you'll be prompted to paste each value)
npx wrangler secret put AW_APPLICATION_KEY
npx wrangler secret put AW_API_KEY

# optional: pin to a specific device by editing AW_MAC in wrangler.toml

npm run deploy
```

`npm run deploy` prints the Worker URL (e.g.
`https://w1hvd-weather.<subdomain>.workers.dev`), or attach a custom route such
as `https://api.w1hvd.com/weather`.

## Wire it to the site

Set the Worker URL in `config/_default/params.toml`:

```toml
weather_api_url = "https://w1hvd-weather.<subdomain>.workers.dev"
```

The Weather page (`content/english/weather/index.md`) renders the
`{{< weather >}}` shortcode, which polls this URL every 60s and updates in place.

## Privacy note

Showing only "W1HVD" with no address still leaves the station discoverable on
Ambient Weather's public map. To fully hide the location, set the device to
**private** on AWN — this proxy keeps working because it authenticates with your
apiKey (only the _public embed_ requires the device to be public).
