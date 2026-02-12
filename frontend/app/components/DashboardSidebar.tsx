"use client";

import { useMemo } from "react";
import type { WatchLocation } from "../hooks/useWatchLocations";
import styles from "./DashboardSidebar.module.css";

interface DashboardSidebarProps {
  locations: WatchLocation[];
  loading: boolean;
  hotspotFeatures: GeoJSON.Feature[];
  selectedLocationId: string | null;
  onSelectLocation: (loc: WatchLocation) => void;
  onAddLocation: () => void;
  onDeleteLocation: (locationId: string) => void;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DashboardSidebar({
  locations,
  loading,
  hotspotFeatures,
  selectedLocationId,
  onSelectLocation,
  onAddLocation,
  onDeleteLocation,
}: DashboardSidebarProps) {
  const fireCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const loc of locations) {
      let count = 0;
      for (const f of hotspotFeatures) {
        const coords = (f.geometry as GeoJSON.Point)?.coordinates;
        if (!coords) continue;
        const dist = haversine(loc.lat, loc.lon, coords[1], coords[0]);
        if (dist <= loc.radius_miles) count++;
      }
      map[loc.location_id] = count;
    }
    return map;
  }, [locations, hotspotFeatures]);

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Watch Locations</h2>
        <button className={styles.addBtn} onClick={onAddLocation}>+ Add</button>
      </div>

      {loading && locations.length === 0 && (
        <p className={styles.placeholder}>Loading...</p>
      )}

      {!loading && locations.length === 0 && (
        <p className={styles.placeholder}>
          No watch locations yet. Click &quot;+ Add&quot; to monitor an area for fire activity.
        </p>
      )}

      <div className={styles.list}>
        {locations.map((loc) => {
          const count = fireCountMap[loc.location_id] ?? 0;
          const isSelected = selectedLocationId === loc.location_id;
          return (
            <div
              key={loc.location_id}
              className={`${styles.item} ${isSelected ? styles.selected : ""}`}
              onClick={() => onSelectLocation(loc)}
            >
              <div className={styles.itemHeader}>
                <div className={styles.itemIcon}>
                  <span className={`${styles.dot} ${count > 0 ? styles.dotAlert : styles.dotClear}`} />
                </div>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{loc.name}</span>
                  <span className={styles.itemMeta}>{loc.radius_miles} mi radius</span>
                </div>
                <div className={styles.itemCount}>
                  <span className={`${styles.countValue} ${count > 0 ? styles.countAlert : ""}`}>
                    {count}
                  </span>
                  <span className={styles.countLabel}>
                    {count === 1 ? "fire" : "fires"}
                  </span>
                </div>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteLocation(loc.location_id);
                }}
                title="Remove watch location"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
