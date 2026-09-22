# My Location Info

Offline-first GPS and travel companion web app.

## Live Earth upgrade

The Home and Position views now use Globe.GL 2.46.2, a ThreeJS/WebGL globe component. The implementation uses the official Globe.GL API for:
- real 3D Earth rendering
- Asia/India-first camera positioning
- live GPS point and pulsing location ring
- an HTML marker attached to the real geographic GPS point
- drag, pinch and zoom controls
- atmospheric glow
- solar-position-driven directional lighting for a moving day/night boundary
- offline caching of the Globe.GL script and Earth assets through the service worker

The marker intentionally contains only:
1. place name
2. local time
3. date

It does not display a "Current GPS position" status label.

Globe.GL is MIT licensed and the current pinned package version is 2.46.2. The project is loaded from jsDelivr and cached by the PWA service worker after the app has been opened online once.

## Offline-first rules

GPS is the authoritative position. IP location must never overwrite it.

Core offline functions include:
- device GPS coordinates
- accuracy, elevation where available, speed and heading where available
- DMS
- Plus Code
- DIGIPIN in India
- local date/time/timezone
- solar day/night calculation
- live Earth rendering after Globe.GL/Earth assets have been cached
- saved places in IndexedDB
- share coordinates
- PWA shell

Address and weather are optional online enrichment. If no provider is configured, the app clearly keeps the offline GPS functions available.

Compass permission is requested from a user gesture when iOS requires it. The app never fabricates a heading.

External API keys must remain server-side, for example in Cloudflare Functions/Workers secrets.

## Address

The app does not use IP geolocation as an authoritative address. The intended flow is:

GPS coordinates -> reverse geocoder -> address

Offline wording remains:
"Address will be available when data is connected."

## Weather

The Weather view is prepared for provider integration. Add the provider through js/services/weather.js, with secrets and usage controls kept server-side.

## DIGIPIN

The encoder in js/digipin.js is based on the public implementation released by the Department of Posts, Government of India.

Official references:
- https://www.indiapost.gov.in/digipin
- https://github.com/INDIAPOST-gov/digipin

## Cloudflare Pages

No build step is required. Use the main branch and repository root.

After deploying this upgrade, open the app once while connected so the new WebGL library and Earth textures can be cached by the service worker. Then test:
1. Home globe
2. drag/rotate
3. pinch zoom
4. GPS marker movement
5. Add to Home Screen
6. airplane/offline mode
7. return from Google Maps
