"use client";

import { useAuth0 } from "@auth0/auth0-react";
import type { WsStatus } from "../hooks/useWebSocket";
import styles from "./DashboardNav.module.css";

interface DashboardNavProps {
  hotspotCount: number;
  incidentCount: number;
  wsStatus: WsStatus;
}

const STATUS_LABELS: Record<WsStatus, string> = {
  connected: "Live",
  connecting: "Connecting",
  disconnected: "Offline",
};

export default function DashboardNav({
  hotspotCount,
  incidentCount,
  wsStatus,
}: DashboardNavProps) {
  const { user, logout } = useAuth0();

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <a href="/" className={styles.logo}>Wildfire Live Map</a>
        <span className={styles.badge}>Dashboard</span>
        <div className={styles.divider} />
        <div className={styles.wsStatus}>
          <span className={`${styles.wsDot} ${styles[`ws_${wsStatus}`]}`} />
          <span className={styles.wsLabel}>{STATUS_LABELS[wsStatus]}</span>
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
        <div className={styles.divider} />
        {user && (
          <div className={styles.user}>
            {user.picture && (
              <img src={user.picture} alt="" className={styles.avatar} referrerPolicy="no-referrer" />
            )}
            <span className={styles.userName}>{user.name || user.email}</span>
          </div>
        )}
        <button
          className={styles.logoutBtn}
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
