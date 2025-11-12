import React, { useState, useEffect } from "react";

export default function WeatherWidget({ setWeather }) {
  const [weather, setLocalWeather] = useState("Loading...");

  useEffect(() => {
    const opts = ["Sunny", "Cloudy", "Rainy"];
    const idx = (new Date().getDate() + new Date().getMonth()) % opts.length;
    const w = opts[idx];
    setLocalWeather(w);
    if (setWeather) setWeather(w);
  }, [setWeather]);

  return (
    <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#eff6ff", border: "1px solid #e0f2fe" }}>
      <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>🌤 Weather (Majayjay)</div>
      <div style={{ marginTop: 6, color: "#475569" }}>{weather}</div>
    </div>
  );
}
