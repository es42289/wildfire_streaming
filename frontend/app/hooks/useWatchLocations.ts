import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../config";

export interface WatchLocation {
  location_id: string;
  name: string;
  lat: number;
  lon: number;
  radius_miles: number;
  status: string;
  created_at: string;
}

export function useWatchLocations(getAccessToken: (() => Promise<string>) | null) {
  const [locations, setLocations] = useState<WatchLocation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLocations = useCallback(async () => {
    if (!getAccessToken) return;
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/alerts/my-watches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const items = (data.locations || []).map((loc: Record<string, unknown>) => ({
        ...loc,
        lat: Number(loc.lat),
        lon: Number(loc.lon),
        radius_miles: Number(loc.radius_miles),
      }));
      setLocations(items);
    } catch (e) {
      console.error("Failed to fetch watch locations:", e);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const createLocation = useCallback(
    async (data: { name: string; lat: number; lon: number; radius_miles: number }) => {
      if (!getAccessToken) throw new Error("Not authenticated");
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/alerts/watch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || result.errors?.join(", ") || "Failed");
      await fetchLocations();
      return result;
    },
    [getAccessToken, fetchLocations]
  );

  const deleteLocation = useCallback(
    async (locationId: string) => {
      if (!getAccessToken) throw new Error("Not authenticated");
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/alerts/watch/${locationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchLocations();
    },
    [getAccessToken, fetchLocations]
  );

  return { locations, loading, refetch: fetchLocations, createLocation, deleteLocation };
}
