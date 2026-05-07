import type { FlightProvider, FlightResult, FlightSearchRequest } from "./types";

const DUFFEL_API_BASE_URL = "https://api.duffel.com/air";
const DUFFEL_VERSION = "v2";

type DuffelOfferResponse = {
  data?: {
    offers?: DuffelOffer[];
  };
};

type DuffelOffer = {
  id?: string;
  total_amount?: string;
  total_currency?: string;
  owner?: {
    name?: string;
    iata_code?: string;
  };
  slices?: Array<{
    duration?: string;
    segments?: Array<{
      departing_at?: string;
      arriving_at?: string;
      duration?: string;
      operating_carrier?: {
        name?: string;
        iata_code?: string;
      };
      marketing_carrier?: {
        name?: string;
        iata_code?: string;
      };
      origin?: {
        iata_code?: string;
        city_name?: string;
      };
      destination?: {
        iata_code?: string;
      };
    }>;
  }>;
};

function formatTime(value?: string) {
  if (!value) return "";
  const timePart = value.split("T")[1];
  if (!timePart) return value;
  return timePart.slice(0, 5);
}

function normalizeDuration(value?: string) {
  if (!value) return "";
  return value.replace("PT", "").toLowerCase();
}

function normalizeOffer(offer: DuffelOffer, request: FlightSearchRequest): FlightResult | null {
  const firstSlice = offer.slices?.[0];
  const segments = firstSlice?.segments ?? [];
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  const amount = Number(offer.total_amount);

  if (!offer.id || !firstSegment || !lastSegment || Number.isNaN(amount)) return null;

  const airline =
    firstSegment.operating_carrier?.name ||
    firstSegment.marketing_carrier?.name ||
    offer.owner?.name ||
    firstSegment.operating_carrier?.iata_code ||
    firstSegment.marketing_carrier?.iata_code ||
    offer.owner?.iata_code ||
    "Unknown airline";

  return {
    id: offer.id,
    fromCode: firstSegment.origin?.iata_code || request.origin,
    fromCity: firstSegment.origin?.city_name || request.origin,
    to: lastSegment.destination?.iata_code || request.destination,
    date: request.date,
    airline,
    departureTime: formatTime(firstSegment.departing_at),
    arrivalTime: formatTime(lastSegment.arriving_at),
    duration: normalizeDuration(firstSlice?.duration || firstSegment.duration),
    stops: Math.max(0, segments.length - 1),
    price: amount,
    currency: offer.total_currency || "EUR",
    source: "duffel",
  };
}

export const duffelFlightProvider: FlightProvider = {
  async searchFlights(request: FlightSearchRequest): Promise<FlightResult[]> {
    const accessToken = process.env.DUFFEL_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error("DUFFEL_ACCESS_TOKEN is not configured");
    }

    const response = await fetch(`${DUFFEL_API_BASE_URL}/offer_requests?return_offers=true`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Duffel-Version": DUFFEL_VERSION,
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        data: {
          slices: [
            {
              origin: request.origin,
              destination: request.destination,
              departure_date: request.date,
            },
          ],
          passengers: Array.from({ length: request.adults }, () => ({ type: "adult" })),
          cabin_class: "economy",
          max_connections: request.nonStop ? 0 : 1,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Duffel search failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as DuffelOfferResponse;
    const offers = data.data?.offers ?? [];

    return offers
      .map((offer) => normalizeOffer(offer, request))
      .filter((offer): offer is FlightResult => offer !== null)
      .sort((a, b) => a.price - b.price)
      .slice(0, request.maxResults);
  },
};
