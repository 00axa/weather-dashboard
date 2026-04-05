/**
 * Weather Dashboard — OpenWeatherMap integration
 * Replace API_KEY with your key from https://openweathermap.org/api
 */

const API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";
const STORAGE_KEY = "weatherDashboardLastCity";
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

const els = {
  input: document.getElementById("city-input"),
  btn: document.getElementById("search-btn"),
  error: document.getElementById("error-msg"),
  loading: document.getElementById("loading"),
  section: document.getElementById("weather-section"),
  city: document.getElementById("city-name"),
  condition: document.getElementById("condition"),
  temp: document.getElementById("temperature"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  icon: document.getElementById("weather-icon"),
};

/** OpenWeatherMap `main` → body[data-weather] (drives CSS ambient layers). */
const WEATHER_THEME = {
  Clear: "clear",
  Clouds: "clouds",
  Rain: "rain",
  Drizzle: "rain",
  Thunderstorm: "thunderstorm",
  Snow: "default",
  Mist: "clouds",
  Fog: "clouds",
  Haze: "clouds",
};

/**
 * Switch ambient visuals (gradient stops, rain, fog, lightning, sun).
 */
function setWeatherTheme(main) {
  document.body.dataset.weather = WEATHER_THEME[main] || "default";
}

/**
 * Subtle parallax: CSS variables --px / --py in [-1, 1] for .ambient and .layout.
 */
function initParallax() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.addEventListener("mousemove", (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    document.documentElement.style.setProperty("--px", x.toFixed(4));
    document.documentElement.style.setProperty("--py", y.toFixed(4));
  });
}

function showError(message) {
  els.error.textContent = message;
  els.error.hidden = false;
}

function clearError() {
  els.error.hidden = true;
  els.error.textContent = "";
}

function setLoading(isLoading) {
  els.loading.hidden = !isLoading;
  els.btn.disabled = isLoading;
  els.input.disabled = isLoading;
}

function hideWeather() {
  els.section.hidden = true;
}

/**
 * Parse fetch/network failures and OpenWeatherMap error payloads.
 */
function getErrorMessage(err, data) {
  if (data && data.cod && String(data.cod) !== "200") {
    if (data.cod === "404" || data.message === "city not found") {
      return "City not found. Try another name.";
    }
    return data.message || "Something went wrong with the weather service.";
  }
  if (err instanceof TypeError && err.message.includes("fetch")) {
    return "Network error. Check your connection.";
  }
  return err.message || "Unable to load weather.";
}

/**
 * Update DOM with API response fields.
 */
function renderWeather(data) {
  const name = data.name;
  const country = data.sys?.country;
  els.city.textContent = country ? `${name}, ${country}` : name;

  const w = data.weather?.[0];
  const main = w?.main || "—";
  els.condition.textContent = main;

  const tempC = Math.round(data.main?.temp ?? 0);
  els.temp.textContent = String(tempC);

  const hum = data.main?.humidity;
  els.humidity.textContent = hum != null ? `${hum}%` : "—";

  const speed = data.wind?.speed;
  els.wind.textContent = speed != null ? `${speed} m/s` : "—";

  const iconCode = w?.icon;
  if (iconCode) {
    els.icon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    els.icon.alt = w?.description || main;
  } else {
    els.icon.removeAttribute("src");
    els.icon.alt = "";
  }

  setWeatherTheme(main);
  els.section.hidden = false;
  // Re-trigger fade-in animation
  els.section.style.animation = "none";
  void els.section.offsetHeight;
  els.section.style.animation = "";
}

async function fetchWeather(city) {
  if (!API_KEY || API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") {
    showError("Add your OpenWeatherMap API key in script.js (API_KEY).");
    return;
  }

  const trimmed = city.trim();
  if (!trimmed) {
    showError("Please enter a city name.");
    return;
  }

  clearError();
  hideWeather();
  setLoading(true);

  const url = `${BASE_URL}?q=${encodeURIComponent(trimmed)}&appid=${API_KEY}&units=metric`;

  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showError(getErrorMessage(new Error("HTTP error"), data));
      return;
    }

    if (data.cod && String(data.cod) !== "200") {
      showError(getErrorMessage(new Error("API error"), data));
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      /* localStorage may be unavailable */
    }

    renderWeather(data);
  } catch (err) {
    showError(getErrorMessage(err, null));
  } finally {
    setLoading(false);
  }
}

function onSearch() {
  fetchWeather(els.input.value);
}

// Initial load: restore last city or leave input empty
(function init() {
  try {
    const last = localStorage.getItem(STORAGE_KEY);
    if (last) {
      els.input.value = last;
    }
  } catch {
    /* ignore */
  }

  els.btn.addEventListener("click", onSearch);
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onSearch();
  });

  initParallax();
})();
