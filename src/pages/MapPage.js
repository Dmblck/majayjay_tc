import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const createColoredIcon = (color) =>
  new L.Icon({
    iconUrl: `https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const CENTER = { lat: 14.1467, lng: 121.4708 };

const CATEGORY_COLOR = {
  "Nature & Outdoors": "green",
  "Culture & Heritage": "yellow",
  "Farming & Agriculture": "orange",
  "Food & Drink": "blue",
  "Accommodation & Stay": "red",
};

export default function MapPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [likedPois, setLikedPois] = useState({});
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [visibleCategories, setVisibleCategories] = useState(
    Object.keys(CATEGORY_COLOR).reduce((acc, cat) => {
      acc[cat] = true;
      return acc;
    }, {})
  );
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSpots = () => {
    fetch("http://localhost:5000/api/pois")
      .then((res) => res.json())
      .then((data) => {
        const rows = data
          .filter((r) => r.name && r.lat && r.lng)
          .map((r) => {
            const tags = r.tags ? r.tags.split(",").map((t) => t.trim()) : [];
            let category = "Nature & Outdoors";
            if (
              tags.some((t) =>
                ["history", "culture", "religion", "architecture", "spiritual"].includes(
                  t
                )
              )
            ) {
              category = "Culture & Heritage";
            } else if (
              tags.some((t) => ["farm", "agri", "organic", "animal"].includes(t))
            ) {
              category = "Farming & Agriculture";
            } else if (
              tags.some((t) => ["resort", "motel", "hotel", "lodge"].includes(t))
            ) {
              category = "Accommodation & Stay";
            } else if (tags.some((t) => ["restaurant", "coffee", "food"].includes(t))) {
              category = "Food & Drink";
            }

            return {
              id: r.id,
              name: r.name,
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lng),
              description: r.description || "No description available",
              visitors: r.visitors || "Moderate",
              tags,
              image: r.image
                ? `/images/${r.image.replace(/^\/+/, "").split("/").pop()}`
                : null,
              likes: r.likes || 0,
              dislikes: r.dislikes || 0,
              category,
            };
          });
        setSpots(rows);
      })
      .catch((err) => console.error("Error fetching spots:", err));
  };

  useEffect(() => {
    fetchSpots();
  }, []);

  const handleLike = async (poiId, liked) => {
    try {
      const token = user?.token;
      if (!token) return;

      const response = await fetch("http://localhost:5000/api/user_feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ poi_id: poiId, liked }),
      });

      const data = await response.json();
      if (data.success) setLikedPois((prev) => ({ ...prev, [poiId]: liked }));
    } catch (err) {
      console.error("Error sending feedback:", err);
    }
  };

  const toggleCategory = (category) => {
    setVisibleCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const filteredSpots = spots.filter((spot) => {
    const matchesSearch =
      spot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spot.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const renderLegend = () => (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        background: "rgba(255, 255, 255, 0.9)",
        padding: "10px 14px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 1000,
        fontSize: "0.85rem",
        color: "#333",
        cursor: "pointer",
      }}
    >
      <strong>Legend</strong>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 6 }}>
        {Object.entries(CATEGORY_COLOR).map(([category, color]) => (
          <li
            key={category}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 4,
              opacity: visibleCategories[category] ? 1 : 0.4,
            }}
            onClick={() => toggleCategory(category)}
          >
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                backgroundColor: color,
                marginRight: 8,
                borderRadius: 4,
                border: "1px solid #00000033",
              }}
            ></span>
            {category}
          </li>
        ))}
      </ul>
      <small style={{ display: "block", marginTop: 6 }}>Click to toggle</small>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "90vh", width: "100%", position: "relative" }}>
      {/* Centered Search Box */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          width: 360,
          background: "white",
          padding: "12px 16px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <input
          type="text"
          value={searchTerm}
          placeholder="Search POIs by name or tag"
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            outline: "none",
            fontSize: "0.95rem",
          }}
        />
      </div>

      <div style={{ flex: 1 }}>
        <MapContainer
          center={filteredSpots.length ? [filteredSpots[0].lat, filteredSpots[0].lng] : [CENTER.lat, CENTER.lng]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM contributors</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredSpots
            .filter((spot) => visibleCategories[spot.category])
            .map((spot) => (
              <Marker
                key={spot.id}
                position={[spot.lat, spot.lng]}
                icon={createColoredIcon(CATEGORY_COLOR[spot.category] || "blue")}
                eventHandlers={{ click: () => setSelectedSpot(spot) }}
              />
            ))}

          {renderLegend()}
        </MapContainer>
      </div>
{selectedSpot && (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      right: 0,
      width: "40%",
      maxHeight: "100vh",
      background: "#fff",
      padding: "20px",
      overflowY: "auto",
      borderLeft: "2px solid #e5e7eb",
      boxShadow: "-3px 0 8px rgba(0,0,0,0.1)",
      animation: "fadeIn 0.4s ease-in-out",
      zIndex: 1000,
    }}
    className="poi-sidebar"
  >
    <button
      onClick={() => setSelectedSpot(null)}
      style={{
        float: "right",
        background: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: "6px",
        padding: "6px 12px",
        cursor: "pointer",
        fontWeight: "bold",
      }}
    >
      Close
    </button>

    {selectedSpot.image && (
      <img
        src={selectedSpot.image}
        alt={selectedSpot.name}
        style={{
          width: "100%",
          height: "280px",
          objectFit: "cover",
          borderRadius: "12px",
          marginBottom: "18px",
          transition: "transform 0.3s ease",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
      />
    )}

    <h2 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "10px", color: "#1f2937" }}>
      {selectedSpot.name}
    </h2>

    <p style={{ fontSize: "1rem", color: "#374151", marginBottom: "12px" }}>
      <strong>Visitors:</strong> {selectedSpot.visitors}
    </p>

    <p style={{ fontSize: "1rem", color: "#4b5563", lineHeight: "1.6", marginBottom: "14px" }}>
      {selectedSpot.description}
    </p>

    {selectedSpot.tags.length > 0 && (
      <p style={{ marginTop: "12px", padding: "10px", background: "#f3f4f6", borderRadius: "6px", fontSize: "0.95rem", color: "#374151" }}>
        <strong>Tags:</strong> {selectedSpot.tags.join(", ")}
      </p>
    )}

    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
      <button
        onClick={() => handleLike(selectedSpot.id, 1)}
        style={{
          flex: 1,
          padding: 10,
          background: likedPois[selectedSpot?.id] === 1 ? "#4caf50" : "#e0e0e0",
          color: likedPois[selectedSpot?.id] === 1 ? "#fff" : "#000",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        👍 Like
      </button>

      <button
        onClick={() => handleLike(selectedSpot.id, 0)}
        style={{
          flex: 1,
          padding: 10,
          background: likedPois[selectedSpot?.id] === 0 ? "#f44336" : "#e0e0e0",
          color: likedPois[selectedSpot?.id] === 0 ? "#fff" : "#000",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        👎 Dislike
      </button>
    </div>
  </div>
)}

      <style>
        {`
            @media screen and (max-width: 768px) {
      .poi-sidebar {
        width: 100% !important;
        max-height: 50vh !important;
        border-left: none !important;
        border-top: 2px solid #e5e7eb;
        bottom: 0 !important;
        right: 0 !important;
        left: 0 !important;
        border-radius: 12px 12px 0 0;
      }
    }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}
      </style>
    </div>
  );
}
