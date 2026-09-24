# My Location Info — UI/API-ready rebuild

This package is the front-end foundation for the My Location Info PWA.

## Screens
- `index.html` — Home
- `position.html` — Position / interactive-map area
- `gps-data.html` — device GPS/sensor information
- `address.html` — address and location details
- `weather.html` — weather details

## Navigation
There are exactly four bottom tabs:
Position, GPS Data, Address, Weather.

Every internal page has a Home button in the fixed header.
The header and bottom navigation are fixed; only the page content scrolls.

## API architecture
API-specific code is deliberately separated from the pages.

- `js/api-config.js` — provider enable/disable and endpoint configuration
- `js/services/address-service.js` — address provider orchestration
- `js/services/weather-service.js` — weather provider orchestration
- `js/gps-core.js` — high-accuracy device GPS and offline last-fix retention
- `js/services/thumbnail-service.js` — future image/POI thumbnail support
- `js/offline-cache.js` — common local cache helpers

### Planned address provider order
HERE -> Mapbox -> future provider -> last successful cached result.

### Planned weather provider order
Primary provider -> Open-Meteo -> future provider -> last successful cached result.

The current browser package contains no API secrets.
Secret provider keys should be kept in Cloudflare Worker Secrets and exposed
through server-side proxy endpoints.

## GPS
`gps-core.js` uses:
- `enableHighAccuracy: true`
- `maximumAge: 0`
- continuous `watchPosition`
- local retention of the last valid fix

Device GPS remains authoritative. IP location is not used as a substitute.

## CSS
- `common.css` — shell, header, bottom navigation, cards
- `home.css` — static Home screen
- `position.css` — map-first Position page
- `gps-data.css` — GPS Data page
- `address.css` — Address page
- `weather.css` — Weather page
- `responsive.css` — responsive adjustments

## Important
The map drawing in this UI foundation is intentionally provider-neutral.
When Mapbox/HERE is added later, replace the map layer/service, not the page
layout or CSS.
