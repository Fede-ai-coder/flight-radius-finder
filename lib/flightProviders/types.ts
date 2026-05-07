export type FlightSearchRequest = {
  origin: string;
  destination: string;
  date: string;
  adults: number;
  maxResults: number;
  nonStop?: boolean;
};

export type FlightResult = {
  id: string;
  fromCode: string;
  fromCity: string;
  to: string;
  date: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  bookingUrl?: string;
  source: string;
};

export type FlightProvider = {
  searchFlights(request: FlightSearchRequest): Promise<FlightResult[]>;
};
