import { secureStorage } from './secure-storage';

const KEY = 'openride.driver.destination_filter';

export interface DestinationFilter {
  label: string;
  lat: number;
  lng: number;
}

export async function loadDestinationFilter(): Promise<DestinationFilter | null> {
  const raw = await secureStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DestinationFilter;
    if (
      typeof parsed.label === 'string' &&
      typeof parsed.lat === 'number' &&
      typeof parsed.lng === 'number'
    ) {
      return parsed;
    }
  } catch {
    // corrupt — clear
  }
  await secureStorage.removeItem(KEY);
  return null;
}

export async function saveDestinationFilter(dest: DestinationFilter): Promise<void> {
  await secureStorage.setItem(KEY, JSON.stringify(dest));
}

export async function clearDestinationFilter(): Promise<void> {
  await secureStorage.removeItem(KEY);
}
