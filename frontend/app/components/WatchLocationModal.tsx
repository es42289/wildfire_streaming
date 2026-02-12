"use client";

import { useState, useEffect } from "react";
import styles from "./WatchLocationModal.module.css";

const API_URL = "https://0lzyt3z6r5.execute-api.us-east-1.amazonaws.com";
const RADIUS_OPTIONS = [5, 10, 25, 50];

interface WatchLocationModalProps {
  open: boolean;
  onClose: () => void;
  onPickOnMap: () => void;
  pickedCoords: { lat: number; lon: number } | null;
}

export default function WatchLocationModal({
  open,
  onClose,
  onPickOnMap,
  pickedCoords,
}: WatchLocationModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [radius, setRadius] = useState(10);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const [searching, setSearching] = useState(false);

  // Apply picked coords from map
  useEffect(() => {
    if (pickedCoords) {
      setLat(pickedCoords.lat.toFixed(5));
      setLon(pickedCoords.lon.toFixed(5));
    }
  }, [pickedCoords]);

  if (!open) return null;

  const handleSearch = async () => {
    if (!address.trim()) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
      );
      const data = await res.json();
      if (data.length === 0) {
        setError("Address not found. Try a different search or pick on map.");
        return;
      }
      setLat(Number(data[0].lat).toFixed(5));
      setLon(Number(data[0].lon).toFixed(5));
    } catch {
      setError("Geocoding failed. Try picking on map instead.");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) { setError("Name is required"); return; }
    if (!lat || !lon) { setError("Coordinates are required — search an address or pick on map"); return; }
    const latN = Number(lat);
    const lonN = Number(lon);
    if (isNaN(latN) || latN < -90 || latN > 90) { setError("Invalid latitude"); return; }
    if (isNaN(lonN) || lonN < -180 || lonN > 180) { setError("Invalid longitude"); return; }
    if (!email.trim() || !email.includes("@")) { setError("Valid email is required"); return; }

    setState("loading");
    try {
      const res = await fetch(`${API_URL}/alerts/watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          lat: latN,
          lon: lonN,
          radius_miles: radius,
          email: email.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.errors?.join(", ") || "Something went wrong");
        setState("idle");
        return;
      }
      setState("success");
    } catch {
      setError("Network error — please try again");
      setState("idle");
    }
  };

  const handleClose = () => {
    setName("");
    setAddress("");
    setLat("");
    setLon("");
    setRadius(10);
    setEmail("");
    setError("");
    setState("idle");
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Watch Location</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            &times;
          </button>
        </div>

        {state === "success" ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>&#9993;</div>
            <p className={styles.successTitle}>Check Your Email</p>
            <p className={styles.successMsg}>
              We sent a verification link to <strong>{email}</strong>. Click it
              to activate alerts for <strong>{name}</strong>.
            </p>
          </div>
        ) : (
          <>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label className={styles.label}>Location Name</label>
              <input
                className={styles.input}
                placeholder="e.g. Home, Cabin, Ranch"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Address Search</label>
              <div className={styles.addressRow}>
                <input
                  className={styles.input}
                  placeholder="Search address or city..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  className={styles.searchBtn}
                  onClick={handleSearch}
                  disabled={searching}
                >
                  {searching ? "..." : "Search"}
                </button>
              </div>
            </div>

            <div className={styles.coordRow}>
              <div className={styles.field}>
                <label className={styles.label}>Latitude</label>
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  placeholder="39.8"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Longitude</label>
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  placeholder="-98.5"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                />
              </div>
            </div>

            <button className={styles.pickBtn} onClick={onPickOnMap}>
              &#9678; Pick on Map
            </button>

            <div className={styles.field}>
              <label className={styles.label}>Alert Radius</label>
              <div className={styles.radiusGroup}>
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    className={`${styles.radiusBtn} ${radius === r ? styles.active : ""}`}
                    onClick={() => setRadius(r)}
                  >
                    {r} mi
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={state === "loading"}
            >
              {state === "loading" ? "Submitting..." : "Create Watch Location"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
