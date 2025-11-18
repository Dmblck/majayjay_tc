import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import RoutePlanner from "../components/RoutePlanner";
import WeatherWidget from "../components/WeatherWidget";

const CENTER = { lat: 14.1467, lng: 121.4708 };

// Color categories
const CATEGORY_COLOR = {
  "Nature & Outdoors": "green",
  "Culture & Heritage": "yellow",
  "Farming & Agriculture": "orange",
  "Food & Drink": "blue",
  "Accommodation & Stay": "red",
};

// Create colored marker icon
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

export default function Home() {
  const [spots, setSpots] = useState([]);
  const [route, setRoute] = useState([]);
  const [weather, setWeather] = useState("Sunny");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingItinerary, setPendingItinerary] = useState(null);
  const [mostLiked, setMostLiked] = useState([]);
  const [activeCategories, setActiveCategories] = useState(
    Object.keys(CATEGORY_COLOR)
  ); // show all by default

  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItineraries = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const token = user?.token;
        if (!token) return;

        const res = await fetch("http://localhost:5000/api/itineraries", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) return;

        const pending = data.itineraries.find(
          (it) => it.status.toLowerCase() === "pending"
        );
        setPendingItinerary(pending || null);

        const allSpots = [];
        data.itineraries.forEach((it) => {
          if (it.route_data) {
            it.route_data.forEach((spot) => {
              if (!allSpots.find((s) => s.id === spot.id)) {
                const tags = spot.tags
                  ? spot.tags.split(",").map((t) => t.trim().toLowerCase())
                  : [];
                let category = "Nature & Outdoors";
                if (
                  tags.some((t) =>
                    ["history", "culture", "religion", "architecture", "spiritual"].includes(t)
                  )
                ) {
                  category = "Culture & Heritage";
                } else if (
                  tags.some((t) =>
                    ["farm", "agri", "organic", "animal"].includes(t)
                  )
                ) {
                  category = "Farming & Agriculture";
                } else if (
                  tags.some((t) =>
                    ["resort", "motel", "hotel", "lodge"].includes(t)
                  )
                ) {
                  category = "Accommodation & Stay";
                } else if (
                  tags.some((t) => ["restaurant", "coffee", "food"].includes(t))
                ) {
                  category = "Food & Drink";
                }

                allSpots.push({
                  id: spot.id,
                  name: spot.name,
                  lat: parseFloat(spot.lat),
                  lng: parseFloat(spot.lng),
                  description: spot.description || "No description available",
                  visitors: spot.visitors || 0,
                  image: spot.image || null,
                  category,
                });
              }
            });
          }
        });

        setSpots(allSpots);

        if (pending && pending.route_data) {
          const routeSpots = pending.route_data.map((spot) => ({
            id: spot.id,
            name: spot.name,
            lat: parseFloat(spot.lat),
            lng: parseFloat(spot.lng),
            description: spot.description || "No description available",
            visitors: spot.visitors || 0,
            image: spot.image || null,
          }));
          setRoute(routeSpots);
        }
      } catch (err) {
        console.error("Error fetching itineraries:", err);
      }
    };

    const fetchMostLikedSpots = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/pois/most-liked");
        const data = await res.json();
        if (data.success) setMostLiked(data.mostLiked);
      } catch (err) {
        console.error("Error fetching most liked spots:", err);
      }
    };

    fetchItineraries();
    fetchMostLikedSpots();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getAdvisory = () => {
    switch (weather.toLowerCase()) {
      case "sunny":
        return "Perfect for outdoor trips! Don’t forget sunscreen and water. ☀️";
      case "rainy":
        return "Take precautions! Bring umbrella or raincoat. 🌧️";
      case "cloudy":
        return "Mild weather — nice for sightseeing but stay alert for rain. ☁️";
      case "windy":
        return "Secure belongings and avoid high areas. 💨";
      default:
        return "Enjoy your trip and stay safe!";
    }
  };

  const focusOnSpot = (spot) => {
    if (mapRef.current)
      mapRef.current.flyTo([spot.lat, spot.lng], 15, { duration: 1.5 });
    if (markerRefs.current[spot.name]) markerRefs.current[spot.name].openPopup();
  };

  const toggleCategory = (category) => {
    setActiveCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const goToRouteDetails = () => {
    if (pendingItinerary) {
      navigate("/routedetails", { state: { itinerary: pendingItinerary } });
    } else if (route.length) {
      navigate("/routedetails", { state: { itinerary: route } });
    } else {
      alert("No route available!");
    }
  };

  const renderLegend = () => (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        background: "rgba(255, 255, 255, 0.85)",
        padding: "10px 14px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 1000,
        fontSize: "0.85rem",
        color: "#333",
        maxWidth: "200px",
      }}
    >
      <strong>Legend (click to filter)</strong>
      <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0 0" }}>
        {Object.entries(CATEGORY_COLOR).map(([category, color]) => (
          <li
            key={category}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 4,
              cursor: "pointer",
              opacity: activeCategories.includes(category) ? 1 : 0.4,
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
                flexShrink: 0,
              }}
            ></span>
            {category}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="home-page">
      <div className="home-top-card">
        <WeatherWidget setWeather={setWeather} />
        <div className="weather-advisory">
          <div className="advisory-text">
            <strong>Weather Advisory:</strong> {getAdvisory()}
          </div>
          <div className="current-time">
            {currentTime.toLocaleString("en-PH", {
              weekday: "long",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        </div>

        <RoutePlanner spots={spots} setRoute={setRoute} weather={weather} />
      </div>

      <div className="home-grid" style={{ position: "relative" }}>
        <div className="map-card">
          <h2>Explore Map</h2>
          {spots.length > 0 ? (
            <MapContainer
              center={CENTER}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OSM contributors</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* All POI markers filtered by active category */}
              {spots
                .filter((spot) => activeCategories.includes(spot.category))
                .map((spot) => (
                  <Marker
                    key={spot.id}
                    position={[spot.lat, spot.lng]}
                    icon={createColoredIcon(
                      CATEGORY_COLOR[spot.category] || "blue"
                    )}
                    ref={(ref) => (markerRefs.current[spot.name] = ref)}
                  >
                    <Popup>
                      <strong>{spot.name}</strong>
                      <br />
                      Visitors: {spot.visitors}
                      {spot.image && <br />}
                      {spot.image && (
                        <img
                           src={spot.image ? `http://localhost:5000/images/${spot.image}` : undefined}
                           alt={spot.name}
                          style={{
                            width: "160px",
                            borderRadius: "10px",
                            marginTop: 6,
                          }}
                        />
                      )}
                      <p style={{ marginTop: 8, color: "#555" }}>
                        {spot.description}
                      </p>
                      <p
                        style={{
                          marginTop: 4,
                          fontWeight: "bold",
                          color: "#333",
                        }}
                      >
                        Category: {spot.category}
                      </p>
                    </Popup>
                  </Marker>
                ))}

              {/* Most liked spots */}
              {mostLiked.slice(0, 5).map((spot) => (
                <Marker
                  key={"liked-" + spot.id}
                  position={[spot.lat, spot.lng]}
                  ref={(ref) =>
                    (markerRefs.current["liked-" + spot.id] = ref)
                  }
                >
                  <Popup>
                    <strong>Most Liked Spot</strong>
                    <br />
                    {spot.name}
                    <br />
                    Likes: {spot.total_likes}
                    {spot.image && (
                      <>
                        <br />
                        <img
                          src={spot.image}
                          alt={spot.name}
                          style={{
                            width: "160px",
                            borderRadius: "10px",
                            marginTop: 6,
                          }}
                        />
                      </>
                    )}
                    <p style={{ marginTop: 8, color: "#555" }}>
                      {spot.description}
                    </p>
                  </Popup>
                </Marker>
              ))}

              {renderLegend()}
            </MapContainer>
          ) : (
            <div className="no-spots">No spots available</div>
          )}
        </div>

        <div className="top-spots-card">
          <h2>Top Most Liked Spots</h2>
          <ul>
            {mostLiked.slice(0, 5).map((spot, index) => (
              <li
                key={spot.id}
                onClick={() => focusOnSpot(spot)}
                style={{ cursor: "pointer", marginBottom: 6 }}
              >
                <strong>
                  {index + 1}. {spot.name}
                </strong>
                <br />
                Likes: {spot.total_likes}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
