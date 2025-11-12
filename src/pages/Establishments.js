import React, { useEffect, useState } from "react";

export default function EstablishmentsPage() {
  const [lodgings, setLodgings] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/pois")
      .then((res) => res.json())
      .then((data) => {
        const rows = data.map((r) => ({
          ...r,
          image: r.image ? `/images/${r.image}` : null,
          tags: r.tags ? r.tags.toLowerCase() : "",
        }));

        const lodgingsFiltered = rows.filter(
          (r) =>
            r.tags.includes("resort") ||
            r.tags.includes("lodge") ||
            r.tags.includes("motel") ||
            r.tags.includes("hotel")
        );

        const restaurantsFiltered = rows.filter(
          (r) =>
            r.tags.includes("restaurant") ||
            r.tags.includes("coffee") ||
            r.tags.includes("cafe")
        );

        setLodgings(lodgingsFiltered);
        setRestaurants(restaurantsFiltered);
      })
      .catch((err) => console.error("Error fetching POIs:", err));
  }, []);

  const renderCards = (items) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "25px",
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "20px",
            overflow: "hidden",
            backgroundColor: "#ffffff",
            boxShadow: "0 6px 15px rgba(0, 0, 0, 0.08)",
            transition: "transform 0.25s ease, box-shadow 0.25s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-5px)";
            e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 15px rgba(0,0,0,0.08)";
          }}
          onClick={() => setSelectedItem(item)}
        >
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              style={{
                width: "100%",
                height: "200px",
                objectFit: "cover",
                transition: "transform 0.4s ease",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "200px",
                background: "linear-gradient(135deg, #e0e7ff, #fef3c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b7280",
                fontWeight: "500",
              }}
            >
              No image available
            </div>
          )}
          <div style={{ padding: "20px" }}>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "8px",
              }}
            >
              {item.name}
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "#4b5563",
                marginBottom: "8px",
              }}
            >
              {item.description?.length > 100
                ? item.description.slice(0, 100) + "..."
                : item.description}
            </p>
            {item.visitors && (
              <p
                style={{
                  fontSize: "13px",
                  color: "#2563eb",
                  fontWeight: "500",
                }}
              >
                Visitors: {item.visitors}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderModal = () => {
    if (!selectedItem) return null;
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        onClick={() => setSelectedItem(null)}
      >
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "20px",
            padding: "35px",
            maxWidth: "600px",
            width: "90%",
            maxHeight: "85%",
            overflowY: "auto",
            position: "relative",
            boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
            animation: "fadeIn 0.3s ease-in-out",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setSelectedItem(null)}
            style={{
              position: "absolute",
              top: "15px",
              right: "15px",
              border: "none",
              background: "none",
              fontSize: "22px",
              cursor: "pointer",
              color: "#9ca3af",
            }}
          >
            ×
          </button>
          {selectedItem.image && (
            <img
              src={selectedItem.image}
              alt={selectedItem.name}
              style={{
                width: "100%",
                borderRadius: "10px",
                marginBottom: "20px",
                objectFit: "cover",
                maxHeight: "300px",
              }}
            />
          )}
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#111827",
              marginBottom: "10px",
            }}
          >
            {selectedItem.name}
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#4b5563",
              marginBottom: "15px",
              lineHeight: "1.6",
            }}
          >
            {selectedItem.description}
          </p>
          {selectedItem.visitors && (
            <p style={{ color: "#2563eb", fontWeight: "600" }}>
              Visitors: {selectedItem.visitors}
            </p>
          )}
          {selectedItem.tags && (
            <p style={{ color: "#6b7280", marginTop: "8px" }}>
              Tags: {selectedItem.tags}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        padding: "40px",
        background: "linear-gradient(to bottom, #f9fafb, #eef2ff)",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: "32px",
          fontWeight: "bold",
          color: "#1e3a8a",
          marginBottom: "25px",
          textAlign: "center",
        }}
      >
        Establishments
      </h1>

      <section style={{ marginBottom: "50px" }}>
        <h2
          style={{
            fontSize: "22px",
            fontWeight: "700",
            color: "#334155",
            marginBottom: "15px",
          }}
        >
          Lodgings
        </h2>
        {lodgings.length > 0 ? renderCards(lodgings) : <p>No lodgings found.</p>}
      </section>

      <section>
        <h2
          style={{
            fontSize: "22px",
            fontWeight: "700",
            color: "#334155",
            marginBottom: "15px",
          }}
        >
          Restaurants
        </h2>
        {restaurants.length > 0 ? (
          renderCards(restaurants)
        ) : (
          <p>No restaurants found.</p>
        )}
      </section>

      {renderModal()}
    </div>
  );
}
