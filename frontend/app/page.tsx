"use client";

import { useState, useCallback } from "react";
import LiveMap from "./components/LiveMap";
import type { IncidentDetail, TopIncident } from "./components/LiveMap";
import type { WsStatus } from "./hooks/useWebSocket";
import DashboardBar from "./components/DashboardBar";
import HeroSection from "./components/HeroSection";
import Sidebar from "./components/Sidebar";
import ReplayControls from "./components/ReplayControls";
import StackSection from "./components/StackSection";

export default function Home() {
  const [mode, setMode] = useState<"live" | "replay">("live");
  const [visibleLayers, setVisibleLayers] = useState({
    hotspots: true,
    incidents: true,
  });
  const [hotspotCount, setHotspotCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [topIncidents, setTopIncidents] = useState<TopIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [replayData, setReplayData] = useState<{
    hotspots: GeoJSON.FeatureCollection;
    incidents: GeoJSON.FeatureCollection;
  } | null>(null);
  const [replayTimestamp, setReplayTimestamp] = useState("");

  const handleLayerToggle = (layer: "hotspots" | "incidents") => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleHotspotCount = useCallback((count: number) => setHotspotCount(count), []);
  const handleIncidentCount = useCallback((count: number) => setIncidentCount(count), []);
  const handleIncidentClick = useCallback((detail: IncidentDetail | null) => setSelectedIncident(detail), []);
  const handleWsStatus = useCallback((status: WsStatus) => setWsStatus(status), []);
  const handleTopIncidents = useCallback((incidents: TopIncident[]) => setTopIncidents(incidents), []);
  const handleLoading = useCallback((l: boolean) => setLoading(l), []);
  const handleSnapshotData = useCallback(
    (data: { hotspots: GeoJSON.FeatureCollection; incidents: GeoJSON.FeatureCollection } | null) => setReplayData(data),
    []
  );
  const handleReplayTimestamp = useCallback((ts: string) => setReplayTimestamp(ts), []);
  const handleSidebarClose = useCallback(() => setSelectedIncident(null), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <DashboardBar
        mode={mode}
        onModeChange={setMode}
        visibleLayers={visibleLayers}
        onLayerToggle={handleLayerToggle}
        hotspotCount={hotspotCount}
        incidentCount={incidentCount}
        wsStatus={wsStatus}
        replayTimestamp={mode === "replay" ? replayTimestamp : undefined}
      />
      <HeroSection />
      <div style={{ display: "flex", height: "80vh", position: "relative" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <LiveMap
            mode={mode}
            visibleLayers={visibleLayers}
            replayData={replayData}
            onHotspotCount={handleHotspotCount}
            onIncidentCount={handleIncidentCount}
            onIncidentClick={handleIncidentClick}
            onWsStatus={handleWsStatus}
            onTopIncidents={handleTopIncidents}
            onLoading={handleLoading}
          />
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
            </div>
          )}
          {mode === "replay" && (
            <ReplayControls
              onSnapshotData={handleSnapshotData}
              onTimestamp={handleReplayTimestamp}
            />
          )}
        </div>
        <Sidebar
          incident={selectedIncident}
          topIncidents={topIncidents}
          onClose={handleSidebarClose}
        />
      </div>
      <StackSection />
    </div>
  );
}
