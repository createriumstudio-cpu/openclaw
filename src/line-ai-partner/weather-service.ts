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
    "01d": "☀️",
    "01n": "🌙",
    "02d": "⛅",
    "02n": "⛅",
    "03d": "☁️",
    "03n": "☁️",
    "04d": "☁️",
    "04n": "☁️",
    "09d": "🌧️",
    "09n": "🌧️",
    "10d": "🌦️",
    "10n": "🌧️",
    "11d": "⛈️",
    "11n": "⛈️",
    "13d": "🌨️",
    "13n": "🌨️",
    "50d": "🌫️",
    "50n": "🌫️",
  };
  return map[icon] ?? "🌤️";
}

const OPENWEATHERMAP_BASE = "https://api.openweathermap.org/data/2.5";

/**
 * Generate mock weather data based on current date/season.
 * Used when OPENWEATHERMAP_API_KEY is not configured.
 */
function getMockWeather(location: string): WeatherInfo {
  const month = new Date().getMonth();
  // Seasonal temperature baseline (Tokyo-ish)
  const seasonalTemp: Record<number, number> = {
    0: 5,
    1: 6,
    2: 10,
    3: 15,
    4: 20,
    5: 24,
    6: 28,
    7: 30,
    8: 26,
    9: 20,
    10: 14,
    11: 8,
  };
  const baseTemp = seasonalTemp[month] ?? 20;
  let hash = 0;
  for (let i = 0; i < location.length; i++) {
    hash += location.charCodeAt(i);
  }
  const variation = (hash % 5) - 2;
  const temp = baseTemp + variation;
  const descriptions = ["晴れ", "曇り", "晴れ時々曇り"];
  const icons = ["01d", "03d", "02d"];
  const idx = hash % descriptions.length;
  return {
    temp,
    feelsLike: temp - 1,
    humidity: 50 + (hash % 30),
    description: descriptions[idx],
    icon: icons[idx],
  };
}

/**
 * Fetch current weather for a location.
 * Falls back to mock data when OPENWEATHERMAP_API_KEY is not set.
 */
export async function getWeather(location: string): Promise<WeatherInfo> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return getMockWeather(location);
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

/**
 * Fetch weather forecast (3-day). Returns mock data when API key is unset.
 */
export async function getWeatherForecast(location: string): Promise<WeatherInfo["forecast"]> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    const base = getMockWeather(location);
    return [0, 1, 2].map((offset) => {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return {
        date: date.toISOString().slice(0, 10),
        temp: base.temp + (offset % 3) - 1,
        description: base.description,
        icon: base.icon,
      };
    });
  }

  const url = `${OPENWEATHERMAP_BASE}/forecast?q=${encodeURIComponent(location)}&units=metric&cnt=24&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    return undefined;
  }

  const data = (await res.json()) as {
    list: Array<{
      dt_txt: string;
      main: { temp: number };
      weather: Array<{ description: string; icon: string }>;
    }>;
  };

  const byDay = new Map<string, (typeof data.list)[number]>();
  for (const entry of data.list) {
    const day = entry.dt_txt.slice(0, 10);
    if (!byDay.has(day) || entry.dt_txt.includes("12:00")) {
      byDay.set(day, entry);
    }
  }

  return [...byDay.entries()].slice(0, 3).map(([day, entry]) => ({
    date: day,
    temp: Math.round(entry.main.temp),
    description: translateWeatherDescription(entry.weather[0]?.description ?? ""),
    icon: entry.weather[0]?.icon ?? "01d",
  }));
}
