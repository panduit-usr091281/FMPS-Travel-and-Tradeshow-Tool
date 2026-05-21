import { useState, useEffect, useCallback } from 'react';
import { Asset, AssetReservation } from '../types';
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  getAvailableQuantity,
} from '../services/assetsService';

export function useAssets(siteId: string | null) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [reservations, setReservations] = useState<AssetReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const [assetData, reservationData] = await Promise.all([
        getAssets(siteId),
        getReservations(siteId),
      ]);
      setAssets(assetData);
      setReservations(reservationData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const addAsset = async (asset: Omit<Asset, 'id'>) => {
    if (!siteId) return;
    const created = await createAsset(siteId, asset);
    setAssets((prev) => [...prev, created]);
    return created;
  };

  const editAsset = async (assetId: string, updates: Partial<Asset>) => {
    if (!siteId) return;
    await updateAsset(siteId, assetId, updates);
    setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, ...updates } : a)));
  };

  const removeAsset = async (assetId: string) => {
    if (!siteId) return;
    await deleteAsset(siteId, assetId);
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  const reserveAsset = async (reservation: Omit<AssetReservation, 'id'>) => {
    if (!siteId) return;
    const created = await createReservation(siteId, reservation);
    setReservations((prev) => [...prev, created]);
    return created;
  };

  const editReservation = async (reservationId: string, updates: Partial<AssetReservation>) => {
    if (!siteId) return;
    await updateReservation(siteId, reservationId, updates);
    setReservations((prev) =>
      prev.map((r) => (r.id === reservationId ? { ...r, ...updates } : r))
    );
  };

  const removeReservation = async (reservationId: string) => {
    if (!siteId) return;
    await deleteReservation(siteId, reservationId);
    setReservations((prev) => prev.filter((r) => r.id !== reservationId));
  };

  const checkAvailability = async (assetId: string, startDate: string, endDate: string) => {
    if (!siteId) return 0;
    return getAvailableQuantity(siteId, assetId, startDate, endDate);
  };

  return {
    assets,
    reservations,
    loading,
    error,
    refresh,
    addAsset,
    editAsset,
    removeAsset,
    reserveAsset,
    editReservation,
    removeReservation,
    checkAvailability,
  };
}
