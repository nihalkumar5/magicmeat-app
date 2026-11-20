export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DarkStoreHub {
  id: string;
  name: string;
  city: string;
  coords: Coordinates;
  maxExpressRadiusKm: number;
  maxStandardRadiusKm: number;
  address?: string;
  landmark?: string;
  timings?: string;
  phone?: string;
  distanceKm?: number;
}

export interface LocationData {
  shortAddress: string;
  fullAddress: string;
  city: string;
  state: string;
  postalCode?: string;
  coords: Coordinates;
  /** GPS uncertainty radius in metres, for detected locations. */
  accuracyM?: number;
  isServiceable: boolean;
  nearestHubName: string;
  distanceKm: number;
  deliveryEta: string;
  tag?: 'Home' | 'Work' | 'Other' | 'Current';
}

// MagicMeat delivers in Hazaribagh (Jharkhand) only, from one kitchen in
// the city. Delivery reaches the whole town; outside it the app says
// "not delivering here yet".
export const SERVICE_CITY = 'Hazaribagh';
export const SERVICE_STATE = 'Jharkhand';
export const SERVICE_PIN = '825301';

export const MAGICMEAT_HUBS: DarkStoreHub[] = [
  {
    id: 'hazaribagh',
    name: 'MagicMeat Hazaribagh',
    city: SERVICE_CITY,
    // City centre (Jhanda Chowk).
    coords: { latitude: 23.994, longitude: 85.361 },
    maxExpressRadiusKm: 7,
    maxStandardRadiusKm: 15,
    timings: '7:00 AM - 10:00 PM Daily',
  },
];
