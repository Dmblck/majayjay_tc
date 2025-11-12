import React, { useEffect, useState } from "react";

export default function NatureCulturePage() {
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/pois")
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter(
          (p) =>
            p.tags?.toLowerCase().includes("nature") ||
            p.tags?.toLowerCase().includes("culture")
        );
        setPlaces(filtered);
      })
      .catch((err) => console.error("Error fetching places:", err));
  }, []);

  return (
    <div
      style={{
        padding: "40px",
        minHeight: "100vh",
        background:
          "linear-gradient(to bottom right, #f7f9fb, #e8f0ff)",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <h1
        style={{
          marginBottom: "30px",
          fontSize: "2.2rem",
          fontWeight: "700",
          color: "#2c3e50",
          textAlign: "center",
          letterSpacing: "1px",
        }}
      >
        Nature & Culture Spots
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {places.map((p, i) => (
          <div
            key={i}
            onClick={() => setSelectedPlace(p)}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: "18px",
              overflow: "hidden",
              background: "#fff",
              boxShadow:
                "0 4px 12px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow =
                "0 8px 20px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(0,0,0,0.08)";
            }}
          >
            {p.image ? (
              <img
                src={`/images/${p.image}`}
                alt={p.name}
                style={{
                  height: "200px",
                  width: "100%",
                  objectFit: "cover",
                  transition: "transform 0.3s ease",
                }}
              />
            ) : (
              <div
                style={{
                  height: "200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f0f0f0",
                  color: "#888",
                  fontSize: "0.95rem",
                }}
              >
                No image
              </div>
            )}
            <div style={{ padding: "16px" }}>
              <h3
                style={{
                  fontWeight: "600",
                  marginBottom: "6px",
                  color: "#34495e",
                }}
              >
                {p.name}
              </h3>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#7f8c8d",
                  textTransform: "capitalize",
                }}
              >
                {p.tags}
              </p>
            </div>
          </div>
        ))}
      </div>

      {selectedPlace && (
        <div
          onClick={() => setSelectedPlace(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,0.95)",
              borderRadius: "20px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
              animation: "scaleIn 0.3s ease",
            }}
          >
            {selectedPlace.image && (
              <img
                src={`/images/${selectedPlace.image}`}
                alt={selectedPlace.name}
                style={{
                  width: "100%",
                  height: "320px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  marginBottom: "18px",
                }}
              />
            )}
            <h2
              style={{
                fontSize: "1.6rem",
                fontWeight: "700",
                marginBottom: "10px",
                color: "#2c3e50",
              }}
            >
              {selectedPlace.name}
            </h2>
            <p
              style={{
                color: "#95a5a6",
                marginBottom: "14px",
                fontSize: "0.95rem",
              }}
            >
              {selectedPlace.tags}
            </p>
            <p
              style={{
                marginBottom: "14px",
                lineHeight: "1.6",
                color: "#555",
                fontSize: "0.95rem",
              }}
            >
              {selectedPlace.description || "No description available"}
            </p>
            <p style={{ color: "#777" }}>
              <strong>Visitors:</strong>{" "}
              {selectedPlace.visitors || "Not available"}
            </p>
            <button
              onClick={() => setSelectedPlace(null)}
              style={{
                marginTop: "20px",
                padding: "10px 24px",
                background: "#3498db",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "500",
                letterSpacing: "0.5px",
                transition: "background 0.25s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#2980b9")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#3498db")
              }
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
