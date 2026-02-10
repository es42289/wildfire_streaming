"use client";

import type { IncidentDetail, TopIncident } from "./LiveMap";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  incident: IncidentDetail | null;
  topIncidents?: TopIncident[];
  onClose?: () => void;
}

export default function Sidebar({ incident, topIncidents, onClose }: SidebarProps) {
  if (incident) {
    return (
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <h2 className={styles.title}>Incident Details</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.detail}>
          <div className={styles.field}>
            <span className={styles.label}>ID</span>
            <span className={`${styles.value} ${styles.mono}`}>{incident.incident_id}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>First Seen</span>
            <span className={styles.value}>{formatTime(incident.first_seen)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Last Seen</span>
            <span className={styles.value}>{formatTime(incident.last_seen)}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.field}>
            <span className={styles.label}>Hotspots (total)</span>
            <span className={styles.value}>{incident.hotspot_count}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Hotspots (1h)</span>
            <span className={styles.value}>{incident.hotspot_count_1h}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Hotspots (6h)</span>
            <span className={styles.value}>{incident.hotspot_count_6h}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.field}>
            <span className={styles.label}>Max FRP</span>
            <span className={styles.value}>{incident.intensity.toFixed(1)} MW</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Avg Confidence</span>
            <span className={styles.value}>{incident.avg_confidence.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <h2 className={styles.title}>Top Incidents</h2>
      {topIncidents && topIncidents.length > 0 ? (
        <div className={styles.topList}>
          {topIncidents.map((inc, i) => (
            <div key={inc.incident_id} className={styles.topItem}>
              <span className={styles.topRank}>#{i + 1}</span>
              <div className={styles.topInfo}>
                <span className={styles.topId}>{inc.incident_id}</span>
                <span className={styles.topMeta}>
                  {inc.hotspot_count} hotspots &middot; {inc.intensity.toFixed(1)} MW
                </span>
              </div>
              <div
                className={styles.topBar}
                style={{
                  width: `${Math.min(100, (inc.hotspot_count / (topIncidents[0]?.hotspot_count || 1)) * 100)}%`,
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.placeholder}>
          No active incidents to display.
        </p>
      )}
      <div className={styles.divider} />
      <p className={styles.hint}>
        Click an incident polygon on the map to view details.
      </p>
    </div>
  );
}

function formatTime(iso: string): string {
  if (!iso) return "--";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}
