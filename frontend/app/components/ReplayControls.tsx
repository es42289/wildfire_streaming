"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./ReplayControls.module.css";

const API_URL = "https://0lzyt3z6r5.execute-api.us-east-1.amazonaws.com";

interface Snapshot {
  key: string;
  timestamp: string;
  date: string;
  hour: string;
}

interface ReplayControlsProps {
  onSnapshotData: (data: { hotspots: GeoJSON.FeatureCollection; incidents: GeoJSON.FeatureCollection } | null) => void;
  onTimestamp: (ts: string) => void;
}

type RangeOption = "6h" | "24h" | "3d" | "7d";

export default function ReplayControls({ onSnapshotData, onTimestamp }: ReplayControlsProps) {
  const [range, setRange] = useState<RangeOption>("24h");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch snapshot list when range changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPlaying(false);

    fetch(`${API_URL}/replay/list?range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSnapshots(data.snapshots || []);
        setCurrentIndex(0);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [range]);

  // Load snapshot data when index changes
  useEffect(() => {
    if (snapshots.length === 0) {
      onSnapshotData(null);
      onTimestamp("");
      return;
    }

    const snap = snapshots[currentIndex];
    if (!snap) return;

    onTimestamp(snap.timestamp);

    fetch(`${API_URL}/replay/snapshot/${snap.date}/${snap.hour}`)
      .then((r) => r.json())
      .then((data) => {
        onSnapshotData({
          hotspots: data.hotspots,
          incidents: data.incidents,
        });
      })
      .catch(() => {
        // ignore
      });
  }, [currentIndex, snapshots, onSnapshotData, onTimestamp]);

  // Playback timer
  useEffect(() => {
    if (playing && snapshots.length > 1) {
      playTimerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= snapshots.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [playing, snapshots.length]);

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIndex(Number(e.target.value));
    setPlaying(false);
  }, []);

  const stepBack = useCallback(() => {
    setPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const stepForward = useCallback(() => {
    setPlaying(false);
    setCurrentIndex((prev) => Math.min(snapshots.length - 1, prev + 1));
  }, [snapshots.length]);

  const currentSnap = snapshots[currentIndex];
  const timeLabel = currentSnap
    ? new Date(currentSnap.timestamp).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "--";

  return (
    <div className={styles.container}>
      <div className={styles.rangeRow}>
        {(["6h", "24h", "3d", "7d"] as RangeOption[]).map((r) => (
          <button
            key={r}
            className={`${styles.rangeBtn} ${range === r ? styles.active : ""}`}
            onClick={() => setRange(r)}
          >
            {r}
          </button>
        ))}
      </div>

      <div className={styles.sliderRow}>
        <button className={styles.controlBtn} onClick={stepBack} disabled={currentIndex === 0}>
          &#9664;&#9664;
        </button>
        <button
          className={styles.controlBtn}
          onClick={() => setPlaying(!playing)}
          disabled={snapshots.length < 2}
        >
          {playing ? "\u23F8" : "\u25B6"}
        </button>
        <button
          className={styles.controlBtn}
          onClick={stepForward}
          disabled={currentIndex >= snapshots.length - 1}
        >
          &#9654;&#9654;
        </button>

        <input
          type="range"
          className={styles.slider}
          min={0}
          max={Math.max(0, snapshots.length - 1)}
          value={currentIndex}
          onChange={handleSlider}
          disabled={snapshots.length < 2}
        />

        <span className={styles.timestamp}>
          {loading ? "Loading..." : timeLabel}
        </span>
      </div>

      <div className={styles.info}>
        {snapshots.length === 0 && !loading
          ? "No snapshots available for this range"
          : `${currentIndex + 1} / ${snapshots.length} snapshots`}
      </div>
    </div>
  );
}
