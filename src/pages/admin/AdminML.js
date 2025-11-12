import React, { useState } from "react";

export default function AdminML() {
  const [training, setTraining] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [topPreferences, setTopPreferences] = useState([]);

  const startTraining = async () => {
    setTraining(true);

    try {
      // Call train_model endpoint (proxy handles the port)
      const res = await fetch("http://127.0.0.1:5000/api/train_model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      setLastRun(new Date().toLocaleString());

      if (data.success) {
        setMetrics({
          precision: data.precision?.toFixed(3),
          recall: data.recall?.toFixed(3),
          f1: data.f1?.toFixed(3),
          precision_at_k: data.precision_at_k?.toFixed(3),
          recall_at_k: data.recall_at_k?.toFixed(3),
        });

        // Fetch top preferences (optional)
        try {
          const userRes = await fetch("/api/users");
          const userData = await userRes.json();
          const users = userData.users || [];
          const counts = {};

          users.forEach((user) => {
            if (user.preferences && user.preferences.length) {
              user.preferences.forEach((pref) => {
                counts[pref] = (counts[pref] || 0) + 1;
              });
            }
          });

          const ranked = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([pref]) => pref)
            .slice(0, 10);

          setTopPreferences(ranked);
        } catch (err) {
          console.error("Error fetching top preferences:", err);
          setTopPreferences([]);
        }
      }
    } catch (err) {
      console.error("ML Training error:", err);
      alert(
        "Failed to train model. Make sure the backend Flask server is running."
      );
    } finally {
      setTraining(false);
    }
  };

  return (
    <div
      style={{
        marginLeft: "240px",
        padding: "30px",
        fontFamily: "Segoe UI, sans-serif",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          maxWidth: "800px",
          margin: "auto",
        }}
      >
        <h2
          style={{
            marginBottom: "20px",
            color: "#1e3a8a",
            fontSize: "28px",
            fontWeight: "700",
          }}
        >
          Machine Learning Module
        </h2>

        <button
          onClick={startTraining}
          disabled={training}
          style={{
            backgroundColor: training ? "#9ca3af" : "#2563eb",
            color: "#fff",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: training ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
        >
          {training ? "Training in progress..." : "Train Model"}
        </button>

        {lastRun && (
          <p style={{ fontSize: "16px", color: "#374151", marginTop: "20px" }}>
            <strong>Last trained:</strong> {lastRun}
          </p>
        )}

        {metrics && (
          <div style={{ marginTop: "10px" }}>
            <p>
              <strong>Precision:</strong> {metrics.precision}
            </p>
            <p>
              <strong>Recall:</strong> {metrics.recall}
            </p>
            <p>
              <strong>F1 Score:</strong> {metrics.f1}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
