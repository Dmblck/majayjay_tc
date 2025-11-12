import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [pois, setPois] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const navigate = useNavigate();
  const topPOIsRef = useRef(null); // reference for scrolling

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = user?.token;


    // Fetch POIs
    fetch("http://localhost:5000/api/pois", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPois(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));

    // Fetch Users
    fetch("http://localhost:5000/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUsersCount(Array.isArray(data) ? data.length : 0))
      .catch((err) => console.error(err));
  }, []);

  // Sort POIs by visitors
  const visitOrder = { "Very High": 4, High: 3, Moderate: 2, Low: 1 };
  const topPOIs = [...pois]
    .sort((a, b) => (visitOrder[b.visitors] || 0) - (visitOrder[a.visitors] || 0))
    .slice(0, 5);

  // Smooth scroll to the Top 5 POIs section
  const scrollToTopPOIs = () => {
    if (topPOIsRef.current) {
      topPOIsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      style={{
        marginLeft: "240px",
        padding: "30px",
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
        minHeight: "100vh",
        color: "#1e293b",
      }}
    >
      <h1
        style={{
          color: "#1d4ed8",
          fontWeight: 700,
          fontSize: "2rem",
          marginBottom: "25px",
          textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
        }}
      >
        Admin Dashboard
      </h1>

      {/* Summary Cards */}
      <div
        style={{
          display: "flex",
          gap: "25px",
          marginBottom: "35px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{ ...summaryCardStyle("#1d4ed8"), cursor: "pointer" }}
          onClick={() => navigate("/admin/users")}
        >
          <h3 style={cardTitleStyle}>Total Users</h3>
          <p style={cardValueStyle}>{usersCount}</p>
        </div>

        <div
          style={{ ...summaryCardStyle("#16a34a"), cursor: "pointer" }}
          onClick={() => navigate("/admin/pois")}
        >
          <h3 style={cardTitleStyle}>Total POIs</h3>
          <p style={cardValueStyle}>{pois.length}</p>
        </div>

        <div
          style={{ ...summaryCardStyle("#f59e0b"), cursor: "pointer" }}
          onClick={scrollToTopPOIs}
        >
          <h3 style={cardTitleStyle}>Top 5 POIs</h3>
          <p style={cardValueStyle}>{topPOIs.length}</p>
        </div>
      </div>

      {/* Top POIs Section */}
      <div
        ref={topPOIsRef}
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h2
          style={{
            color: "#1e3a8a",
            fontSize: "1.5rem",
            marginBottom: "15px",
            fontWeight: "600",
          }}
        >
          Top 5 Most Visited POIs
        </h2>

        <div style={{ marginBottom: "15px" }}>
          {topPOIs.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {topPOIs.map((poi, i) => (
                <li
                  key={poi.id}
                  style={{
                    background: i % 2 === 0 ? "#f9fafb" : "#f3f4f6",
                    padding: "10px 15px",
                    borderRadius: "6px",
                    marginBottom: "6px",
                    fontSize: "1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#334155",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    #{i + 1} {poi.name}
                  </span>
                  <span
                    style={{
                      background:
                        poi.visitors === "Very High"
                          ? "#dc2626"
                          : poi.visitors === "High"
                          ? "#f97316"
                          : poi.visitors === "Moderate"
                          ? "#facc15"
                          : "#16a34a",
                      color: "#fff",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "0.9rem",
                    }}
                  >
                    {poi.visitors}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#6b7280" }}>No POI data available.</p>
          )}
        </div>

        {/* Map */}
        <MapContainer
          center={[14.1467, 121.4708]}
          zoom={13}
          style={{
            height: "420px",
            width: "100%",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {topPOIs.map((poi) => (
            <Marker key={poi.id} position={[poi.lat, poi.lng]}>
              <Popup>
                <strong>{poi.name}</strong>
                <br />
                {poi.description}
                <br />
                Visitors: {poi.visitors}
                <br />
                Tags: {poi.tags}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

// Style helpers
const summaryCardStyle = (bgColor) => ({
  flex: "1",
  padding: "25px 20px",
  background: bgColor,
  color: "#fff",
  borderRadius: "12px",
  boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
  textAlign: "center",
  minWidth: "220px",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
});

const cardTitleStyle = {
  fontSize: "1.1rem",
  marginBottom: "10px",
  opacity: 0.9,
  fontWeight: 500,
};

const cardValueStyle = {
  fontSize: "2.2rem",
  fontWeight: "700",
  margin: 0,
};
