"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useWebSocket, type WsStatus } from "../hooks/useWebSocket";

const API_URL = "https://0lzyt3z6r5.execute-api.us-east-1.amazonaws.com";
const WS_URL = "wss://i7lyatejv0.execute-api.us-east-1.amazonaws.com/prod";

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export interface IncidentDetail {
  incident_id: string;
  first_seen: string;
  last_seen: string;
  hotspot_count: number;
  hotspot_count_1h: number;
  hotspot_count_6h: number;
  intensity: number;
  avg_confidence: number;
}

export interface TopIncident {
  incident_id: string;
  hotspot_count: number;
  intensity: number;
  centroid_lat: number;
  centroid_lon: number;
}

export interface WatchMarker {
  lat: number;
  lon: number;
  radiusMiles: number;
}

interface LiveMapProps {
  mode: "live" | "replay";
  visibleLayers: { hotspots: boolean; incidents: boolean };
  replayData?: { hotspots: GeoJSON.FeatureCollection; incidents: GeoJSON.FeatureCollection } | null;
  onHotspotCount?: (count: number) => void;
  onIncidentCount?: (count: number) => void;
  onIncidentClick?: (detail: IncidentDetail | null) => void;
  onWsStatus?: (status: WsStatus) => void;
  onTopIncidents?: (incidents: TopIncident[]) => void;
  onLoading?: (loading: boolean) => void;
  mapPickMode?: boolean;
  onMapPick?: (coords: { lat: number; lon: number }) => void;
  watchMarker?: WatchMarker | null;
}

function createCircleGeoJSON(lat: number, lon: number, radiusMiles: number, segments = 64): GeoJSON.Feature {
  const radiusKm = radiusMiles * 1.60934;
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const dLat = (radiusKm / 111.32) * Math.cos(angle);
    const dLon = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
    coords.push([lon + dLon, lat + dLat]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} };
}

export default function LiveMap({
  mode,
  visibleLayers,
  replayData,
  onHotspotCount,
  onIncidentCount,
  onIncidentClick,
  onWsStatus,
  onTopIncidents,
  onLoading,
  mapPickMode,
  onMapPick,
  watchMarker,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const incidentsDataRef = useRef<GeoJSON.FeatureCollection>(EMPTY_FC);
  const [ready, setReady] = useState(false);

  // Extract top incidents from feature collection
  const updateTopIncidents = useCallback(
    (fc: GeoJSON.FeatureCollection) => {
      const sorted = [...fc.features]
        .sort((a, b) => (b.properties?.hotspot_count ?? 0) - (a.properties?.hotspot_count ?? 0))
        .slice(0, 5);

      onTopIncidents?.(
        sorted.map((f) => ({
          incident_id: f.properties?.incident_id ?? "",
          hotspot_count: f.properties?.hotspot_count ?? 0,
          intensity: f.properties?.intensity ?? 0,
          centroid_lat: f.properties?.centroid_lat ?? 0,
          centroid_lon: f.properties?.centroid_lon ?? 0,
        }))
      );
    },
    [onTopIncidents]
  );

  // Handle incoming WebSocket messages
  const handleWsMessage = useCallback(
    (data: unknown) => {
      const msg = data as { action?: string; incidents?: Array<Record<string, unknown>> };
      if (msg.action !== "incidents_updated" || !msg.incidents) return;

      const map = mapRef.current;
      if (!map) return;

      const src = map.getSource("incidents") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;

      const features: GeoJSON.Feature[] = [];
      for (const inc of msg.incidents) {
        try {
          const geojson =
            typeof inc.footprint_geojson === "string"
              ? JSON.parse(inc.footprint_geojson)
              : inc.footprint_geojson;

          features.push({
            type: "Feature",
            geometry: geojson,
            properties: {
              incident_id: inc.incident_id,
              hotspot_count: inc.hotspot_count,
              intensity: inc.intensity_max,
              centroid_lat: inc.centroid_lat,
              centroid_lon: inc.centroid_lon,
            },
          });
        } catch {
          // skip malformed entries
        }
      }

      if (features.length > 0) {
        const existing = incidentsDataRef.current.features;
        const updatedIds = new Set(features.map((f) => f.properties?.incident_id));
        const merged = [
          ...existing.filter((f) => !updatedIds.has(f.properties?.incident_id)),
          ...features,
        ];

        const fc: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: merged,
        };
        incidentsDataRef.current = fc;
        src.setData(fc);
        onIncidentCount?.(fc.features.length);
        updateTopIncidents(fc);
      }
    },
    [onIncidentCount, updateTopIncidents]
  );

  const { status: wsStatus } = useWebSocket({
    url: WS_URL,
    enabled: ready && mode === "live",
    onMessage: handleWsMessage,
  });

  useEffect(() => {
    onWsStatus?.(wsStatus);
  }, [wsStatus, onWsStatus]);

  const fetchLatestState = useCallback(async () => {
    onLoading?.(true);
    try {
      const res = await fetch(`${API_URL}/state/latest`);
      if (!res.ok) return;
      const data = await res.json();

      const map = mapRef.current;
      if (!map) return;

      const hotspotsSrc = map.getSource("hotspots") as maplibregl.GeoJSONSource | undefined;
      if (hotspotsSrc && data.hotspots) {
        hotspotsSrc.setData(data.hotspots);
        onHotspotCount?.(data.hotspots.features?.length ?? 0);
      }

      const incidentsSrc = map.getSource("incidents") as maplibregl.GeoJSONSource | undefined;
      if (incidentsSrc && data.incidents) {
        incidentsDataRef.current = data.incidents;
        incidentsSrc.setData(data.incidents);
        onIncidentCount?.(data.incidents.features?.length ?? 0);
        updateTopIncidents(data.incidents);
      }
    } catch (e) {
      console.error("Failed to fetch latest state:", e);
    } finally {
      onLoading?.(false);
    }
  }, [onHotspotCount, onIncidentCount, onLoading, updateTopIncidents]);

  // Apply replay data
  useEffect(() => {
    if (mode !== "replay" || !ready) return;
    const map = mapRef.current;
    if (!map) return;

    const hotspotsSrc = map.getSource("hotspots") as maplibregl.GeoJSONSource | undefined;
    const incidentsSrc = map.getSource("incidents") as maplibregl.GeoJSONSource | undefined;

    if (replayData) {
      if (hotspotsSrc && replayData.hotspots) {
        hotspotsSrc.setData(replayData.hotspots);
        onHotspotCount?.(replayData.hotspots.features?.length ?? 0);
      }
      if (incidentsSrc && replayData.incidents) {
        incidentsSrc.setData(replayData.incidents);
        onIncidentCount?.(replayData.incidents.features?.length ?? 0);
        updateTopIncidents(replayData.incidents);
      }
    } else {
      hotspotsSrc?.setData(EMPTY_FC);
      incidentsSrc?.setData(EMPTY_FC);
      onHotspotCount?.(0);
      onIncidentCount?.(0);
      onTopIncidents?.([]);
    }
  }, [mode, replayData, ready, onHotspotCount, onIncidentCount, onTopIncidents, updateTopIncidents]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [-98.5, 39.8],
      zoom: 4,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      // ---- Hotspot layers ----
      map.addSource("hotspots", { type: "geojson", data: EMPTY_FC });

      // Pulse ring (behind main dots) — high-confidence only
      map.addLayer({
        id: "hotspots-pulse",
        type: "circle",
        source: "hotspots",
        filter: [">=", ["get", "confidence"], 70],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "confidence"],
            70, 12, 100, 20,
          ],
          "circle-color": "transparent",
          "circle-opacity": 0,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ff6b35",
          "circle-stroke-opacity": [
            "interpolate", ["linear"], ["get", "confidence"],
            70, 0.15, 100, 0.4,
          ],
        },
      });

      // Main hotspot dots
      map.addLayer({
        id: "hotspots-layer",
        type: "circle",
        source: "hotspots",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "frp"],
            0, 3, 10, 5, 50, 8, 200, 12,
          ],
          "circle-color": [
            "interpolate", ["linear"], ["get", "confidence"],
            0, "#ffeb3b", 50, "#ff9800", 80, "#f44336",
          ],
          "circle-opacity": 0.85,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.3)",
        },
      });

      // ---- Incident layers ----
      map.addSource("incidents", { type: "geojson", data: EMPTY_FC });

      map.addLayer({
        id: "incidents-layer",
        type: "fill",
        source: "incidents",
        paint: {
          "fill-color": [
            "interpolate", ["linear"], ["get", "intensity"],
            0, "rgba(255, 152, 0, 0.15)",
            20, "rgba(255, 107, 53, 0.25)",
            50, "rgba(244, 67, 54, 0.35)",
          ],
          "fill-outline-color": "#ff6b35",
        },
      });

      map.addLayer({
        id: "incidents-outline-layer",
        type: "line",
        source: "incidents",
        paint: {
          "line-color": [
            "interpolate", ["linear"], ["get", "intensity"],
            0, "#ff9800", 50, "#f44336",
          ],
          "line-width": [
            "interpolate", ["linear"], ["get", "hotspot_count"],
            1, 1, 20, 2.5,
          ],
          "line-opacity": 0.7,
        },
      });

      // ---- Hotspot tooltip on hover ----
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "hotspot-popup",
        offset: 10,
      });
      popupRef.current = popup;

      map.on("mouseenter", "hotspots-layer", (e) => {
        map.getCanvas().style.cursor = "crosshair";
        if (!e.features?.length) return;
        const f = e.features[0];
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const p = f.properties;
        popup
          .setLngLat(coords)
          .setHTML(
            `<div style="font-size:12px;line-height:1.5">` +
            `<strong>FRP:</strong> ${Number(p?.frp ?? 0).toFixed(1)} MW<br/>` +
            `<strong>Confidence:</strong> ${p?.confidence ?? "--"}%<br/>` +
            `<strong>Satellite:</strong> ${p?.satellite ?? "--"}<br/>` +
            `<strong>Time:</strong> ${p?.acq_date ?? ""} ${p?.acq_time ?? ""}` +
            `</div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", "hotspots-layer", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // ---- Incident click ----
      map.on("click", "incidents-layer", (e) => {
        if (!e.features?.length) return;
        const props = e.features[0].properties;
        onIncidentClick?.({
          incident_id: props?.incident_id ?? "",
          first_seen: props?.first_seen ?? "",
          last_seen: props?.last_seen ?? "",
          hotspot_count: props?.hotspot_count ?? 0,
          hotspot_count_1h: props?.hotspot_count_1h ?? 0,
          hotspot_count_6h: props?.hotspot_count_6h ?? 0,
          intensity: props?.intensity ?? 0,
          avg_confidence: props?.avg_confidence ?? 50,
        });
      });

      map.on("mouseenter", "incidents-layer", () => {
        if (!popupRef.current?.isOpen()) {
          map.getCanvas().style.cursor = "pointer";
        }
      });
      map.on("mouseleave", "incidents-layer", () => {
        if (!popupRef.current?.isOpen()) {
          map.getCanvas().style.cursor = "";
        }
      });

      // ---- Watch location layers ----
      map.addSource("watch-location", { type: "geojson", data: EMPTY_FC });

      map.addLayer({
        id: "watch-location-fill",
        type: "fill",
        source: "watch-location",
        paint: {
          "fill-color": "#4fc3f7",
          "fill-opacity": 0.12,
        },
      });

      map.addLayer({
        id: "watch-location-line",
        type: "line",
        source: "watch-location",
        paint: {
          "line-color": "#4fc3f7",
          "line-width": 2,
          "line-dasharray": [3, 2],
          "line-opacity": 0.7,
        },
      });

      setReady(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Initial data load
  useEffect(() => {
    if (!ready || mode !== "live") return;
    fetchLatestState();
  }, [ready, mode, fetchLatestState]);

  // Layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const hVis = visibleLayers.hotspots ? "visible" : "none";
    const iVis = visibleLayers.incidents ? "visible" : "none";
    map.setLayoutProperty("hotspots-layer", "visibility", hVis);
    map.setLayoutProperty("hotspots-pulse", "visibility", hVis);
    map.setLayoutProperty("incidents-layer", "visibility", iVis);
    map.setLayoutProperty("incidents-outline-layer", "visibility", iVis);
  }, [visibleLayers, ready]);

  // Map pick mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (mapPickMode) {
      map.getCanvas().style.cursor = "crosshair";
      const handleClick = (e: maplibregl.MapMouseEvent) => {
        onMapPick?.({ lat: e.lngLat.lat, lon: e.lngLat.lng });
      };
      map.on("click", handleClick);
      return () => {
        map.off("click", handleClick);
        map.getCanvas().style.cursor = "";
      };
    } else {
      map.getCanvas().style.cursor = "";
    }
  }, [mapPickMode, ready, onMapPick]);

  // Watch marker circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("watch-location") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    if (watchMarker) {
      const circle = createCircleGeoJSON(watchMarker.lat, watchMarker.lon, watchMarker.radiusMiles);
      src.setData({ type: "FeatureCollection", features: [circle] });
    } else {
      src.setData(EMPTY_FC);
    }
  }, [watchMarker, ready]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
