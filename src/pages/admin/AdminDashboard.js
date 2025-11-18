import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminDashboard() {
  const [pois, setPois] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const navigate = useNavigate();
  const chartRef = useRef(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = user?.token;

    // Fetch users count
    fetch("http://localhost:5000/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setUsersCount(Array.isArray(data) ? data.length : 0))
      .catch(err => console.error(err));

    // Fetch most liked POIs
    fetch("http://localhost:5000/api/pois/most-liked", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setPois(Array.isArray(data.mostLiked) ? data.mostLiked : []))
      .catch(err => console.error(err));
  }, []);

  const topPOIs = pois.slice(0, 5);

  const scrollToChart = () => {
    if (chartRef.current) {
      chartRef.current.scrollIntoView({ behavior: "smooth" });
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

      {/* Summary cards */}
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
          onClick={scrollToChart}
        >
          <h3 style={cardTitleStyle}>Top 5 Liked POIs</h3>
          <p style={cardValueStyle}>{topPOIs.length}</p>
        </div>
      </div>

      {/* Top 5 Most Liked POIs - Bar Chart */}
      <div
        ref={chartRef}
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
          marginBottom: "30px",
        }}
      >
        <h2
          style={{
            color: "#1e3a8a",
            fontSize: "1.5rem",
            marginBottom: "20px",
            fontWeight: "600",
          }}
        >
          Top 5 Most Liked POIs
        </h2>

        {topPOIs.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topPOIs} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total_likes" fill="#1d4ed8" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: "#6b7280" }}>No POI data available.</p>
        )}
      </div>

      {/* Map */}
      <div
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
            marginBottom: "20px",
            fontWeight: "600",
          }}
        >
          POI Map
        </h2>

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
          {topPOIs.map(poi => (
            <Marker key={poi.id} position={[poi.lat, poi.lng]}>
              <Popup>
                <strong>{poi.name}</strong>
                <br />
                {poi.description}
                <br />
                Likes: {poi.total_likes}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

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
