# My Location Info

Clean iPhone-first PWA rebuild. The `main` branch is not used for this rebuild.

## Behaviour
- Device HTML5 GPS: immediate `getCurrentPosition()` plus continuous high-accuracy `watchPosition()`.
- GPS continues without internet; the last GPS fix is stored locally.
- Address and weather are online services with local last-result fallback.
- Optional `addressProxy` and `weatherProxy` endpoints can be configured in `app.js`; browser API credentials should stay on a server/Cloudflare Worker, never in this repository.
- Home uses a centred MapLibre globe card below the titles, with the current GPS marker.
- Detail pages keep the header and bottom navigation fixed; only the middle content scrolls.
- Compass is a miniature header control and uses iOS DeviceOrientation permission when required.
- Solar day/night phase is calculated locally with SunCalc.

## Map
The globe uses MapLibre GL JS and OpenStreetMap raster tiles. MapLibre is loaded from a pinned CDN version. Internet map tiles are not required for GPS itself.
