import { AIRPORTS } from "@/data/airports";

export type DepartureOption = {
  label: string;
  aliases: string[];
  coords: [number, number];
  type: "city" | "airport";
  airportCode?: string;
  airportCodes?: string[];
};

const CITY_OPTIONS: DepartureOption[] = [
  { label: "Rome", aliases: ["rome", "roma"], coords: [41.9028, 12.4964], type: "city", airportCodes: ["FCO", "CIA"] },
  { label: "Milan", aliases: ["milan", "milano"], coords: [45.4642, 9.19], type: "city", airportCodes: ["MXP", "LIN", "BGY"] },
  { label: "Naples", aliases: ["naples", "napoli"], coords: [40.8518, 14.2681], type: "city", airportCodes: ["NAP"] },
  { label: "Venice", aliases: ["venice", "venezia"], coords: [45.4408, 12.3155], type: "city", airportCodes: ["VCE", "TSF"] },
  { label: "Bologna", aliases: ["bologna"], coords: [44.4949, 11.3426], type: "city", airportCodes: ["BLQ"] },
  { label: "Florence", aliases: ["florence", "firenze"], coords: [43.7696, 11.2558], type: "city", airportCodes: ["FLR", "PSA"] },
  { label: "Turin", aliases: ["turin", "torino"], coords: [45.0703, 7.6869], type: "city", airportCodes: ["TRN"] },
  { label: "Bari", aliases: ["bari"], coords: [41.1171, 16.8719], type: "city", airportCodes: ["BRI"] },
  { label: "Palermo", aliases: ["palermo"], coords: [38.1157, 13.3615], type: "city", airportCodes: ["PMO"] },
  { label: "Catania", aliases: ["catania"], coords: [37.5079, 15.083], type: "city", airportCodes: ["CTA"] },
  { label: "Paris", aliases: ["paris", "parigi"], coords: [48.8566, 2.3522], type: "city", airportCodes: ["CDG", "ORY", "BVA"] },
  { label: "London", aliases: ["london", "londra"], coords: [51.5072, -0.1276], type: "city", airportCodes: ["LHR", "LGW", "STN", "LTN", "LCY"] },
  { label: "New York", aliases: ["new york", "nyc"], coords: [40.7128, -74.006], type: "city", airportCodes: ["JFK", "EWR", "LGA"] },
  { label: "Madrid", aliases: ["madrid"], coords: [40.4168, -3.7038], type: "city", airportCodes: ["MAD"] },
  { label: "Barcelona", aliases: ["barcelona", "barcellona"], coords: [41.3874, 2.1686], type: "city", airportCodes: ["BCN"] },
  { label: "Athens", aliases: ["athens", "atene"], coords: [37.9838, 23.7275], type: "city", airportCodes: ["ATH"] },
  { label: "Amsterdam", aliases: ["amsterdam"], coords: [52.3676, 4.9041], type: "city", airportCodes: ["AMS"] },
  { label: "Berlin", aliases: ["berlin", "berlino"], coords: [52.52, 13.405], type: "city", airportCodes: ["BER"] },
  { label: "Santorini", aliases: ["santorini", "thira"], coords: [36.3932, 25.4615], type: "city", airportCodes: ["JTR"] },
];

const AIRPORT_OPTIONS: DepartureOption[] = AIRPORTS.map((airport) => ({
  label: `${airport.code} - ${airport.name}`,
  aliases: [airport.code, airport.name, airport.city].map((value) => value.toLowerCase()),
  coords: [airport.lat, airport.lng],
  type: "airport",
  airportCode: airport.code,
  airportCodes: [airport.code],
}));

export const DEPARTURE_OPTIONS: DepartureOption[] = [...CITY_OPTIONS, ...AIRPORT_OPTIONS];

export function findDepartureLocation(query: string): DepartureOption | undefined {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return undefined;

  return DEPARTURE_OPTIONS.find((option) => {
    const normalizedLabel = option.label.toLowerCase();
    return normalizedLabel === normalizedQuery || option.aliases.some((alias) => alias === normalizedQuery);
  });
}

export function resolveDepartureCodes(query: string): string[] {
  const match = findDepartureLocation(query);
  if (match?.airportCodes?.length) return match.airportCodes;
  if (match?.airportCode) return [match.airportCode];

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const cityMatches = AIRPORTS.filter((airport) => airport.city.toLowerCase() === normalizedQuery).map((airport) => airport.code);
  if (cityMatches.length > 0) return Array.from(new Set(cityMatches));

  const customCode = query.trim().toUpperCase();
  return customCode ? [customCode] : [];
}
