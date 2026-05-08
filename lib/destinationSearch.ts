import { AIRPORTS } from "@/data/airports";
import { distanceKm } from "@/lib/geo";

export type DestinationOption = {
  label: string;
  aliases: string[];
  codes: string[];
  type: "city" | "airport";
};

export type DestinationResolution = {
  codes: string[];
  label: string;
  mode: "city" | "airport" | "custom" | "multiple" | "area";
  description: string;
};

const CITY_DESTINATIONS: DestinationOption[] = [
  { label: "Rome", aliases: ["rome", "roma"], codes: ["FCO", "CIA"], type: "city" },
  { label: "Milan", aliases: ["milan", "milano"], codes: ["MXP", "LIN", "BGY"], type: "city" },
  { label: "Naples", aliases: ["naples", "napoli"], codes: ["NAP"], type: "city" },
  { label: "Venice", aliases: ["venice", "venezia"], codes: ["VCE", "TSF"], type: "city" },
  { label: "Florence", aliases: ["florence", "firenze"], codes: ["FLR", "PSA"], type: "city" },
  { label: "Turin", aliases: ["turin", "torino"], codes: ["TRN"], type: "city" },
  { label: "Paris", aliases: ["paris", "parigi"], codes: ["CDG", "ORY", "BVA"], type: "city" },
  { label: "London", aliases: ["london", "londra"], codes: ["LHR", "LGW", "STN", "LTN", "LCY"], type: "city" },
  { label: "Athens", aliases: ["athens", "atene"], codes: ["ATH"], type: "city" },
  { label: "Santorini", aliases: ["santorini", "thira"], codes: ["JTR"], type: "city" },
  { label: "Mykonos", aliases: ["mykonos", "micorno"], codes: ["JMK"], type: "city" },
  { label: "Barcelona", aliases: ["barcelona", "barcellona"], codes: ["BCN"], type: "city" },
  { label: "Madrid", aliases: ["madrid"], codes: ["MAD"], type: "city" },
  { label: "Amsterdam", aliases: ["amsterdam"], codes: ["AMS"], type: "city" },
  { label: "Berlin", aliases: ["berlin", "berlino"], codes: ["BER"], type: "city" },
  { label: "New York", aliases: ["new york", "nyc"], codes: ["JFK", "EWR", "LGA"], type: "city" },
  { label: "Los Angeles", aliases: ["los angeles", "la"], codes: ["LAX"], type: "city" },
];

const AIRPORT_DESTINATIONS: DestinationOption[] = AIRPORTS.map((airport) => ({
  label: `${airport.code} - ${airport.name}`,
  aliases: [airport.code, airport.name, airport.city].map((value) => value.toLowerCase()),
  codes: [airport.code],
  type: "airport",
}));

export const DESTINATION_OPTIONS: DestinationOption[] = [...CITY_DESTINATIONS, ...AIRPORT_DESTINATIONS];

function uniqueCodes(codes: string[]): string[] {
  return Array.from(new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean)));
}

export function parseDestinationQueries(query: string): string[] {
  return query
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function findDestinationOption(query: string): DestinationOption | undefined {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return undefined;

  return DESTINATION_OPTIONS.find((option) => {
    const normalizedLabel = option.label.toLowerCase();
    return normalizedLabel === normalizedQuery || option.aliases.some((alias) => alias === normalizedQuery);
  });
}

function resolveSingleDestination(query: string): DestinationResolution {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return { codes: [], label: "", mode: "custom", description: "Enter a destination city or airport" };
  }

  const exactMatch = findDestinationOption(query);
  if (exactMatch) {
    const codeLabel = exactMatch.codes.join(" / ");
    return {
      codes: exactMatch.codes,
      label: codeLabel,
      mode: exactMatch.type,
      description: exactMatch.type === "city"
        ? `City destination: ${exactMatch.label} airports — ${codeLabel}`
        : `Exact airport: ${exactMatch.codes[0]}`,
    };
  }

  const customCode = normalizedQuery.toUpperCase();
  return {
    codes: [customCode],
    label: customCode,
    mode: "custom",
    description: `Custom code: ${customCode}`,
  };
}

function expandCodesByArrivalRadius(codes: string[], arrivalRadiusKm: number): string[] {
  const baseCodes = uniqueCodes(codes);
  if (arrivalRadiusKm <= 0) return baseCodes;

  const baseAirports = baseCodes
    .map((code) => AIRPORTS.find((airport) => airport.code === code))
    .filter(Boolean);

  if (baseAirports.length === 0) return baseCodes;

  const nearbyCodes = AIRPORTS.filter((airport) =>
    baseAirports.some((baseAirport) =>
      baseAirport && distanceKm(baseAirport.lat, baseAirport.lng, airport.lat, airport.lng) <= arrivalRadiusKm,
    ),
  ).map((airport) => airport.code);

  return uniqueCodes([...baseCodes, ...nearbyCodes]);
}

export function resolveDestination(query: string, arrivalRadiusKm = 0): DestinationResolution {
  const queries = parseDestinationQueries(query);
  if (queries.length === 0) {
    return { codes: [], label: "", mode: "custom", description: "Enter one or more destination cities or airports" };
  }

  const resolutions = queries.map(resolveSingleDestination);
  const baseCodes = uniqueCodes(resolutions.flatMap((resolution) => resolution.codes));
  const codes = expandCodesByArrivalRadius(baseCodes, arrivalRadiusKm);
  const label = codes.join(" / ");
  const multipleDestinations = queries.length > 1;

  if (multipleDestinations || arrivalRadiusKm > 0) {
    const destinationList = queries.join(", ");
    const parts = [
      multipleDestinations ? `Multiple destinations: ${destinationList}` : resolutions[0]?.description,
      arrivalRadiusKm > 0 ? `arrival area within ${arrivalRadiusKm} km` : null,
      label ? `searching ${label}` : null,
    ].filter(Boolean);

    return {
      codes,
      label,
      mode: arrivalRadiusKm > 0 ? "area" : "multiple",
      description: parts.join(" · "),
    };
  }

  return resolutions[0];
}

export function resolveDestinationCodes(query: string, arrivalRadiusKm = 0): string[] {
  return resolveDestination(query, arrivalRadiusKm).codes;
}

export function resolveDestinationCode(query: string): string {
  return resolveDestinationCodes(query)[0] ?? "";
}
