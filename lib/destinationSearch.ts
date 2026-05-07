import { AIRPORTS } from "@/data/airports";

export type DestinationOption = {
  label: string;
  aliases: string[];
  code: string;
  type: "city" | "airport";
};

const CITY_DESTINATIONS: DestinationOption[] = [
  { label: "Rome", aliases: ["rome", "roma"], code: "FCO", type: "city" },
  { label: "Milan", aliases: ["milan", "milano"], code: "MXP", type: "city" },
  { label: "Naples", aliases: ["naples", "napoli"], code: "NAP", type: "city" },
  { label: "Venice", aliases: ["venice", "venezia"], code: "VCE", type: "city" },
  { label: "Florence", aliases: ["florence", "firenze"], code: "FLR", type: "city" },
  { label: "Turin", aliases: ["turin", "torino"], code: "TRN", type: "city" },
  { label: "Paris", aliases: ["paris", "parigi"], code: "CDG", type: "city" },
  { label: "London", aliases: ["london", "londra"], code: "LHR", type: "city" },
  { label: "Athens", aliases: ["athens", "atene"], code: "ATH", type: "city" },
  { label: "Santorini", aliases: ["santorini", "thira"], code: "JTR", type: "city" },
  { label: "Mykonos", aliases: ["mykonos", "micorno"], code: "JMK", type: "city" },
  { label: "Barcelona", aliases: ["barcelona", "barcellona"], code: "BCN", type: "city" },
  { label: "Madrid", aliases: ["madrid"], code: "MAD", type: "city" },
  { label: "Amsterdam", aliases: ["amsterdam"], code: "AMS", type: "city" },
  { label: "Berlin", aliases: ["berlin", "berlino"], code: "BER", type: "city" },
];

const AIRPORT_DESTINATIONS: DestinationOption[] = AIRPORTS.map((airport) => ({
  label: `${airport.code} - ${airport.name}`,
  aliases: [airport.code, airport.name, airport.city].map((value) => value.toLowerCase()),
  code: airport.code,
  type: "airport",
}));

export const DESTINATION_OPTIONS: DestinationOption[] = [...CITY_DESTINATIONS, ...AIRPORT_DESTINATIONS];

export function resolveDestinationCode(query: string): string {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return "";

  const exactMatch = DESTINATION_OPTIONS.find((option) => {
    const normalizedLabel = option.label.toLowerCase();
    return normalizedLabel === normalizedQuery || option.aliases.some((alias) => alias === normalizedQuery);
  });

  if (exactMatch) return exactMatch.code;

  return query.trim().toUpperCase();
}
