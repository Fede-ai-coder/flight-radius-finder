import type { FlightProvider, FlightResult, FlightSearchRequest } from "./types";

/**
 * Placeholder for future Amadeus Flight Offers Search integration.
 *
 * Required server-side environment variables in Vercel:
 * - AMADEUS_CLIENT_ID
 * - AMADEUS_CLIENT_SECRET
 *
 * Implementation outline:
 * 1. Request an OAuth access token from Amadeus using client credentials.
 * 2. Call Flight Offers Search with:
 *    - originLocationCode
 *    - destinationLocationCode
 *    - departureDate
 *    - adults
 *    - nonStop
 *    - max
 * 3. Normalize the Amadeus response into FlightResult[]:
 *    - airline/carrier code
 *    - departure and arrival timestamps
 *    - duration
 *    - stops
 *    - total price and currency
 *    - optional booking/deep link if available from a future partner flow
 *
 * Important:
 * - Never expose AMADEUS_CLIENT_ID or AMADEUS_CLIENT_SECRET to the frontend.
 * - Keep all Amadeus calls inside server-side API routes or backend code.
 */
export const amadeusFlightProvider: FlightProvider = {
  async searchFlights(_request: FlightSearchRequest): Promise<FlightResult[]> {
    throw new Error("Amadeus provider is not implemented yet. Use mockFlightProvider for now.");
  },
};
