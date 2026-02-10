"use client";

import type { WsStatus } from "../hooks/useWebSocket";
import styles from "./DashboardBar.module.css";

interface DashboardBarProps {
  mode: "live" | "replay";
  onModeChange: (mode: "live" | "replay") => void;
  visibleLayers: { hotspots: boolean; incidents: boolean };
  onLayerToggle: (layer: "hotspots" | "incidents") => void;
  hotspotCount: number;
  incidentCount: number;
  wsStatus: WsStatus;
  replayTimestamp?: string;
}

const STATUS_LABELS: Record<WsStatus, string> = {
  connected: "Live",
  connecting: "Connecting",
  disconnected: "Offline",
};

export default function DashboardBar({
  mode,
  onModeChange,
  visibleLayers,
  onLayerToggle,
  hotspotCount,
  incidentCount,
  wsStatus,
  replayTimestamp,
}: DashboardBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.logo}>Wildfire Live Map</span>

        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${mode === "live" ? styles.active : ""}`}
            onClick={() => onModeChange("live")}
          >
            <span className={mode === "live" ? styles.liveDot : ""} />
            Live
          </button>
          <button
            className={`${styles.modeBtn} ${mode === "replay" ? styles.active : ""}`}
            onClick={() => onModeChange("replay")}
          >
            Replay
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.layerToggles}>
          <label className={styles.layerLabel}>
            <input
              type="checkbox"
              checked={visibleLayers.hotspots}
              onChange={() => onLayerToggle("hotspots")}
            />
            Hotspots
          </label>
          <label className={styles.layerLabel}>
            <input
              type="checkbox"
              checked={visibleLayers.incidents}
              onChange={() => onLayerToggle("incidents")}
            />
            Incidents
          </label>
        </div>

        <div className={styles.divider} />

        <div className={styles.wsStatus}>
          {mode === "replay" ? (
            <span className={styles.wsLabel}>
              {replayTimestamp
                ? new Date(replayTimestamp).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                : "Replay"}
            </span>
          ) : (
            <>
              <span className={`${styles.wsDot} ${styles[`ws_${wsStatus}`]}`} />
              <span className={styles.wsLabel}>{STATUS_LABELS[wsStatus]}</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{hotspotCount}</span>
          <span className={styles.statLabel}>Hotspots</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{incidentCount}</span>
          <span className={styles.statLabel}>Incidents</span>
        </div>
      </div>
    </div>
  );
}
