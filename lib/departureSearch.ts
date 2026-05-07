import { AIRPORTS } from "@/data/airports";

const CITY_ALIASES: Record<string, string> = {
  roma: "rome",
  rome: "rome",
  milano: "milan",
  milan: "milan",
  napoli: "naples",
  naples: "naples",
  venezia: "venice",
  venice: "venice",
  firenze: "florence",
  florence: "florence",
  torino: "turin",
  turin: "turin",
};

const CITY_CENTERS: Record<string, [number, number]> = {
  rome: [41.9028, 12.4964],
  milan: [45.4642, 9.19],
  naples: [40.8518, 14.2681],
  venice: [45.4408, 12.3155],
  bologna: [44.4949, 11.3426],
  florence: [43.7696, 11.2558],
  turin: [45.0703, 7.6869],
  bari: [41.1171, 16.8719],
  palermo: [38.1157, 13.3615],
  catania: [37.5079, 15.083],
  paris: [48.8566, 2.3522],
  london: [51.5072, -0.1276],
  "new york": [40.7128, -74.006],
};

export const DEPARTURE_SUGGESTIONS = [
  ...Object.keys(CITY_ALIASES),
  ...Object.keys(CITY_CENTERS),
  ...AIRPORTS.map((airport) => airport.code.toLowerCase()),
  ...AIRPORTS.map((airport) => airport.name.toLowerCase()),
];

export function findDepartureCenter(query: string): [number, number] | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const aliasedCity = CITY_ALIASES[normalized] ?? normalized;
  if (CITY_CENTERS[aliasedCity]) return CITY_CENTERS[aliasedCity];

  const byCode = AIRPORTS.find((airport) => airport.code.toLowerCase() === normalized);
  if (byCode) return [byCode.lat, byCode.lng];

  const byAirportName = AIRPORTS.find((airport) => airport.name.toLowerCase().includes(normalized));
  if (byAirportName) return [byAirportName.lat, byAirportName.lng];

  const byCity = AIRPORTS.find((airport) => airport.city.toLowerCase().includes(normalized));
  if (byCity) return [byCity.lat, byCity.lng];

  return null;
}
