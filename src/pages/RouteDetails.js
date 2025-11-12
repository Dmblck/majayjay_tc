import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import { useNavigate, useLocation } from "react-router-dom";
import "leaflet/dist/leaflet.css";

const user = JSON.parse(localStorage.getItem("user"));
console.log("Token:", user?.token);

const createColoredIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const CATEGORY_COLOR = {
  "Nature & Outdoors": "green",
  "Culture & Heritage": "yellow",
  "Farming & Agriculture": "orange",
  "Food & Drink": "blue",
  "Accommodation & Stay": "red",
};

const determineCategory = (tags = "") => {
  const t = tags.toLowerCase().split(",").map((x) => x.trim());
  if (t.some((x) => ["history", "culture", "religion", "architecture", "spiritual"].includes(x)))
    return "Culture & Heritage";
  if (t.some((x) => ["farm", "agri", "organic", "animal"].includes(x)))
    return "Farming & Agriculture";
  if (t.some((x) => ["resort", "motel", "hotel", "lodge"].includes(x)))
    return "Accommodation & Stay";
  if (t.some((x) => ["restaurant", "coffee", "food"].includes(x)))
    return "Food & Drink";
  return "Nature & Outdoors";
};

export default function RouteDetails() {
  const location = useLocation();
  const navigate = useNavigate();

  const filteredPois = location.state?.filteredPois || [];
  const startPoint = location.state?.startPoint || null;
  const routeId = location.state?.routeId || null;
  const initialPois = location.state?.filteredPois || [];
  const recommendedPois = location.state?.recommendedPois || [];

  const [userLocation, setUserLocation] = useState(startPoint);
  const [selectedPois, setSelectedPois] = useState(routeId ? [] : initialPois);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [likedPois, setLikedPois] = useState({});
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [selectedPoiDetail, setSelectedPoiDetail] = useState(null);
  const [routeSegment, setRouteSegment] = useState([]);

  const mapRef = useRef(null); // ⬅️ Added for flyTo & popup
  const watchIdRef = useRef(null);
  const ORS_API_KEY = process.env.REACT_APP_ORS_KEY;

  // ---------- Get user location ----------
  useEffect(() => {
    if (!startPoint && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 14.1461, lng: 121.5012 })
      );
    }
  }, [startPoint]);

  // ---------- Fetch route ----------
  const fetchRoute = async (start, end) => {
    try {
      const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": ORS_API_KEY,
        },
        body: JSON.stringify({
          coordinates: [
            [start.lng, start.lat],
            [end.lng, end.lat],
          ],
        }),
      });
      const data = await res.json();
      return data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    } catch (err) {
      console.error("Error fetching route:", err);
      return [];
    }
  };

  // ---------- Load saved itinerary ----------
  useEffect(() => {
    const fetchSavedRoute = async () => {
      if (!routeId || !user?.token) return;
      try {
        const res = await fetch(`http://localhost:5000/api/itineraries/${routeId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await res.json();
        if (res.ok && data.itinerary?.route_data) {
          setSelectedPois(data.itinerary.route_data);
          setUserLocation(data.itinerary.startPoint || { lat: 14.1461, lng: 121.5012 });
        } else {
          alert("Could not load saved route.");
        }
      } catch (err) {
        console.error("Error fetching saved route:", err);
        alert("Error fetching saved route.");
      }
    };
    fetchSavedRoute();
  }, [routeId, user?.token]);

  // ---------- Update live route segment ----------
  useEffect(() => {
    const updateRouteSegment = async () => {
      if (!tracking || selectedPois.length === 0) return;
      const start = userLocation;
      const end = selectedPois[activeIndex];
      const route = await fetchRoute(start, end);
      setRouteSegment(route);
    };
    updateRouteSegment();
  }, [tracking, activeIndex, userLocation, selectedPois]);

  // ---------- Like / Dislike ----------
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

  // ---------- Stop tour ----------
  const stopTour = async (status = "cancelled") => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    setTracking(false);
    setActiveIndex(0);
    setSelectedPoiDetail(null);

    if (routeId) {
      try {
        await fetch(`http://localhost:5000/api/itineraries/${routeId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ status }),
        });
      } catch (err) {
        console.error("Error updating itinerary status:", err);
      }
    }
  };

  // ---------- Next stop ----------
  const handleNextStop = () => {
    if (activeIndex + 1 < selectedPois.length) {
      setActiveIndex((prev) => prev + 1);
    } else {
      stopTour("finished");
      alert("Tour finished!");
    }
  };

  // ---------- Drag and Drop ----------
  const handleDragStart = (index) => setDraggedIndex(index);
  const handleDrop = (index) => {
    if (draggedIndex === null) return;
    const items = [...selectedPois];
    const [removed] = items.splice(draggedIndex, 1);
    items.splice(index, 0, removed);
    setSelectedPois(items);
    setDraggedIndex(null);
  };

  // ---------- Save itinerary ----------
  const saveItinerary = async () => {
    if (!user || !user.token) {
      alert("You must be logged in!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/itineraries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          name: "My Route",
          route_data: selectedPois,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("Error saving itinerary:", errData);
        alert(errData.message || "Failed to save itinerary");
        return;
      }

      const data = await response.json();
      alert("Itinerary saved! ID: " + data.id);
    } catch (err) {
      console.error(err);
      alert("Server error while saving itinerary");
    }
  };

  // ---------- Click Recommended Place (fly & popup) ----------
  const handleRecommendedClick = (poi) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([poi.lat, poi.lng], 16, { duration: 1.2 });

    const popupContent = `
      <div style="text-align:center;max-width:180px">
        <h3 style="margin:4px 0">${poi.name}</h3>
        <p style="font-size:13px">${poi.description || "No description"}</p>
        ${poi.image ? `<img src="http://localhost:5000/images/${poi.image}" style="width:100%;border-radius:8px;margin-top:6px"/>` : ""}
      </div>
    `;

    L.popup()
      .setLatLng([poi.lat, poi.lng])
      .setContent(popupContent)
      .openOn(mapRef.current);
  };

  const isFinished = (index) => index < activeIndex;

  if (!userLocation) return <p>Loading route...</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 24, padding: 24 }}>
      {/* ---------- Map ---------- */}
      <div style={{ height: 650, borderRadius: 18, overflow: "hidden" }}>
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[userLocation.lat, userLocation.lng]}>
            <Popup>Your Location</Popup>
          </Marker>

          {selectedPois.map((poi, i) => (
            <Marker
              key={poi.id}
              position={[poi.lat, poi.lng]}
              icon={createColoredIcon(CATEGORY_COLOR[determineCategory(poi.tags)] || "blue")}
              opacity={isFinished(i) ? 0.3 : 1}
              eventHandlers={{ click: () => setSelectedPoiDetail(poi) }}
            >
              <Popup>
                <strong>{poi.name}</strong>
                <p>{poi.description}</p>
              </Popup>
            </Marker>
          ))}

          {tracking && routeSegment.length > 0 && <Polyline positions={routeSegment} color="blue" />}
        </MapContainer>
      </div>

      {/* ---------- Sidebar ---------- */}
      <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
        {!tracking && recommendedPois.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ color: "#1976d2" }}>Recommended for You</h2>
            {recommendedPois.map((poi) => (
              <div
                key={poi.id}
                onClick={() => handleRecommendedClick(poi)}
                style={{
                  marginBottom: 12,
                  padding: 8,
                  border: "1px solid #eee",
                  borderRadius: 6,
                  background: "#fafafa",
                  cursor: "pointer",
                }}
              >
                <strong>{poi.name}</strong>
                <p style={{ margin: 0, fontSize: 13 }}>{poi.description}</p>
              </div>
            ))}
          </div>
        )}

        {selectedPoiDetail && (
          <div style={{ marginBottom: 24 }}>
            <h3>{selectedPoiDetail.name}</h3>
            {selectedPoiDetail.image && (
              <img
                src={`http://localhost:5000/images/${selectedPoiDetail.image}`}
                alt={selectedPoiDetail.name}
                style={{ width: "100%", borderRadius: 12, marginBottom: 12 }}
              />
            )}
            <p>{selectedPoiDetail.description}</p>
            <button
              onClick={() => setSelectedPoiDetail(null)}
              style={{
                padding: 8,
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        )}

        {!tracking && (
          <>
            <h2>Selected POIs</h2>
            {selectedPois.map((poi, index) => (
              <div
                key={poi.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                style={{
                  marginBottom: 12,
                  padding: 8,
                  border: "1px solid #eee",
                  borderRadius: 6,
                  cursor: "grab",
                  background: isFinished(index) ? "#f0f0f0" : "#fafafa",
                  opacity: isFinished(index) ? 0.5 : 1,
                }}
                onClick={() => setSelectedPoiDetail(poi)}
              >
                <strong>{index + 1}. {poi.name}</strong>
                <p style={{ margin: 0, fontSize: 13 }}>{poi.description}</p>
              </div>
            ))}
            <button
              onClick={() => setTracking(true)}
              style={{
                width: "100%",
                padding: 12,
                background: "#4caf50",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 12,
              }}
            >
              Start Tour
            </button>
            <button
              onClick={saveItinerary}
              style={{
                width: "100%",
                padding: 12,
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save Route
            </button>
          </>
        )}

        {tracking && (
          <>
            <h3>Now Visiting:</h3>
            <strong>{activeIndex + 1}. {selectedPois[activeIndex]?.name}</strong>
            <p>{selectedPois[activeIndex]?.description}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => handleLike(selectedPois[activeIndex].id, 1)}
                style={{
                  flex: 1,
                  padding: 10,
                  background: likedPois[selectedPois[activeIndex]?.id] === 1 ? "#4caf50" : "#e0e0e0",
                  color: likedPois[selectedPois[activeIndex]?.id] === 1 ? "#fff" : "#000",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Like
              </button>
              <button
                onClick={() => handleLike(selectedPois[activeIndex].id, 0)}
                style={{
                  flex: 1,
                  padding: 10,
                  background: likedPois[selectedPois[activeIndex]?.id] === 0 ? "#f44336" : "#e0e0e0",
                  color: likedPois[selectedPois[activeIndex]?.id] === 0 ? "#fff" : "#000",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Dislike
              </button>
            </div>
            <button
              onClick={handleNextStop}
              style={{
                width: "100%",
                padding: 12,
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                marginTop: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Next Stop
            </button>
            <button
              onClick={() => stopTour("cancelled")}
              style={{
                width: "100%",
                padding: 12,
                background: "#f44336",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                marginTop: 10,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel Tour
            </button>
          </>
        )}

        <button
          onClick={() => navigate("/home")}
          style={{
            width: "100%",
            padding: 12,
            background: "#9e9e9e",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            marginTop: 12,
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
