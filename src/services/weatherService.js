const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_KEY;

export async function fetchWeather(poi) {
  if (!poi) return null;
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${poi.lat}&lon=${poi.lng}&units=metric&appid=${WEATHER_API_KEY}`
    );
    return await res.json();
  } catch {
    return null;
  }
}
