import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "60vh",
};

const DEFAULT_CENTER = { lat: 14.1467, lng: 121.4708 };

export default function RoutePlanner() {
  const [spots, setSpots] = useState([]);
  const [recs, setRecs] = useState([]);
  const [lastFetched, setLastFetched] = useState(null);

  const { isLoaded } = useJsApiLoader({

    googleMapsApiKey: "AIzaSyA6D72kCqt2yln8Yhfg0Y0iE25F0ndZtO4",
  });

  useEffect(() => {
    Papa.parse("/spots.csv", {
      download: true,
      header: true,
      complete: (res) => {
        const cleaned = res.data
          .filter(r => r && r.latitude && r.longitude && r.name)
          .map(r => ({
            id: r.id || r.name,
            name: r.name,
            type: (r.type || "").toLowerCase(),
            lat: Number(r.latitude || r.latitude),
            lng: Number(r.longitude || r.longitude),
            description: r.description || "",
          }));
        setSpots(cleaned);
        setLastFetched(new Date().toLocaleString());
      },
      error: () => {
        setSpots([]);
      }
    });
  }, []);

  const timeNow = useMemo(() => new Date().getHours(), [lastFetched]);

  function recommendByTime() {
    const hr = new Date().getHours();
    // simple mapping
    let wanted = "falls";
    if (hr >= 11 && hr <= 14) wanted = "restaurant";
    else if (hr >= 15) wanted = "accommodation";
    else if (hr >= 5 && hr <= 10) wanted = "falls";
    else wanted = "restaurant"; // night default to food (or change)

    const filtered = spots.filter(s => s.type === wanted);
    // if none found, fallback to nearest / any popular
    const results = filtered.length ? filtered : spots.slice(0, 5);
    setRecs(results);
  }

  return (
    <div>
      <div style={{ marginBottom: 10, display: "flex", gap: 8 }}>
        <button onClick={recommendByTime} style={{ padding: "8px 12px", background: "#0ea5e9", color: "#fff", border: 0, borderRadius: 6 }}>
          📍 Get Recommendations
        </button>
        <button onClick={() => setRecs([])} style={{ padding: "8px 12px", background: "#e2e8f0", border: 0, borderRadius: 6 }}>
          Clear
        </button>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#475569" }}>
          CSV loaded: {spots.length} spots
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Recommended now</strong>
        <div style={{ color: "#6b7280", fontSize: 13 }}>{(new Date()).toLocaleString()}</div>
      </div>

      <div style={{ marginBottom: 10 }}>
        {recs.length === 0 && <div style={{ color: "#6b7280" }}>No recommendations yet — click the button.</div>}
        {recs.length > 0 && (
          <ul style={{ paddingLeft: 16 }}>
            {recs.map(r => (
              <li key={r.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{r.description}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ borderRadius: 8, overflow: "hidden" }}>
        {isLoaded ? (
          <GoogleMap mapContainerStyle={containerStyle} center={DEFAULT_CENTER} zoom={13}>
            {/* show all spots as light markers */}
            {spots.map(s => (
              <Marker key={s.id + "-all"} position={{ lat: s.lat, lng: s.lng }} />
            ))}

            {/* highlight recs with a different marker icon (default marker used here) */}
            {recs.map(r => (
              <Marker key={r.id + "-rec"} position={{ lat: r.lat, lng: r.lng }} />
            ))}
          </GoogleMap>
        ) : (
          <div style={{ padding: 24 }}>Loading map...</div>
        )}
      </div>
    </div>
  );
}
