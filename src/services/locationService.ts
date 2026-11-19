import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { Coordinates, LocationData, MAGICMEAT_HUBS } from '../types/location';

// Haversine Formula for exact distance calculation in KM
export function calculateDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.latitude * Math.PI) / 180) *
      Math.cos((c2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Find nearest butcher dark store hub and verify cold-chain serviceability
export function evaluateHubServiceability(coords: Coordinates) {
  let nearest = MAGICMEAT_HUBS[0];
  let minDistance = calculateDistanceKm(coords, nearest.coords);

  for (const hub of MAGICMEAT_HUBS) {
    const dist = calculateDistanceKm(coords, hub.coords);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = hub;
    }
  }

  const isExpress = minDistance <= nearest.maxExpressRadiusKm;
  const isStandard = minDistance <= nearest.maxStandardRadiusKm;

  return {
    nearestHubName: nearest.name,
    distanceKm: minDistance,
    isServiceable: true,
    deliveryEta: isExpress
      ? '15–20 mins'
      : isStandard
        ? '30-45 Mins (Standard Slot)'
        : '45-60 Mins (Special Cold Delivery)',
  };
}

// Clean administrative suffixes like "Tahsil", "Tehsil", "District"
function cleanLocationName(name: string): string {
  if (!name) return '';
  return name.replace(/\s+(Tahsil|Tehsil|district|District|Division)\b/gi, '').trim();
}

/** A location problem the customer can act on; the message says what to do. */
export class LocationError extends Error {}

const GOOD_ACCURACY_M = 25; // stop as soon as a fix is this good
const MAX_WAIT_MS = 12000; // otherwise keep the best fix seen in this time
const LAST_KNOWN_MAX_AGE_MS = 2 * 60 * 1000;

type Fix = { coords: Coordinates; accuracyM: number };

// Precise device position. Watches GPS for a few seconds and keeps the most
// accurate reading, instead of trusting the first (often Wi-Fi / cell-tower)
// fix. Never guesses from the IP address or a default city: if there is no
// real fix it throws a LocationError that tells the customer what to do.
async function getPreciseFix(): Promise<Fix> {
  return Platform.OS === 'web' ? getWebFix() : getNativeFix();
}

function getWebFix(): Promise<Fix> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(
      new LocationError("This browser can't share your location. Please search for your address instead."),
    );
  }
  return new Promise<Fix>((resolve, reject) => {
    let best: Fix | null = null;
    let done = false;
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) resolve(best);
      else
        reject(
          err ||
            new LocationError(
              "We couldn't get a GPS fix. Move near a window or outdoors and try again, or search for your address.",
            ),
        );
    };
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const accuracyM = pos.coords.accuracy ?? 9999;
        if (!best || accuracyM < best.accuracyM) {
          best = { coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude }, accuracyM };
        }
        if (accuracyM <= GOOD_ACCURACY_M) finish();
      },
      (err) => {
        if (err.code === 1) {
          finish(
            new LocationError(
              'Location is blocked for this site. Allow location in your browser settings, or search for your address.',
            ),
          );
        }
        // Other errors (timeout, position unavailable): keep waiting for the timer.
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: MAX_WAIT_MS },
    );
    const timer = setTimeout(() => finish(), MAX_WAIT_MS);
  });
}

async function getNativeFix(): Promise<Fix> {
  // Location services (GPS) switched off for the whole phone.
  if (!(await Location.hasServicesEnabledAsync())) {
    if (Platform.OS === 'android') {
      // Shows the system "Turn on location / improve accuracy" dialog.
      await Location.enableNetworkProviderAsync().catch(() => {
        throw new LocationError('Please turn on Location (GPS) on your phone, then try again.');
      });
    } else {
      throw new LocationError('Please turn on Location Services in Settings → Privacy & Security, then try again.');
    }
  }

  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new LocationError(
      'MagicMeat needs location access to find your address. Allow it in Settings, or search for your address.',
    );
  }
  // "Approximate location" is only accurate to a few kilometres.
  const iosAccuracy = (perm as any).ios?.accuracy;
  const androidAccuracy = (perm as any).android?.accuracy;
  if (iosAccuracy === 'reduced' || androidAccuracy === 'coarse') {
    throw new LocationError(
      Platform.OS === 'ios'
        ? 'Precise Location is off for MagicMeat. Turn it on in Settings → MagicMeat → Location → Precise Location.'
        : 'MagicMeat has only approximate location. In Settings → Apps → MagicMeat → Location, turn on "Use precise location".',
    );
  }
  if (Platform.OS === 'android') {
    // Ask for Google's high-accuracy mode (GPS + Wi-Fi + cell); ignore "no".
    await Location.enableNetworkProviderAsync().catch(() => {});
  }

  let best: Fix | null = null;
  await new Promise<void>((resolve) => {
    let sub: Location.LocationSubscription | null = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      sub?.remove();
      resolve();
    };
    const timer = setTimeout(finish, MAX_WAIT_MS);
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      (pos) => {
        const accuracyM = pos.coords.accuracy ?? 9999;
        if (!best || accuracyM < best.accuracyM) {
          best = { coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude }, accuracyM };
        }
        if (accuracyM <= GOOD_ACCURACY_M) finish();
      },
    )
      .then((s) => {
        sub = s;
        if (done) s.remove();
      })
      .catch(finish);
  });
  if (best) return best;

  // No live fix in time: accept a very recent, reasonably accurate one.
  const last = await Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
    requiredAccuracy: 100,
  }).catch(() => null);
  if (last) {
    return {
      coords: { latitude: last.coords.latitude, longitude: last.coords.longitude },
      accuracyM: last.coords.accuracy ?? 100,
    };
  }
  throw new LocationError(
    "We couldn't get a GPS fix. Move near a window or outdoors and try again, or search for your address.",
  );
}

const join = (parts: (string | null | undefined)[]) =>
  parts
    .map((p) => (p || '').trim())
    .filter((p, i, arr) => p && arr.findIndex((q) => (q || '').trim().toLowerCase() === p.toLowerCase()) === i)
    .join(', ');

type Address = { line: string; locality: string; city: string; state: string; postalCode: string };

// Street-level address for a point. Native uses the phone's geocoder (Apple /
// Google); web uses OpenStreetMap at building zoom. BigDataCloud is only a
// last resort for the city name.
async function reverseGeocode(coords: Coordinates): Promise<Address> {
  const out: Address = { line: '', locality: '', city: '', state: '', postalCode: '' };

  if (Platform.OS !== 'web') {
    try {
      const [g] = await Location.reverseGeocodeAsync(coords);
      if (g) {
        const street = join([g.streetNumber, g.street]);
        out.line = join([g.name !== g.street ? g.name : '', street]);
        out.locality = cleanLocationName(g.district || g.subregion || '');
        out.city = cleanLocationName(g.city || g.subregion || '');
        out.state = g.region || '';
        out.postalCode = g.postalCode || '';
      }
    } catch (err) {
      console.warn('[location] native reverse geocode failed', err);
    }
  } else {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat=${coords.latitude}&lon=${coords.longitude}`,
      );
      const data = await res.json();
      const a = data?.address || {};
      out.line = join([
        join([a.house_number, a.road].filter(Boolean) as string[]).replace(', ', ' '),
        a.building,
        a.amenity,
      ]);
      out.locality = cleanLocationName(a.neighbourhood || a.suburb || a.quarter || a.residential || a.hamlet || '');
      out.city = cleanLocationName(a.city || a.town || a.village || a.municipality || a.county || '');
      out.state = a.state || '';
      out.postalCode = a.postcode || '';
    } catch (err) {
      console.warn('[location] OSM reverse geocode failed', err);
    }
  }

  if (!out.city) {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`,
      );
      const d = await res.json();
      out.city = cleanLocationName(d.city || d.locality || '');
      out.locality = out.locality || cleanLocationName(d.locality || '');
      out.state = out.state || d.principalSubdivision || '';
      out.postalCode = out.postalCode || d.postcode || '';
    } catch {}
  }
  return out;
}

/** The customer's precise current location with a clean street address. */
export async function detectDeviceLocation(): Promise<LocationData> {
  const { coords, accuracyM } = await getPreciseFix();
  const serviceability = evaluateHubServiceability(coords);
  const addr = await reverseGeocode(coords);

  const city = addr.city || addr.locality || 'Current location';
  const locality = addr.locality && addr.locality.toLowerCase() !== city.toLowerCase() ? addr.locality : '';
  const shortAddress = join([addr.line || locality, city]) || 'Current location';
  const fullAddress =
    join([addr.line, locality, city, join([addr.state, addr.postalCode]).replace(', ', ' '), 'India']) ||
    `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;

  return {
    shortAddress,
    fullAddress,
    city,
    state: addr.state,
    postalCode: addr.postalCode,
    coords,
    accuracyM: Math.round(accuracyM),
    isServiceable: serviceability.isServiceable,
    nearestHubName: serviceability.nearestHubName,
    distanceKm: serviceability.distanceKm,
    deliveryEta: serviceability.deliveryEta,
    tag: 'Current',
  };
}

// Popular Searchable Places for Instant Autocomplete
export const POPULAR_LOCATIONS: LocationData[] = [
  {
    shortAddress: 'Khandel Road, Bilaspur',
    fullAddress: 'Roop Vihar, 4523+VFV, Khandel Rd, Ashok Nagar, Sarkanda, Bilaspur, Chhattisgarh 495006',
    city: 'Bilaspur',
    state: 'Chhattisgarh',
    postalCode: '495006',
    coords: { latitude: 22.0797, longitude: 82.1409 },
    isServiceable: true,
    nearestHubName: 'Bilaspur Butchery Hub (Sarkanda)',
    distanceKm: 0.6,
    deliveryEta: '15–20 mins',
    tag: 'Home',
  },
  {
    shortAddress: 'Atal Nagar, Raipur',
    fullAddress: 'Sector 24, Near IIIT Naya Raipur, Atal Nagar, Chhattisgarh 492018',
    city: 'Raipur',
    state: 'Chhattisgarh',
    postalCode: '492018',
    coords: { latitude: 21.15, longitude: 81.77 },
    isServiceable: true,
    nearestHubName: 'Naya Raipur Express Hub (Atal Nagar)',
    distanceKm: 1.2,
    deliveryEta: '15–20 mins',
    tag: 'Work',
  },
  {
    shortAddress: 'Civil Lines, Raipur',
    fullAddress: 'LK Corporate Tower, Civil Lines, Raipur, Chhattisgarh 492001',
    city: 'Raipur',
    state: 'Chhattisgarh',
    postalCode: '492001',
    coords: { latitude: 21.2514, longitude: 81.6296 },
    isServiceable: true,
    nearestHubName: 'Raipur Central Butchery Hub (Civil Lines)',
    distanceKm: 0.4,
    deliveryEta: '15–20 mins',
    tag: 'Work',
  },
  {
    shortAddress: 'Bellandur, Bengaluru',
    fullAddress: 'Flat 402, Green Glen Orchid, Bellandur, Bengaluru 560103',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560103',
    coords: { latitude: 12.9304, longitude: 77.6784 },
    isServiceable: true,
    nearestHubName: 'Bengaluru East Express Hub (Indiranagar / Bellandur)',
    distanceKm: 1.8,
    deliveryEta: '15–20 mins',
    tag: 'Home',
  },
  {
    shortAddress: 'Devendra Nagar, Raipur',
    fullAddress: 'B-12, Sector 4, Devendra Nagar, Raipur, Chhattisgarh 492004',
    city: 'Raipur',
    state: 'Chhattisgarh',
    postalCode: '492004',
    coords: { latitude: 21.2612, longitude: 81.6421 },
    isServiceable: true,
    nearestHubName: 'Raipur Central Butchery Hub (Civil Lines)',
    distanceKm: 2.1,
    deliveryEta: '15–20 mins',
    tag: 'Other',
  },
  {
    shortAddress: 'Indiranagar 100ft Rd, Bengaluru',
    fullAddress: '12th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru 560038',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
    coords: { latitude: 12.9719, longitude: 77.6412 },
    isServiceable: true,
    nearestHubName: 'Bengaluru East Express Hub (Indiranagar / Bellandur)',
    distanceKm: 1.2,
    deliveryEta: '15–20 mins',
    tag: 'Work',
  },
  {
    shortAddress: 'Bandra West, Mumbai',
    fullAddress: 'Hill Road, Bandra West, Mumbai, Maharashtra 400050',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400050',
    coords: { latitude: 19.0553, longitude: 72.8331 },
    isServiceable: true,
    nearestHubName: 'Mumbai Coastal Butchery Hub (Bandra BKC)',
    distanceKm: 1.4,
    deliveryEta: '15–20 mins',
    tag: 'Home',
  },
  {
    shortAddress: 'Koregaon Park, Pune',
    fullAddress: 'Lane 7, Koregaon Park, Pune, Maharashtra 411001',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411001',
    coords: { latitude: 18.5362, longitude: 73.894 },
    isServiceable: true,
    nearestHubName: 'Pune Green Pastures Hub (Koregaon Park)',
    distanceKm: 0.9,
    deliveryEta: '15–20 mins',
    tag: 'Home',
  },
];
