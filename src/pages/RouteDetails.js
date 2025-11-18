import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap} from "react-leaflet";
import L from "leaflet";
import { useNavigate, useLocation } from "react-router-dom";
import "leaflet/dist/leaflet.css";

function MapWrapper({ center, zoom, children, mapRefSetter }) {
  const map = useMap();
  useEffect(() => {
    if (mapRefSetter) mapRefSetter(map);
  }, [map, mapRefSetter]);
  return <>{children}</>;
}
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

const CATEGORY_COLOR = {
  "Nature & Outdoors": "green",
  "Culture & Heritage": "yellow",
  "Farming & Agriculture": "orange",
  "Food & Drink": "blue",
  "Accommodation & Stay": "red",
};

const createUserIcon = () =>
  L.divIcon({
    html: '<div style="font-weight:bold;color:white;background:#1976d2;width:25px;height:25px;display:flex;align-items:center;justify-content:center;border-radius:50%;">U</div>',
    className: "",
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  });

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
  const initialPois = location.state?.filteredPois || [];
  const recommendedPois = location.state?.recommendedPois || [];

  const [userLocation, setUserLocation] = useState(startPoint);
  const [selectedPois, setSelectedPois] = useState(initialPois);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [likedPois, setLikedPois] = useState({});
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [selectedPoiDetail, setSelectedPoiDetail] = useState(null);
  const [routeSegment, setRouteSegment] = useState([]);
  const [tourStatus, setTourStatus] = useState("not_started");
  const [routeId, setRouteId] = useState(location.state?.routeId || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const ORS_API_KEY = process.env.REACT_APP_ORS_KEY;

  const canEditRoute = tourStatus !== "finished" && tourStatus !== "cancelled";
  const handlePoiClick = (poi) => {
    setSelectedPoiDetail(poi);
    if (mapRef.current) {
      mapRef.current.flyTo([poi.lat, poi.lng], 16, { animate: true, duration: 1.2 });
    }
  };

  useEffect(() => {
    const handleStorage = () => setUser(JSON.parse(localStorage.getItem("user")));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!startPoint && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 14.1461, lng: 121.5012 })
      );
    }
  }, [startPoint]);

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

  useEffect(() => {
    const fetchSavedRoute = async () => {
      if (!routeId || !user?.token) return;

      try {
        const res = await fetch(`http://localhost:5000/api/itineraries/${routeId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await res.json();

        if (res.ok && data.itinerary?.route_data?.length) {
          setSelectedPois(data.itinerary.route_data);
          setUserLocation(data.itinerary.startPoint || { lat: 14.1461, lng: 121.5012 });
          setTourStatus(data.itinerary.status || "not_started");
        }
      } catch (err) {
        console.error("Error fetching saved route:", err);
      }
    };
    fetchSavedRoute();
  }, [routeId, user?.token]);

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

  const updateTourStatus = async (status) => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    setTracking(false);
    setActiveIndex(0);
    setSelectedPoiDetail(null);
    setTourStatus(status);

    if (!routeId || !user?.token) return;

    try {
      const res = await fetch(`http://localhost:5000/api/itineraries/${routeId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) alert(`Tour ${status}!`);
      else {
        const data = await res.json();
        alert(data.message || `Failed to update tour status to ${status}`);
      }
    } catch (err) {
      console.error("Error updating itinerary status:", err);
      alert("Error updating tour status.");
    }
  };

  const handleNextStop = () => {
    if (activeIndex + 1 < selectedPois.length) setActiveIndex((prev) => prev + 1);
    else updateTourStatus("finished");
  };

  const handleDragStart = (index) => setDraggedIndex(index);
  const handleDrop = (index) => {
    if (draggedIndex === null) return;
    const items = [...selectedPois];
    const [removed] = items.splice(draggedIndex, 1);
    items.splice(index, 0, removed);
    setSelectedPois(items);
    setDraggedIndex(null);
  };

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
        alert(errData.message || "Failed to save itinerary");
        return;
      }
      const data = await response.json();
      alert("Itinerary saved! ID: " + data.id);
      setRouteId(data.id);
    } catch (err) {
      console.error(err);
      alert("Server error while saving itinerary");
    }
  };

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
      {/* Map */}
      <div style={{ height: 650, borderRadius: 18, overflow: "hidden" }}>
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapWrapper mapRefSetter={(mapInstance) => (mapRef.current = mapInstance)}>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()}>
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
                <div style={{ textAlign: "center" }}>
                  <strong>{poi.name}</strong>
                  <p>{poi.description}</p>
                  {canEditRoute && (
                    <button
                      onClick={() => setSelectedPois((prev) => prev.filter((p) => p.id !== poi.id))}
                      style={{
                        marginTop: 6,
                        padding: "6px 12px",
                        background: "#f44336",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
            
          ))}

          {tracking && routeSegment.length > 0 && <Polyline positions={routeSegment} color="blue" />}
          </MapWrapper>
        </MapContainer>
      </div>

      {/* Sidebar */}
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          maxHeight: 650,
          overflowY: "auto",
        }}
      >
        <h2>POIs</h2>
        {[...selectedPois].map((poi, index) => {
          const isRecommended = recommendedPois.some((r) => r.id === poi.id);
          return (
            <div
              key={poi.id}
              draggable={!isRecommended}
              onDragStart={() => !isRecommended && handleDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => !isRecommended && handleDrop(index)}
              onClick={() => {
                            setSelectedPoiDetail(poi);
                            if (mapRef.current) {
                              mapRef.current.flyTo([poi.lat, poi.lng], 16, { animate: true, duration: 1.2 });

                            }
                          }}
              style={{
                marginBottom: 12,
                padding: 8,
                border: "1px solid #eee",
                borderRadius: 6,
                cursor: !isRecommended ? "grab" : "pointer",
                background: isRecommended ? "#fff9c4" : isFinished(index) ? "#f0f0f0" : "#fafafa",
                opacity: isFinished(index) && !isRecommended ? 0.5 : 1,
              }}
            >
              <strong>{index + 1}. {poi.name}</strong>
              <p style={{ margin: 0, fontSize: 13 }}>{poi.description}</p>
              {isRecommended && <span style={{ fontSize: 11, color: "#f57f17" }}>Recommended</span>}
            </div>
          );
        })}

        {/* Selected POI Details */}
        {selectedPoiDetail && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              border: "1px solid #eee",
              borderRadius: 8,
              background: "#fafafa",
            }}
          >
            <h3>{selectedPoiDetail.name}</h3>
            <p>{selectedPoiDetail.description || "No description available."}</p>
            {selectedPoiDetail.image && (
              <img
                src={`http://localhost:5000/images/${selectedPoiDetail.image}`}
                alt={selectedPoiDetail.name}
                style={{ width: "100%", borderRadius: 8, marginTop: 6 }}
              />
            )}

            {/* Like / Dislike */}
            {user?.token && (
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleLike(selectedPoiDetail.id, true)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    background: likedPois[selectedPoiDetail.id] === true ? "#4caf50" : "#e0e0e0",
                    color: likedPois[selectedPoiDetail.id] === true ? "#fff" : "#000",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Like
                </button>
                <button
                  onClick={() => handleLike(selectedPoiDetail.id, false)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    background: likedPois[selectedPoiDetail.id] === false ? "#f44336" : "#e0e0e0",
                    color: likedPois[selectedPoiDetail.id] === false ? "#fff" : "#000",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Dislike
                </button>
              </div>
            )}
          </div>
        )}

        {!routeId ? (
          <>
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
                marginTop: 12,
                marginBottom: 12,
              }}
            >
              Save Route
            </button>
            <p style={{ color: "#f44336", fontWeight: 600, marginBottom: 12 }}>
              You must save the route first before starting the tour!
            </p>
          </>
        ) : canEditRoute && !tracking ? (
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
              marginTop: 12,
              marginBottom: 12,
            }}
          >
            Start Tour
          </button>
        ) : null}

        {canEditRoute && tracking && (
          <>
            <button
              onClick={handleNextStop}
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
              Next Stop
            </button>

            <button
              onClick={() => updateTourStatus("cancelled")}
              style={{
                width: "100%",
                padding: 12,
                background: "#f44336",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 12,
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
