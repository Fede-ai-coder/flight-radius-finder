export type Airport = {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
};

export const AIRPORTS: Airport[] = [
  { code: "JFK", name: "John F. Kennedy International", city: "New York", lat: 40.6413, lng: -73.7781 },
  { code: "EWR", name: "Newark Liberty International", city: "Newark", lat: 40.6895, lng: -74.1745 },
  { code: "LGA", name: "LaGuardia", city: "New York", lat: 40.7769, lng: -73.874 },
  { code: "BOS", name: "Logan International", city: "Boston", lat: 42.3656, lng: -71.0096 },
  { code: "PHL", name: "Philadelphia International", city: "Philadelphia", lat: 39.8744, lng: -75.2424 },
  { code: "DCA", name: "Ronald Reagan Washington National", city: "Washington", lat: 38.8512, lng: -77.0402 },
  { code: "IAD", name: "Washington Dulles International", city: "Washington", lat: 38.9531, lng: -77.4565 },
  { code: "BWI", name: "Baltimore/Washington International", city: "Baltimore", lat: 39.1754, lng: -76.6684 },
  { code: "ORD", name: "O'Hare International", city: "Chicago", lat: 41.9742, lng: -87.9073 },
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International", city: "Atlanta", lat: 33.6407, lng: -84.4277 }
];
