const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const endpoint = "https://dataservice.accuweather.com";
const API_KEY = "zpka_39889c2841f647fca7efc46e7685966a_298e4ac3"

window.onload = () => {
  document.getElementById("cityInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") startSearch();
  });
};

function showError(msg) {
  const el = document.getElementById("welcomeError");
  el.textContent = "⚠ " + msg;
  el.style.display = "block";
}

function clearError() {
  const el = document.getElementById("welcomeError");
  el.style.display = "none";
}

function setLoader(visible, text = "Fetching weather data…") {
  document.getElementById("loaderScreen").style.display = visible
    ? "flex"
    : "none";
  document.getElementById("loaderText").textContent = text;
}

function resetApp() {
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("welcomeScreen").style.display = "flex";
  document.getElementById("cityInput").value = "";
  clearError();
}

function iconImgOrEmoji(iconNum, size = 40) {
  const n = String(iconNum);
  return `<img src="./icons/${n}.svg"
               width="${size}" height="${size}" alt="icon">`;
}

async function startSearch() {
  const city = document.getElementById("cityInput").value.trim();

  clearError();
  if (!city) {
    showError("Please enter a city name.");
    return;
  }

  document.getElementById("welcomeScreen").style.display = "none";
  setLoader(true, "Searching for city…");

  try {
    const locRes = await fetch(
      `${endpoint}/locations/v1/cities/search?apikey=${API_KEY}&q=${encodeURIComponent(city)}`,
    );
    if (!locRes.ok) throw new Error("Can't find location key.");
    const locData = await locRes.json();
    if (!locData.length)
      throw new Error(`City "${city}" not found. Try another name.`);

    const loc = locData[0];
    const locKey = loc.Key;
    const cityName = `${loc.LocalizedName}, ${loc.Country.LocalizedName}`;

    setLoader(true, "Loading weather data…");

    const curRes = await fetch(
      `${endpoint}/currentconditions/v1/${locKey}?apikey=${API_KEY}&details=true`,
    );
    if (!curRes.ok) throw new Error("Current conditions API error.");
    const curData = await curRes.json();
    const cur = curData[0];

    const fcRes = await fetch(
      `${endpoint}/forecasts/v1/daily/5day/${locKey}?apikey=${API_KEY}&metric=true`,
    );
    if (!fcRes.ok) throw new Error("Forecast API error.");
    const fcData = await fcRes.json();

    const hrRes = await fetch(
      `${endpoint}/forecasts/v1/hourly/12hour/${locKey}?apikey=${API_KEY}&metric=true`,
    );
    if (!hrRes.ok) throw new Error("Hourly API error.");
    const hrData = await hrRes.json();

    setLoader(false);
    renderDashboard(cityName, cur, fcData, hrData);
  } catch (err) {
    setLoader(false);
    document.getElementById("welcomeScreen").style.display = "flex";
    showError(err.message);
  }
}

function renderDashboard(cityName, cur, fc, hr) {
  document.getElementById("db-city").textContent = cityName;
  document.getElementById("topSearchText").textContent = cityName;

  const tempC = Math.round(cur.Temperature.Metric.Value);
  document.getElementById("db-temp").textContent = tempC + "°";
  document.getElementById("db-desc").textContent = cur.WeatherText;

  const rainPct = hr[0]?.PrecipitationProbability ?? 0;
  document.getElementById("db-rain").textContent =
    `Chance of rain: ${rainPct}%`;

  const card = document.querySelector(".current-card");
  if (cur.IsDayTime) {
    card.classList.add("is-day");
    card.classList.remove("is-night");
  } else {
    card.classList.add("is-night");
    card.classList.remove("is-day");
  }

  document.getElementById("db-daynite").textContent = cur.IsDayTime
    ? "☀️ Daytime"
    : "🌙 Nighttime";

  const feel = cur.RealFeelTemperature
    ? Math.round(cur.RealFeelTemperature.Metric.Value)
    : tempC;
  document.getElementById("db-feel").textContent = feel + "°";
  document.getElementById("db-wind").textContent =
    Math.round(cur.Wind?.Speed?.Metric?.Value ?? 0) + " km/h";
  document.getElementById("db-humidity").textContent =
    (cur.RelativeHumidity ?? "—") + "%";
  document.getElementById("db-uv").textContent = cur.UVIndex ?? "—";

  const hourlyRow = document.getElementById("hourlyRow");
  hourlyRow.innerHTML = "";
  const slots = hr.slice(0, 6);
  slots.forEach((h) => {
    const t = new Date(h.DateTime);
    const timeStr = t.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const div = document.createElement("div");
    div.className = "hour-item";
    div.innerHTML = `
        <div class="hour-time">${timeStr}</div>
        <div class="hour-icon">${iconImgOrEmoji(h.WeatherIcon, 36)}</div>
        <div class="hour-temp">${Math.round(h.Temperature.Value)}°</div>
      `;
    hourlyRow.appendChild(div);
  });

  const forecastList = document.getElementById("forecastList");
  forecastList.innerHTML = "";
  fc.DailyForecasts.forEach((day, i) => {
    const d = new Date(day.Date);
    const dayLabel = i === 0 ? "Today" : DAYS[d.getDay()];
    const hi = Math.round(day.Temperature.Maximum.Value);
    const lo = Math.round(day.Temperature.Minimum.Value);
    const iconNum = day.Day.Icon;
    const descText = day.Day.IconPhrase;

    const row = document.createElement("div");
    row.className = "forecast-row";
    row.innerHTML = `
        <div class="fc-day">${dayLabel}</div>
        <div class="fc-icon">${iconImgOrEmoji(iconNum, 34)}</div>
        <div class="fc-desc">${descText}</div>
        <div class="fc-temps">${hi}° <span class="fc-lo">/${lo}°</span></div>
      `;
    forecastList.appendChild(row);
  });

  document.getElementById("dashboard").style.display = "block";
}
