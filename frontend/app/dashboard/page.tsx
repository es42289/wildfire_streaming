"use client";

import { useState, useCallback, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import LiveMap from "../components/LiveMap";
import type { IncidentDetail, TopIncident, WatchLocationMarker } from "../components/LiveMap";
import type { WsStatus } from "../hooks/useWebSocket";
import DashboardNav from "../components/DashboardNav";
import DashboardSidebar from "../components/DashboardSidebar";
import WatchLocationModal from "../components/WatchLocationModal";
import modalStyles from "../components/WatchLocationModal.module.css";
import { useWatchLocations, type WatchLocation } from "../hooks/useWatchLocations";
import { AUTH0_AUDIENCE } from "../config";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0();

  const [hotspotCount, setHotspotCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [hotspotFeatures, setHotspotFeatures] = useState<GeoJSON.Feature[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [watchModalOpen, setWatchModalOpen] = useState(false);
  const [mapPickMode, setMapPickMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number; zoom: number } | null>(null);

  const getToken = useCallback(async () => {
    return getAccessTokenSilently({ authorizationParams: { audience: AUTH0_AUDIENCE } });
  }, [getAccessTokenSilently]);

  const { locations, loading: locsLoading, createLocation, deleteLocation } = useWatchLocations(
    isAuthenticated ? getToken : null
  );

  const watchLocationMarkers: WatchLocationMarker[] = useMemo(
    () =>
      locations.map((loc) => ({
        location_id: loc.location_id,
        name: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        radius_miles: loc.radius_miles,
      })),
    [locations]
  );

  const handleHotspotCount = useCallback((count: number) => setHotspotCount(count), []);
  const handleIncidentCount = useCallback((count: number) => setIncidentCount(count), []);
  const handleWsStatus = useCallback((status: WsStatus) => setWsStatus(status), []);
  const handleHotspotsData = useCallback((features: GeoJSON.Feature[]) => setHotspotFeatures(features), []);

  const handleSelectLocation = useCallback((loc: WatchLocation) => {
    setSelectedLocationId(loc.location_id);
    // Zoom level based on radius
    const radiusToZoom: Record<number, number> = { 5: 11, 10: 10, 25: 9, 50: 8 };
    const zoom = radiusToZoom[loc.radius_miles] ?? 10;
    setFlyTo({ lat: loc.lat, lon: loc.lon, zoom });
  }, []);

  const handleWatchLocationClick = useCallback((locationId: string) => {
    setSelectedLocationId(locationId);
  }, []);

  const handleAddLocation = useCallback(() => {
    setPickedCoords(null);
    setWatchModalOpen(true);
  }, []);

  const handlePickOnMap = useCallback(() => {
    setWatchModalOpen(false);
    setMapPickMode(true);
  }, []);

  const handleMapPick = useCallback((coords: { lat: number; lon: number }) => {
    setPickedCoords(coords);
    setMapPickMode(false);
    setWatchModalOpen(true);
  }, []);

  const handleCancelPick = useCallback(() => {
    setMapPickMode(false);
    setWatchModalOpen(true);
  }, []);

  const handleWatchModalClose = useCallback(() => {
    setWatchModalOpen(false);
    setPickedCoords(null);
  }, []);

  const handleDeleteLocation = useCallback(
    async (locationId: string) => {
      if (!confirm("Remove this watch location?")) return;
      await deleteLocation(locationId);
      if (selectedLocationId === locationId) setSelectedLocationId(null);
    },
    [deleteLocation, selectedLocationId]
  );

  // Auth loading state
  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#1a1a2e" }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  // Not authenticated — prompt login
  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#1a1a2e", gap: "20px" }}>
        <h1 style={{ color: "#ff6b35", fontSize: "1.5rem", margin: 0 }}>Wildfire Live Map</h1>
        <p style={{ color: "#aaa", fontSize: "0.9rem", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
          Sign in to access your dashboard, manage watch locations, and receive fire alerts.
        </p>
        <button
          onClick={() => loginWithRedirect()}
          style={{
            padding: "12px 32px",
            background: "#ff6b35",
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sign In
        </button>
        <a href="/" style={{ color: "#666", fontSize: "0.8rem" }}>
          &larr; Back to public map
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <DashboardNav
        hotspotCount={hotspotCount}
        incidentCount={incidentCount}
        wsStatus={wsStatus}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <DashboardSidebar
          locations={locations}
          loading={locsLoading}
          hotspotFeatures={hotspotFeatures}
          selectedLocationId={selectedLocationId}
          onSelectLocation={handleSelectLocation}
          onAddLocation={handleAddLocation}
          onDeleteLocation={handleDeleteLocation}
        />
        <div style={{ flex: 1, position: "relative" }}>
          <LiveMap
            mode="live"
            visibleLayers={{ hotspots: true, incidents: true }}
            onHotspotCount={handleHotspotCount}
            onIncidentCount={handleIncidentCount}
            onWsStatus={handleWsStatus}
            onHotspotsData={handleHotspotsData}
            mapPickMode={mapPickMode}
            onMapPick={handleMapPick}
            watchLocations={watchLocationMarkers}
            onWatchLocationClick={handleWatchLocationClick}
            flyTo={flyTo}
          />
        </div>
      </div>

      <WatchLocationModal
        open={watchModalOpen}
        onClose={handleWatchModalClose}
        onPickOnMap={handlePickOnMap}
        pickedCoords={pickedCoords}
        createLocation={createLocation}
        onCreated={handleWatchModalClose}
      />

      {mapPickMode && (
        <div className={modalStyles.pickBanner}>
          <span className={modalStyles.pickBannerText}>Click the map to select a location</span>
          <button className={modalStyles.pickCancelBtn} onClick={handleCancelPick}>Cancel</button>
        </div>
      )}
    </div>
  );
}
