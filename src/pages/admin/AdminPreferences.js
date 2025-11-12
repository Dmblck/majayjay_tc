import React, { useState, useEffect } from "react";

export default function AdminPreferences() {
  const [rankedPrefs, setRankedPrefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [userFetchError, setUserFetchError] = useState(false);

  // Fetch user preferences
  useEffect(() => {
    fetch("http://localhost:5000/api/users", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          setUserFetchError(true);
          setLoading(false);
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // Ensure users is always an array
        const users = Array.isArray(data) ? data : data.users || [];

        const counts = {};
        users.forEach((user) => {
          if (user.preferences && user.preferences.length) {
            user.preferences.forEach((pref) => {
              counts[pref] = (counts[pref] || 0) + 1;
            });
          }
        });

        const ranked = Object.entries(counts)
          .map(([preference, count]) => ({ preference, count }))
          .sort((a, b) => b.count - a.count);

        setRankedPrefs(ranked);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        setUserFetchError(true);
        setLoading(false);
      });
  }, []);

  // Fetch ML model metrics
  useEffect(() => {
    setMetricsLoading(true);
    fetch("http://localhost:5000/api/train_model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMetrics({
            precision: data.precision.toFixed(3),
            recall: data.recall.toFixed(3),
            f1: data.f1.toFixed(3),
          });
        }
        setMetricsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching model metrics:", err);
        setMetricsLoading(false);
      });
  }, []);

  return (
    <div
      style={{
        marginLeft: 220,
        padding: 30,
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(180deg, #f4faf4 0%, #ffffff 100%)",
        minHeight: "100vh",
        color: "#2f3e2f",
        transition: "all 0.3s ease",
      }}
    >
      <h2
        style={{
          fontSize: "2rem",
          color: "#2b593f",
          marginBottom: "15px",
          textShadow: "1px 1px 2px rgba(43, 89, 63, 0.2)",
          fontWeight: 700,
        }}
      >
        Most Common Preferences
      </h2>

      {/* Model Metrics */}
      {metricsLoading ? (
        <p style={{ color: "#6b8061", fontStyle: "italic" }}>
          Loading model metrics...
        </p>
      ) : metrics ? (
        <div style={{ marginBottom: "20px" }}>
          <p>
            Precision: <strong>{metrics.precision}</strong>
          </p>
          <p>
            Recall: <strong>{metrics.recall}</strong>
          </p>
          <p>
            F1 Score: <strong>{metrics.f1}</strong>
          </p>
        </div>
      ) : (
        <p style={{ color: "#6b8061", fontStyle: "italic" }}>
          No metrics available.
        </p>
      )}

      {/* Ranked Preferences Table */}
      {loading ? (
        <p style={{ color: "#6b8061", fontStyle: "italic", fontSize: "1.1rem" }}>
          Loading preferences...
        </p>
      ) : userFetchError ? (
        <p style={{ color: "red", fontStyle: "italic", fontSize: "1.1rem" }}>
          Failed to fetch users. Check backend/API or token.
        </p>
      ) : rankedPrefs.length === 0 ? (
        <p style={{ color: "#6b8061", fontStyle: "italic", fontSize: "1.1rem" }}>
          No preferences found.
        </p>
      ) : (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 6px 20px rgba(50, 100, 70, 0.1)",
            width: "80%",
            overflow: "hidden",
            transition: "transform 0.3s ease",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "1.1rem",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#7ebc85", color: "#fff" }}>
                <th style={{ padding: "16px", textAlign: "left" }}>Rank</th>
                <th style={{ padding: "16px", textAlign: "left" }}>Preference</th>
                <th style={{ padding: "16px", textAlign: "left" }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {rankedPrefs.map((item, index) => (
                <tr
                  key={item.preference}
                  style={{ backgroundColor: index % 2 === 0 ? "#f3f8f3" : "#fff" }}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>{index + 1}</td>
                  <td style={{ padding: "14px 16px" }}>{item.preference}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 500 }}>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
