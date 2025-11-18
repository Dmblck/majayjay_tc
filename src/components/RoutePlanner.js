import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tagCategories } from "../tags"; // <-- import organized tags

const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJhNWU3NmIxOTRmMzQyYTg4NzY4MDc2MzVmZDY1ZDRhIiwiaCI6Im11cm11cjY0In0=";

export default function RoutePlanner() {
  const navigate = useNavigate();
  const [pois, setPois] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [mode, setMode] = useState("car");
  const [recommendedPois, setRecommendedPois] = useState([]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);

    fetch("http://localhost:5000/api/pois")
      .then((res) => res.json())
      .then((data) => {
        setPois(data);
      })
      .catch((err) => console.error(err));

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => setUserLocation({ lat: 14.1461, lng: 121.5012 })
      );
    } else setUserLocation({ lat: 14.1461, lng: 121.5012 });
  }, []);

  useEffect(() => {
    if (!user) return;

    fetch("http://127.0.0.1:5000/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    })
      .then((res) => res.json())
      .then((data) => setRecommendedPois(data))
      .catch((err) =>
        console.error("Failed to fetch recommendations:", err)
      );
  }, [user]);

  const toggleCategory = (tag) => {
    setSelectedCategories((prev) =>
      prev.includes(tag) ? prev.filter((c) => c !== tag) : [...prev, tag]
    );
  };

  const planRoute = () => {
    if (!userLocation) return alert("Waiting for location...");

    let filtered = pois;
    if (selectedCategories.length) {
      filtered = pois.filter((poi) =>
        selectedCategories.some((cat) =>
          poi.tags?.toLowerCase().includes(cat.toLowerCase())
        )
      );
    }
    if (!filtered.length) filtered = pois;

    navigate("/routedetails", {
      state: {
        startPoint: userLocation,
        filteredPois: filtered,
        transportMode:
          mode === "foot"
            ? "foot-walking"
            : mode === "bike"
            ? "cycling-regular"
            : "driving-car",
        recommendedPois: filteredRecommended,
      },
    });

    setShowPopup(false);
  };

  const filteredRecommended = selectedCategories.length
    ? recommendedPois.filter((poi) =>
        selectedCategories.some((cat) =>
          poi.tags?.toLowerCase().includes(cat.toLowerCase())
        )
      )
    : recommendedPois;

  return (
    <div style={{ textAlign: "center", marginTop: 40 }}>
      {recommendedPois.length > 0 && (
        <div style={{ marginBottom: 40, padding: "0 20px" }}>
          <h2 style={{ color: "#1976d2", marginBottom: 16 }}>
            Places You Might Like
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {recommendedPois.map((poi) => (
              <div
                key={poi.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "left",
                  background: "#fafafa",
                  cursor: "pointer",
                }}
              >
                <strong>{poi.name}</strong>
                <p style={{ fontSize: 14 }}>{poi.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setShowPopup(true)}
        style={{
          padding: "14px 28px",
          background: "#1976d2",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 18,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        Plan My Route
      </button>
      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 30,
              borderRadius: 14,
              width: 450,
              maxHeight: "85vh",
              overflowY: "auto",
              textAlign: "center",
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
            }}
          >
            <h2 style={{ marginBottom: 16, color: "#1976d2" }}>
              Select POI Categories
            </h2>
            <div
              style={{
                textAlign: "left",
                maxHeight: "200px",
                overflowY: "auto",
                marginBottom: 20,
              }}
            >
              {Object.entries(tagCategories).map(([category, categoryTags]) => (
                <div key={category} style={{ marginBottom: 16 }}>
                  <h4 style={{ margin: "6px 0", color: "#1976d2" }}>{category}</h4>
                  {categoryTags.map((tag) => (
                    <label
                      key={tag}
                      style={{ display: "block", marginBottom: 6, fontSize: 16 }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(tag)}
                        onChange={() => toggleCategory(tag)}
                        style={{ marginRight: 6 }}
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 16 }}>
                Transport Mode:{" "}
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  style={{ padding: 6, marginLeft: 8 }}
                >
                  <option value="foot">On Foot</option>
                  <option value="bike">Bike</option>
                  <option value="motor">Motor</option>
                  <option value="car">Car</option>
                </select>
              </label>
            </div>
            {filteredRecommended.length > 0 && (
              <div style={{ marginBottom: 20, textAlign: "left" }}>
                <h3 style={{ color: "#1976d2", marginBottom: 8 }}>
                  You Might Also Like
                </h3>
                  {filteredRecommended.map((poi) => (
                    <div
                      key={poi.id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 8,
                        padding: 8,
                        marginBottom: 6,
                        background: "#f9f9f9",
                        textAlign: "left",
                      }}
                    >
                      <strong>{poi.name}</strong>
                      <p style={{ fontSize: 13, margin: "4px 0" }}>{poi.description}</p>
                      {poi.image && (
                        <img
                          src={`http://localhost:5000/images/${poi.image}`}
                          alt={poi.name}
                          style={{
                            width: "100%",
                            maxHeight: 120,
                            objectFit: "cover",
                            borderRadius: 6,
                            marginBottom: 4,
                          }}
                        />
                      )}
                      <p style={{ fontSize: 12, margin: "2px 0" }}>
                        Visitors: {poi.visitors || 0}
                      </p>
                      <p style={{ fontSize: 12, margin: "2px 0", fontWeight: "bold" }}>
                        Category: {poi.category || "Uncategorized"}
                      </p>
                      <button
                        onClick={() => {
                          setShowPopup(false);
                          navigate("/routedetails", {
                            state: { startPoint: userLocation, filteredPois: [poi], transportMode: mode },
                          });
                        }}
                        style={{
                          marginTop: 6,
                          padding: "6px 12px",
                          fontSize: 13,
                          background: "#1976d2",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                      >
                        View on Map
                      </button>
                    </div>
                  ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={planRoute}
                style={{
                  padding: "10px 24px",
                  background: "#4caf50",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 16,
                  flex: 1,
                  marginRight: 10,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                }}
              >
                Confirm
              </button>
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  padding: "10px 24px",
                  background: "#f44336",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 16,
                  flex: 1,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
