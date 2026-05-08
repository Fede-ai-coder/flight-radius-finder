import { AIRPORTS } from "@/data/airports";

export type DestinationOption = {
  label: string;
  aliases: string[];
  codes: string[];
  type: "city" | "airport";
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
];

const AIRPORT_DESTINATIONS: DestinationOption[] = AIRPORTS.map((airport) => ({
  label: `${airport.code} - ${airport.name}`,
  aliases: [airport.code, airport.name, airport.city].map((value) => value.toLowerCase()),
  codes: [airport.code],
  type: "airport",
}));

export const DESTINATION_OPTIONS: DestinationOption[] = [...CITY_DESTINATIONS, ...AIRPORT_DESTINATIONS];

function findDestinationOption(query: string): DestinationOption | undefined {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return undefined;

  return DESTINATION_OPTIONS.find((option) => {
    const normalizedLabel = option.label.toLowerCase();
    return normalizedLabel === normalizedQuery || option.aliases.some((alias) => alias === normalizedQuery);
  });
}

export function resolveDestinationCodes(query: string): string[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const exactMatch = findDestinationOption(query);
  if (exactMatch) return exactMatch.codes;

  return [normalizedQuery.toUpperCase()];
}

export function resolveDestinationCode(query: string): string {
  return resolveDestinationCodes(query)[0] ?? "";
}
