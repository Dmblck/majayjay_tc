export function scorePOI(poi, routeInfo, weather, selectedCategories, mode) {
  const { distance } = routeInfo;

  const maxDistance =
    mode === "foot-walking" ? 3000 :
    mode === "cycling-regular" ? 10000 :
    25000;
  const distanceScore = Math.exp(-distance / maxDistance);

  let weatherScore = 0.7;
  if (weather) {
    const condition = weather.weather[0].main;
    if (condition === "Clear") weatherScore = 1.0;
    else if (condition === "Clouds") weatherScore = 0.8;
    else if (condition === "Rain") weatherScore = 0.4;
    else if (condition === "Thunderstorm") weatherScore = 0.2;
    else if (condition === "Snow") weatherScore = 0.5;
  }

  const preferenceScore = selectedCategories.includes(poi.category) ? 1 : 0;

  const W_distance = 0.5;
  const W_weather = 0.2;
  const W_preference = 0.3;

  return (
    (W_distance * distanceScore) +
    (W_weather * weatherScore) +
    (W_preference * preferenceScore)
  );
}

export async function recommendRoute(
  pois,
  currentLocation,
  selectedCategories,
  mode,
  getRouteInfo,
  getWeather
) {
  const scoredPOIs = [];

  for (const poi of pois) {
    try {
      const routeInfo = await getRouteInfo(currentLocation, poi, mode);
      if (!routeInfo) continue;

      const weather = await getWeather(poi.lat, poi.lon);

      const score = scorePOI(poi, routeInfo, weather, selectedCategories, mode);

      scoredPOIs.push({ poi, score, routeInfo, weather });
    } catch (error) {
      console.error("Error scoring POI:", error);
    }
  }

  scoredPOIs.sort((a, b) => b.score - a.score);

  return scoredPOIs;
}
