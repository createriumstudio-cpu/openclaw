// LINE AI Partner – Weather service (OpenWeatherMap)

/** Weather information returned by the service. */
export type WeatherInfo = {
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  forecast?: Array<{
    date: string;
    temp: number;
    description: string;
    icon: string;
  }>;
};

// English → Japanese weather description mapping
const weatherDescriptionJa: Record<string, string> = {
  "clear sky": "晴れ",
  "few clouds": "晴れ時々曇り",
  "scattered clouds": "曇り",
  "broken clouds": "曇り",
  "overcast clouds": "厚い曇り",
  "shower rain": "にわか雨",
  "light rain": "小雨",
  "moderate rain": "雨",
  "heavy intensity rain": "大雨",
  rain: "雨",
  thunderstorm: "雷雨",
  snow: "雪",
  "light snow": "小雪",
  "heavy snow": "大雪",
  mist: "霧",
  fog: "濃霧",
  haze: "もや",
  drizzle: "霧雨",
};

/** Translate an English weather description to Japanese. */
export function translateWeatherDescription(desc: string): string {
  const lower = desc.toLowerCase();
  return weatherDescriptionJa[lower] ?? desc;
}

/** Weather icon → emoji mapping for text fallback. */
export function weatherIconToEmoji(icon: string): string {
  const map: Record<string, string> = {
    "01d": "☀️", "01n": "🌙",
    "02d": "⛅", "02n": "⛅",
    "03d": "☁️", "03n": "☁️",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌧️", "09n": "🌧️",
    "10d": "🌦️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️",
    "13d": "🌨️", "13n": "🌨️",
    "50d": "🌫️", "50n": "🌫️",
  };
  return map[icon] ?? "🌤️";
}

const OPENWEATHERMAP_BASE = "https://api.openweathermap.org/data/2.5";

/**
 * Fetch current weather for a location.
 * Requires OPENWEATHERMAP_API_KEY env var.
 */
export async function getWeather(location: string): Promise<WeatherInfo> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    throw new Error("OPENWEATHERMAP_API_KEY is not set");
  }

  const url = `${OPENWEATHERMAP_BASE}/weather?q=${encodeURIComponent(location)}&units=metric&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    main: { temp: number; feels_like: number; humidity: number };
    weather: Array<{ description: string; icon: string }>;
  };

  const w = data.weather[0];
  return {
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    description: translateWeatherDescription(w?.description ?? ""),
    icon: w?.icon ?? "01d",
  };
}
