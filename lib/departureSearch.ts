import { AIRPORTS } from "@/data/airports";

export type DepartureOption = {
  label: string;
  aliases: string[];
  coords: [number, number];
  type: "city" | "airport";
  airportCode?: string;
};

const CITY_OPTIONS: DepartureOption[] = [
  { label: "Rome", aliases: ["rome", "roma"], coords: [41.9028, 12.4964], type: "city" },
  { label: "Milan", aliases: ["milan", "milano"], coords: [45.4642, 9.19], type: "city" },
  { label: "Naples", aliases: ["naples", "napoli"], coords: [40.8518, 14.2681], type: "city" },
  { label: "Venice", aliases: ["venice", "venezia"], coords: [45.4408, 12.3155], type: "city" },
  { label: "Bologna", aliases: ["bologna"], coords: [44.4949, 11.3426], type: "city" },
  { label: "Florence", aliases: ["florence", "firenze"], coords: [43.7696, 11.2558], type: "city" },
  { label: "Turin", aliases: ["turin", "torino"], coords: [45.0703, 7.6869], type: "city" },
  { label: "Bari", aliases: ["bari"], coords: [41.1171, 16.8719], type: "city" },
  { label: "Palermo", aliases: ["palermo"], coords: [38.1157, 13.3615], type: "city" },
  { label: "Catania", aliases: ["catania"], coords: [37.5079, 15.083], type: "city" },
  { label: "Paris", aliases: ["paris", "parigi"], coords: [48.8566, 2.3522], type: "city" },
  { label: "London", aliases: ["london", "londra"], coords: [51.5072, -0.1276], type: "city" },
  { label: "New York", aliases: ["new york", "nyc"], coords: [40.7128, -74.006], type: "city" },
  { label: "Madrid", aliases: ["madrid"], coords: [40.4168, -3.7038], type: "city" },
  { label: "Barcelona", aliases: ["barcelona", "barcellona"], coords: [41.3874, 2.1686], type: "city" },
  { label: "Athens", aliases: ["athens", "atene"], coords: [37.9838, 23.7275], type: "city" },
  { label: "Amsterdam", aliases: ["amsterdam"], coords: [52.3676, 4.9041], type: "city" },
  { label: "Berlin", aliases: ["berlin", "berlino"], coords: [52.52, 13.405], type: "city" },
  { label: "Santorini", aliases: ["santorini", "thira"], coords: [36.3932, 25.4615], type: "city" },
];

const AIRPORT_OPTIONS: DepartureOption[] = AIRPORTS.map((airport) => ({
  label: `${airport.code} - ${airport.name}`,
  aliases: [airport.code, airport.name, airport.city].map((value) => value.toLowerCase()),
  coords: [airport.lat, airport.lng],
  type: "airport",
  airportCode: airport.code,
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
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const exactAirportCodeMatch = AIRPORTS.find((airport) => airport.code.toLowerCase() === normalizedQuery);
  if (exactAirportCodeMatch) return [exactAirportCodeMatch.code];

  const codes = AIRPORTS.filter((airport) => {
    const city = airport.city.toLowerCase();
    const name = airport.name.toLowerCase();
    return city.includes(normalizedQuery) || name.includes(normalizedQuery);
  }).map((airport) => airport.code);

  return Array.from(new Set(codes));
}
