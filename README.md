# Flight Radius Finder (MVP)

A deployable Next.js MVP that helps users pick a point on a map, choose a radius, and view demo flights from airports inside that radius.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Leaflet (client-side via dynamic import)

## Features

- Clickable map to select geographic center
- Departure search with city/airport suggestions
- Radius presets: 50 / 100 / 200 / 300 km
- Static airport dataset
- Haversine radius filtering
- Destination input
- Date input
- Demo flight results through an internal API route
- Provider architecture prepared for real flight APIs

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build for production

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import project in Vercel.
3. Keep default settings (Framework: Next.js).
4. Deploy.

No API keys are required for the current demo mode.

## Flight provider configuration

The app uses an internal API route so provider credentials stay server-side:

```text
Frontend → /api/flights/search → configured provider → normalized FlightResult[]
```

Supported provider modes:

- `FLIGHT_PROVIDER=mock` or unset: uses the mock provider.
- `FLIGHT_PROVIDER=duffel`: uses Duffel when `DUFFEL_ACCESS_TOKEN` exists, with mock fallback when no real results are returned.

For Duffel test mode, add these as Vercel Environment Variables:

- `DUFFEL_ACCESS_TOKEN`
- `FLIGHT_PROVIDER=duffel`

Do not expose Duffel tokens in frontend code and do not commit them to GitHub.

## Future real API integration

The same provider architecture can also support Amadeus later:

```text
Frontend → /api/flights/search → amadeusFlightProvider → Amadeus Flight Offers Search → normalized FlightResult[]
```

When the Amadeus integration is implemented, add these credentials as Vercel Environment Variables, not in frontend code and not in GitHub:

- `AMADEUS_CLIENT_ID`
- `AMADEUS_CLIENT_SECRET`

The planned implementation lives in `lib/flightProviders/amadeusProvider.ts` and should handle OAuth token retrieval, Flight Offers Search requests, and normalization into the shared `FlightResult` type.
