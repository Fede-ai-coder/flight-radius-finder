export type DestinationResolution = {
  codes: string[];
  label: string;
  description: string;
};

const CITY_TO_CODES: Record<string, { label: string; codes: string[] }> = {
  rome: { label: "Rome", codes: ["FCO", "CIA"] },
  roma: { label: "Rome", codes: ["FCO", "CIA"] },
  milan: { label: "Milan", codes: ["MXP", "LIN", "BGY"] },
  milano: { label: "Milan", codes: ["MXP", "LIN", "BGY"] },
  paris: { label: "Paris", codes: ["CDG", "ORY", "BVA"] },
  parigi: { label: "Paris", codes: ["CDG", "ORY", "BVA"] },
  london: { label: "London", codes: ["LHR", "LGW", "STN", "LTN", "LCY"] },
  londra: { label: "London", codes: ["LHR", "LGW", "STN", "LTN", "LCY"] },
};

export function resolveDestination(destination: string): DestinationResolution {
  const normalized = destination.trim().toLowerCase();
  if (!normalized) {
    return { codes: [], label: "", description: "Enter a destination city or IATA code." };
  }

  if (CITY_TO_CODES[normalized]) {
    const city = CITY_TO_CODES[normalized];
    return {
      codes: city.codes,
      label: city.label,
      description: `City destination: ${city.label} airports — ${city.codes.join(" / ")}`,
    };
  }

  const code = normalized.toUpperCase();
  if (/^[A-Z]{3}$/.test(code)) {
    return { codes: [code], label: code, description: `Exact airport: ${code}` };
  }

  return { codes: [code], label: code, description: `Custom code: ${code}` };
}

export function resolveDestinationCode(destination: string): string {
  return resolveDestination(destination).codes[0] ?? "";
}
