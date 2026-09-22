# My Location Info

Offline-first GPS and travel companion web app.

## Foundation uploaded

- Home screen with day/night globe concept and live GPS marker
- Position page with coordinates, DMS, Plus Code, DIGIPIN (India only), elevation and accuracy
- GPS Data page with status, fix, accuracy, speed, heading, date, time and timezone
- Address page with GPS-authoritative coordinates and optional online enrichment
- Weather page with the complete weather tile structure ready for an API
- Saved Places in IndexedDB
- SAVE / SHARE / MAP / DELETE only on Position
- PWA manifest and service worker
- No IP geolocation used as a substitute for GPS
- External API adapters isolated in js/services
- pageshow restoration after returning from external Maps

## Rules

GPS is the authoritative position. IP location must never overwrite it.

Address and weather are optional online enrichment. The app remains useful without them.

Compass permission is requested from a user gesture when iOS requires it. The app never fabricates a heading.

External API keys must remain server-side, for example in Cloudflare Functions/Workers secrets.

## DIGIPIN

The encoder in js/digipin.js is based on the public implementation released by the Department of Posts, Government of India. India Post states that DIGIPIN is an offline 10-character geocoded addressing system for India and gives the bounding box 63.5–99.5 E and 2.5–38.5 N.

Official references:
- https://www.indiapost.gov.in/digipin
- https://github.com/INDIAPOST-gov/digipin

## API adapters

No provider is activated in this first foundation commit.

Add providers later through:
- js/services/weather.js
- js/services/location.js

Keep provider secrets outside browser code and add caching, throttling and usage limits in the Cloudflare layer.

## Cloudflare Pages

No build step is required. Use the main branch and repository root as the output directory.
