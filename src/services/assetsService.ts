import { Asset, AssetReservation } from '../types';
import {
  getListItems,
  createListItem,
  updateListItem,
  deleteListItem,
} from './graphClient';
import { sharepointConfig } from '../config/authConfig';

const ASSETS_LIST = sharepointConfig.listNames.assets;
const RESERVATIONS_LIST = sharepointConfig.listNames.assetReservations;

// --- Asset CRUD ---

export async function getAssets(siteId: string): Promise<Asset[]> {
  return getListItems<Asset>(siteId, ASSETS_LIST);
}

export async function createAsset(siteId: string, asset: Omit<Asset, 'id'>): Promise<Asset> {
  return createListItem(siteId, ASSETS_LIST, asset as Record<string, unknown>) as unknown as Asset;
}

export async function updateAsset(
  siteId: string,
  assetId: string,
  updates: Partial<Asset>
): Promise<void> {
  await updateListItem(siteId, ASSETS_LIST, assetId, updates as Record<string, unknown>);
}

export async function deleteAsset(siteId: string, assetId: string): Promise<void> {
  await deleteListItem(siteId, ASSETS_LIST, assetId);
}

// --- Reservation CRUD ---

export async function getReservations(
  siteId: string,
  assetId?: string,
  eventId?: string
): Promise<AssetReservation[]> {
  let filter: string | undefined;
  if (assetId && eventId) {
    filter = `fields/assetId eq '${assetId}' and fields/eventId eq '${eventId}'`;
  } else if (assetId) {
    filter = `fields/assetId eq '${assetId}'`;
  } else if (eventId) {
    filter = `fields/eventId eq '${eventId}'`;
  }
  return getListItems<AssetReservation>(siteId, RESERVATIONS_LIST, undefined, filter);
}

export async function createReservation(
  siteId: string,
  reservation: Omit<AssetReservation, 'id'>
): Promise<AssetReservation> {
  // Check availability before reserving
  const available = await getAvailableQuantity(
    siteId,
    reservation.assetId,
    reservation.startDate,
    reservation.endDate
  );
  if (available < reservation.quantity) {
    throw new Error(
      `Insufficient quantity. Only ${available} units available for the requested dates.`
    );
  }
  return createListItem(
    siteId,
    RESERVATIONS_LIST,
    reservation as unknown as Record<string, unknown>
  ) as unknown as AssetReservation;
}

export async function updateReservation(
  siteId: string,
  reservationId: string,
  updates: Partial<AssetReservation>
): Promise<void> {
  await updateListItem(siteId, RESERVATIONS_LIST, reservationId, updates as Record<string, unknown>);
}

export async function deleteReservation(siteId: string, reservationId: string): Promise<void> {
  await deleteListItem(siteId, RESERVATIONS_LIST, reservationId);
}

// --- Availability ---

export async function getAvailableQuantity(
  siteId: string,
  assetId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const [assets, reservations] = await Promise.all([
    getAssets(siteId),
    getReservations(siteId, assetId),
  ]);

  const asset = assets.find((a) => a.id === assetId);
  if (!asset) return 0;

  // Find overlapping active reservations
  const overlapping = reservations.filter((r) => {
    if (r.status === 'Returned' || r.status === 'Cancelled') return false;
    const rStart = new Date(r.startDate);
    const rEnd = new Date(r.endDate);
    const qStart = new Date(startDate);
    const qEnd = new Date(endDate);
    return rStart <= qEnd && rEnd >= qStart;
  });

  const reservedQuantity = overlapping.reduce((sum, r) => sum + r.quantity, 0);
  return asset.totalQuantity - reservedQuantity;
}

// Get all assets with their current availability for a date range
export async function getAssetsWithAvailability(
  siteId: string,
  startDate: string,
  endDate: string
): Promise<(Asset & { availableQuantity: number })[]> {
  const assets = await getAssets(siteId);
  const results = await Promise.all(
    assets.map(async (asset) => {
      const availableQuantity = await getAvailableQuantity(siteId, asset.id, startDate, endDate);
      return { ...asset, availableQuantity };
    })
  );
  return results;
}
