import axios from 'axios';

export type Country = { label: string; value: string; flag?: string };
export type Option = { label: string; value: string };

// Fetch countries from REST Countries (no key required)
export async function fetchCountries(): Promise<Country[]> {
  const res = await axios.get('https://restcountries.com/v3.1/all?fields=name,cca2,flag');
  const data = res.data || [];
  return (data as any[])
    .map((c) => ({ label: c?.name?.common || c?.name || '', value: c?.cca2 || '', flag: c?.flag }))
    .filter((c) => c.label && c.value)
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Search places using Open-Meteo Geocoding (free, no key)
// Returns unique lists for cities (by name) and states (by admin1) filtered by optional countryCode
export async function searchPlaces(query: string, countryCode?: string): Promise<{ cities: Option[]; states: Option[] }>{
  if (!query || query.trim().length < 2) return { cities: [], states: [] };
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
  const res = await axios.get(url);
  const results = (res.data?.results || []) as any[];
  const filtered = countryCode ? results.filter((r) => (r.country_code || r.country_code3 || '').toUpperCase() === countryCode.toUpperCase()) : results;

  const seenCity = new Set<string>();
  const cities: Option[] = [];
  for (const r of filtered) {
    const name = r.name || r.city || '';
    if (!name) continue;
    const key = name.toLowerCase();
    if (!seenCity.has(key)) {
      seenCity.add(key);
      cities.push({ label: name, value: name });
    }
  }

  const seenState = new Set<string>();
  const states: Option[] = [];
  for (const r of filtered) {
    const admin1 = r.admin1 || '';
    if (!admin1) continue;
    const key = admin1.toLowerCase();
    if (!seenState.has(key)) {
      seenState.add(key);
      states.push({ label: admin1, value: admin1 });
    }
  }

  return { cities, states };
}
