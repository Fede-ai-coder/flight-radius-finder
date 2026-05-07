export type Airport = {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
};

export const AIRPORTS: Airport[] = [
  // Italy
  { code: "FCO", name: "Rome Fiumicino", city: "Rome", lat: 41.8003, lng: 12.2389 },
  { code: "CIA", name: "Rome Ciampino", city: "Rome", lat: 41.7994, lng: 12.5949 },
  { code: "MXP", name: "Milan Malpensa", city: "Milan", lat: 45.6306, lng: 8.7281 },
  { code: "LIN", name: "Milan Linate", city: "Milan", lat: 45.4451, lng: 9.2767 },
  { code: "BGY", name: "Milan Bergamo", city: "Bergamo", lat: 45.6689, lng: 9.7003 },
  { code: "NAP", name: "Naples International", city: "Naples", lat: 40.8845, lng: 14.2908 },
  { code: "VCE", name: "Venice Marco Polo", city: "Venice", lat: 45.5053, lng: 12.3519 },
  { code: "TSF", name: "Treviso", city: "Treviso", lat: 45.6484, lng: 12.1944 },
  { code: "BLQ", name: "Bologna Guglielmo Marconi", city: "Bologna", lat: 44.5354, lng: 11.2887 },
  { code: "FLR", name: "Florence Peretola", city: "Florence", lat: 43.81, lng: 11.2051 },
  { code: "PSA", name: "Pisa Galileo Galilei", city: "Pisa", lat: 43.6839, lng: 10.3927 },
  { code: "TRN", name: "Turin Caselle", city: "Turin", lat: 45.2008, lng: 7.6496 },
  { code: "GOA", name: "Genoa Cristoforo Colombo", city: "Genoa", lat: 44.4133, lng: 8.8375 },
  { code: "VRN", name: "Verona Villafranca", city: "Verona", lat: 45.3957, lng: 10.8885 },
  { code: "TRS", name: "Trieste Friuli Venezia Giulia", city: "Trieste", lat: 45.8275, lng: 13.4722 },
  { code: "BRI", name: "Bari Karol Wojtyla", city: "Bari", lat: 41.1389, lng: 16.7606 },
  { code: "BDS", name: "Brindisi Salento", city: "Brindisi", lat: 40.6576, lng: 17.947 },
  { code: "PMO", name: "Palermo Falcone Borsellino", city: "Palermo", lat: 38.175999, lng: 13.091 },
  { code: "CTA", name: "Catania Fontanarossa", city: "Catania", lat: 37.4668, lng: 15.0664 },
  { code: "SUF", name: "Lamezia Terme", city: "Lamezia Terme", lat: 38.9054, lng: 16.2423 },
  { code: "CAG", name: "Cagliari Elmas", city: "Cagliari", lat: 39.2515, lng: 9.0543 },
  { code: "OLB", name: "Olbia Costa Smeralda", city: "Olbia", lat: 40.8987, lng: 9.5176 },
  { code: "AHO", name: "Alghero Fertilia", city: "Alghero", lat: 40.6321, lng: 8.2908 },
  { code: "AOI", name: "Ancona Falconara", city: "Ancona", lat: 43.6163, lng: 13.3623 },
  { code: "PEG", name: "Perugia San Francesco d'Assisi", city: "Perugia", lat: 43.0959, lng: 12.5132 },

  // Europe and nearby major airports
  { code: "CDG", name: "Paris Charles de Gaulle", city: "Paris", lat: 49.0097, lng: 2.5479 },
  { code: "ORY", name: "Paris Orly", city: "Paris", lat: 48.7233, lng: 2.3794 },
  { code: "BVA", name: "Paris Beauvais", city: "Paris", lat: 49.4544, lng: 2.1128 },
  { code: "LHR", name: "London Heathrow", city: "London", lat: 51.47, lng: -0.4543 },
  { code: "LGW", name: "London Gatwick", city: "London", lat: 51.1537, lng: -0.1821 },
  { code: "STN", name: "London Stansted", city: "London", lat: 51.885, lng: 0.235 },
  { code: "LTN", name: "London Luton", city: "London", lat: 51.8747, lng: -0.3683 },
  { code: "LCY", name: "London City", city: "London", lat: 51.5053, lng: 0.0553 },
  { code: "MAD", name: "Madrid Barajas", city: "Madrid", lat: 40.4983, lng: -3.5676 },
  { code: "BCN", name: "Barcelona El Prat", city: "Barcelona", lat: 41.2974, lng: 2.0833 },
  { code: "ATH", name: "Athens International", city: "Athens", lat: 37.9364, lng: 23.9445 },
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", lat: 52.3105, lng: 4.7683 },
  { code: "BER", name: "Berlin Brandenburg", city: "Berlin", lat: 52.3667, lng: 13.5033 },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", lat: 50.0379, lng: 8.5622 },
  { code: "MUC", name: "Munich Airport", city: "Munich", lat: 48.3538, lng: 11.7861 },
  { code: "VIE", name: "Vienna International", city: "Vienna", lat: 48.1103, lng: 16.5697 },
  { code: "PRG", name: "Prague Vaclav Havel", city: "Prague", lat: 50.1008, lng: 14.26 },
  { code: "BUD", name: "Budapest Ferenc Liszt", city: "Budapest", lat: 47.4298, lng: 19.2611 },
  { code: "LIS", name: "Lisbon Humberto Delgado", city: "Lisbon", lat: 38.7742, lng: -9.1342 },
  { code: "OPO", name: "Porto Francisco Sa Carneiro", city: "Porto", lat: 41.2421, lng: -8.6781 },
  { code: "BRU", name: "Brussels Airport", city: "Brussels", lat: 50.9014, lng: 4.4844 },
  { code: "ZRH", name: "Zurich Airport", city: "Zurich", lat: 47.4581, lng: 8.5555 },
  { code: "GVA", name: "Geneva Airport", city: "Geneva", lat: 46.2381, lng: 6.1089 },
  { code: "CPH", name: "Copenhagen Airport", city: "Copenhagen", lat: 55.618, lng: 12.6561 },
  { code: "ARN", name: "Stockholm Arlanda", city: "Stockholm", lat: 59.6519, lng: 17.9186 },
  { code: "OSL", name: "Oslo Gardermoen", city: "Oslo", lat: 60.1939, lng: 11.1004 },
  { code: "DUB", name: "Dublin Airport", city: "Dublin", lat: 53.4213, lng: -6.2701 },
  { code: "IST", name: "Istanbul Airport", city: "Istanbul", lat: 41.2753, lng: 28.7519 },
  { code: "SAW", name: "Istanbul Sabiha Gokcen", city: "Istanbul", lat: 40.8986, lng: 29.3092 },
  { code: "SKG", name: "Thessaloniki Airport", city: "Thessaloniki", lat: 40.5197, lng: 22.9709 },
  { code: "JMK", name: "Mykonos Airport", city: "Mykonos", lat: 37.4351, lng: 25.3481 },
  { code: "JTR", name: "Santorini Airport", city: "Santorini", lat: 36.3992, lng: 25.4793 },
  { code: "HER", name: "Heraklion Airport", city: "Heraklion", lat: 35.3397, lng: 25.1803 },
  { code: "CHQ", name: "Chania Airport", city: "Chania", lat: 35.5317, lng: 24.1497 },

  // United States sample airports kept for existing demo coverage
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
