import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

// Category color mapping
const CATEGORY_COLOR = {
  "Nature & Outdoors": "green",
  "Culture & Heritage": "yellow",
  "Farming & Agriculture": "orange",
  "Food & Drink": "blue",
  "Accommodation & Stay": "red",
};

// Helper to determine category based on tags
const determineCategory = (tags = "") => {
  const t = tags.toLowerCase().split(",").map((x) => x.trim());
  if (t.some((x) => ["history", "culture", "religion", "architecture", "spiritual"].includes(x))) return "Culture & Heritage";
  if (t.some((x) => ["farm", "agri", "organic", "animal"].includes(x))) return "Farming & Agriculture";
  if (t.some((x) => ["resort", "motel", "hotel", "lodge"].includes(x))) return "Accommodation & Stay";
  if (t.some((x) => ["restaurant", "coffee", "food"].includes(x))) return "Food & Drink";
  return "Nature & Outdoors";
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Helper to fly to location when selected from list
function ZoomToLocation({ selectedPoi }) {
  const map = useMap();
  useEffect(() => {
    if (selectedPoi) map.flyTo([selectedPoi.lat, selectedPoi.lng], 16, { duration: 1 });
  }, [selectedPoi, map]);
  return null;
}

// Handles clicking map to add POI
function AddPoiHandler({ addingPoi, onMapClick }) {
  useMapEvents({
    click(e) {
      if (addingPoi) {
        onMapClick(e);
      }
    },
  });
  return null;
}

export default function AdminPOIsMap() {
  const [pois, setPois] = useState([]);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [addingPoi, setAddingPoi] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); // 🔍 search term
  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;
  const fileInputRef = useRef(null);
  const mapRef = useRef(null);

  // Fetch POIs
  useEffect(() => {
    fetch("http://localhost:5000/api/pois", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPois(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, [token]);

  // Image preview
  useEffect(() => {
    if (!selectedPoi) {
      setImagePreview(null);
      return;
    }
    if (selectedPoi.imageFile) {
      setImagePreview(URL.createObjectURL(selectedPoi.imageFile));
    } else if (selectedPoi.image) {
      setImagePreview(`http://localhost:5000/images/${selectedPoi.image}`);
    } else {
      setImagePreview(null);
    }
  }, [selectedPoi]);

  const handleMapClick = (e) => {
    setSelectedPoi({
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      name: "",
      tags: "",
      description: "",
      visitors: "Moderate",
      isNew: true,
    });
    setAddingPoi(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPoi) return;
    setSelectedPoi({ ...selectedPoi, imageFile: file });
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("http://localhost:5000/api/upload-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) throw new Error("Image upload failed");
    const data = await res.json();
    return data.filename;
  };

  const savePoi = async () => {
    if (!selectedPoi) return;
    try {
      const poiToSave = { ...selectedPoi };

      if (selectedPoi.imageFile) {
        const filename = await uploadImage(selectedPoi.imageFile);
        poiToSave.image = filename;
        delete poiToSave.imageFile;
      }

      if (selectedPoi.isNew) {
        const res = await fetch("http://localhost:5000/api/pois", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(poiToSave),
        });
        if (!res.ok) throw new Error("Failed to create POI");
        const savedPoi = await res.json();
        setPois((prev) => [...prev, savedPoi]);
      } else {
        const res = await fetch(`http://localhost:5000/api/pois/${selectedPoi.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(poiToSave),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("❌ Server response:", res.status, text);
          throw new Error("Failed to update POI");
        }
        setPois((prev) => prev.map((p) => (p.id === selectedPoi.id ? { ...p, ...poiToSave } : p)));
      }

      setSelectedPoi(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      alert("POI saved successfully.");
    } catch (err) {
      console.error(err);
      alert("Error saving POI: " + err.message);
    }
  };

  const deletePoi = async (id) => {
    if (!window.confirm("Delete this POI?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/pois/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete POI");
      setPois((prev) => prev.filter((p) => p.id !== id));
      if (selectedPoi?.id === id) setSelectedPoi(null);
      alert("POI deleted.");
    } catch (err) {
      console.error(err);
      alert("Error deleting POI: " + err.message);
    }
  };

  // 🧭 Search filter
  const filteredPOIs = pois.filter((poi) => {
    const search = searchTerm.toLowerCase();
    return (
      poi.name.toLowerCase().includes(search) ||
      (poi.tags && poi.tags.toLowerCase().includes(search))
    );
  });

  // Layout fix (no overlap with navbar)
  const leftNavWidth = 105;
  const shift = leftNavWidth + 16;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Navbar space */}
      <div style={{ width: `${leftNavWidth}px`, background: "#333" }} />

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: `${shift}px`, display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Add POI button */}
        <button
          onClick={() => {
            setAddingPoi((prev) => !prev);
            setSelectedPoi(null);
          }}
          style={{
            position: "absolute",
            top: 12,
            right: 20,
            zIndex: 1100,
            background: addingPoi ? "#ff9800" : "#4caf50",
            color: "#fff",
            border: "none",
            padding: "10px 14px",
            borderRadius: 6,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          {addingPoi ? "Click map to place POI" : "➕ Add POI"}
        </button>

        {/* Map */}
        <div style={{ flex: 1 }}>
          <MapContainer
            center={[14.1619, 121.4626]}
            zoom={14}
            style={{
              height: "100%",
              width: "100%",
              cursor: addingPoi ? "crosshair" : "auto",
            }}
            whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
          >
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ZoomToLocation selectedPoi={selectedPoi} />
            <AddPoiHandler addingPoi={addingPoi} onMapClick={handleMapClick} />

            {filteredPOIs.map((p) => {
              const category = determineCategory(p.tags);
              return (
                <Marker
                  key={p.id}
                  position={[p.lat, p.lng]}
                  icon={createColoredIcon(CATEGORY_COLOR[category] || "blue")}
                  eventHandlers={{
                    click: () => {
                      setSelectedPoi({ ...p, isNew: false });
                      setAddingPoi(false);
                    },
                  }}
                />
              );
            })}

            // For new POI being added
            {selectedPoi?.isNew && (
              <Marker
                position={[selectedPoi.lat, selectedPoi.lng]}
                draggable
                icon={createColoredIcon(
                  CATEGORY_COLOR[determineCategory(selectedPoi.tags)]
                )}
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    setSelectedPoi((prev) => ({ ...prev, lat, lng }));
                  },
                }}
              />
            )}
            
            {selectedPoi?.isNew && (
              <Marker
                position={[selectedPoi.lat, selectedPoi.lng]}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    setSelectedPoi((prev) => ({ ...prev, lat, lng }));
                  },
                }}
              />
            )}
          </MapContainer>
        </div>

        {/* Bottom POI List */}
        <div style={{ height: 300, overflowY: "auto", background: "#fff", borderTop: "1px solid #ccc", padding: "12px 18px" }}>
          <h3 style={{ marginBottom: 10 }}>📋 Points of Interest</h3>

          {/* 🔍 Search bar */}
          <input
            type="text"
            placeholder="Search by name or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              marginBottom: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />

          {filteredPOIs.length === 0 ? (
            <p style={{ color: "#666" }}>No POIs match your search.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f7f7f7", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8 }}>Visitors</th>
                  <th style={{ padding: 8 }}>Tags</th>
                  <th style={{ padding: 8 }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredPOIs.map((poi) => (
                  <tr
                    key={poi.id}
                    onClick={() => {
                      setSelectedPoi({ ...poi, isNew: false });
                      setAddingPoi(false);
                    }}
                    style={{
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                      background: selectedPoi?.id === poi.id ? "#e8f4ff" : "transparent",
                    }}
                  >
                    <td style={{ padding: "6px 8px" }}>{poi.name}</td>
                    <td style={{ padding: "6px 8px" }}>{poi.visitors}</td>
                    <td style={{ padding: "6px 8px" }}>{poi.tags}</td>
                    <td style={{ padding: "6px 8px" }}>{poi.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right panel */}
      {selectedPoi && (
        <div style={{ width: 350, background: "#fff", borderLeft: "1px solid #ccc", padding: 18, overflowY: "auto" }}>
          <h3>{selectedPoi.isNew ? "Add New POI" : "Edit POI"}</h3>

          <input
            type="text"
            placeholder="Name"
            value={selectedPoi.name}
            onChange={(e) => setSelectedPoi({ ...selectedPoi, name: e.target.value })}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <input
            type="text"
            placeholder="Tags"
            value={selectedPoi.tags}
            onChange={(e) => setSelectedPoi({ ...selectedPoi, tags: e.target.value })}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <textarea
            placeholder="Description"
            value={selectedPoi.description}
            onChange={(e) => setSelectedPoi({ ...selectedPoi, description: e.target.value })}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <input ref={fileInputRef} type="file" onChange={handleImageUpload} style={{ width: "100%", marginBottom: 8 }} />
          {imagePreview && <img src={imagePreview} alt="Preview" style={{ width: "100%", borderRadius: 4, marginBottom: 8 }} />}
          <select
            value={selectedPoi.visitors}
            onChange={(e) => setSelectedPoi({ ...selectedPoi, visitors: e.target.value })}
            style={{ width: "100%", marginBottom: 8 }}
          >
            <option>Very High</option>
            <option>High</option>
            <option>Moderate</option>
            <option>Low</option>
          </select>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={savePoi}>Save</button>
            <button onClick={() => setSelectedPoi(null)}>Cancel</button>
            {!selectedPoi.isNew && (
              <button onClick={() => deletePoi(selectedPoi.id)} style={{ color: "red" }}>
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
