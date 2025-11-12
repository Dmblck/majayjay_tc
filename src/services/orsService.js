const ORS_API_KEY = process.env.REACT_APP_ORS_KEY;

export async function getRouteInfo(points, mode = "driving-car") {
  if (!points || points.length < 2) {
    console.error("❌ Invalid coordinates passed to getRouteInfo():", points);
    return null;
  }

  const coords = points.map((p) => [p.lng, p.lat]);
  console.log("🛰 Sending coordinates to ORS:", coords);

  try {
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/${mode}/geojson`,
      {
        method: "POST",
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coordinates: coords }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ ORS API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("✅ ORS response received:", data);

    if (!data.features || data.features.length === 0) {
      console.error("❌ No route found in ORS response");
      return null;
    }

    const route = data.features[0];
    const summary = route.properties.summary;

    const path = route.geometry.coordinates.map(([lon, lat]) => ({
      lat,
      lng: lon,
    }));

    const center = path[Math.floor(path.length / 2)];

    return {
      path,
      distance: summary.distance,
      duration: summary.duration,
      center,
      waypoints: points,
    };
  } catch (err) {
    console.error("🔥 Routing failed:", err);
    return null;
  }
}
