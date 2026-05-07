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

## Future real API integration

The app now uses a flight-provider architecture so the UI can keep calling the internal API route while the backend provider changes later.

Current flow:

```text
Frontend → /api/flights/search → mockFlightProvider → normalized FlightResult[]
```

Future Amadeus flow:

```text
Frontend → /api/flights/search → amadeusFlightProvider → Amadeus Flight Offers Search → normalized FlightResult[]
```

When the real Amadeus integration is implemented, add these credentials as Vercel Environment Variables, not in frontend code and not in GitHub:

- `AMADEUS_CLIENT_ID`
- `AMADEUS_CLIENT_SECRET`

The planned implementation lives in `lib/flightProviders/amadeusProvider.ts` and should handle OAuth token retrieval, Flight Offers Search requests, and normalization into the shared `FlightResult` type.
