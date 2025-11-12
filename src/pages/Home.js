import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import RoutePlanner from "../components/RoutePlanner";
import WeatherWidget from "../components/WeatherWidget";

const CENTER = { lat: 14.1467, lng: 121.4708 };

export default function Home() {
  const [spots, setSpots] = useState([]);
  const [route, setRoute] = useState([]);
  const [weather, setWeather] = useState("Sunny");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingItinerary, setPendingItinerary] = useState(null);

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

        // Save all itineraries in localStorage
        const savedRoutes = data.itineraries.reduce((acc, it) => {
          acc[it.id] = it;
          return acc;
        }, {});
        localStorage.setItem("savedRoutes", JSON.stringify(savedRoutes));

        // Find pending itinerary
        const pending = data.itineraries.find(
          (it) => it.status.toLowerCase() === "pending"
        );
        setPendingItinerary(pending || null);

        // Extract spots from pending itinerary only
        if (pending && pending.route_data) {
          const pendingSpots = pending.route_data.map((spot) => ({
            id: spot.id,
            name: spot.name,
            lat: parseFloat(spot.lat),
            lng: parseFloat(spot.lng),
            description: spot.description || "No description available",
            visitors: spot.visitors || 0,
            image: spot.image || null,
          }));
          setSpots(pendingSpots);
        } else {
          setSpots([]);
        }
      } catch (err) {
        console.error("Error fetching itineraries:", err);
      }
    };

    fetchItineraries();
  }, []);

  // Live clock
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
    if (mapRef.current) mapRef.current.flyTo([spot.lat, spot.lng], 15, { duration: 1.5 });
    if (markerRefs.current[spot.name]) markerRefs.current[spot.name].openPopup();
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

  return (
    <div className="home-page">
      <div className="home-top-card">
        <WeatherWidget setWeather={setWeather} />

        <div className="weather-advisory">
          <div className="advisory-text">
            🌤️ <strong>Weather Advisory:</strong> {getAdvisory()}
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

        <div className="route-buttons">
          {route.length > 0 && (
            <button onClick={goToRouteDetails} className="btn-primary">
              View Recommended Route
            </button>
          )}
          {pendingItinerary ? (
            <button onClick={goToRouteDetails} className="btn-success">
              View Pending Itinerary
            </button>
          ) : (
            <button disabled className="btn-disabled">
              No Pending Itinerary
            </button>
          )}
        </div>
      </div>

      <div className="home-grid">
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
              {spots.map((spot) => (
                <Marker
                  key={spot.id}
                  position={[spot.lat, spot.lng]}
                  ref={(ref) => (markerRefs.current[spot.name] = ref)}
                >
                  <Popup>
                    <strong>{spot.name}</strong>
                    <br />
                    Visitors: {spot.visitors}
                    {spot.image && <br />}
                    {spot.image && (
                      <img
                        src={spot.image}
                        alt={spot.name}
                        style={{ width: "160px", borderRadius: "10px", marginTop: 6 }}
                      />
                    )}
                    <p style={{ marginTop: 8, color: "#555" }}>{spot.description}</p>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="no-spots">No spots available</div>
          )}
        </div>

        <div className="top-spots-card">
          <h2>Top Tourist Spots</h2>
          <ul>
            {spots.map((spot) => (
              <li key={spot.id} onClick={() => focusOnSpot(spot)}>
                <strong>{spot.name}</strong>
                <br />
                Visitors: {spot.visitors.toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
