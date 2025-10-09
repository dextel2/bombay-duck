#!/usr/bin/env node
// weather_fetcher.js
// Simple Node script to fetch weather data using Open-Meteo (no API key).
// Usage: node weather_fetcher.js LAT LON [days]
// Example: node weather_fetcher.js 28.6139 77.2090 3

const https = require('https');

function fetchWeather(lat, lon, days = 1) {
  // Open-Meteo provides free endpoints without API keys for basic data
  const params = [
    `latitude=${lat}`,
    `longitude=${lon}`,
    `daily=temperature_2m_max,temperature_2m_min,precipitation_sum`,
    `timezone=UTC`,
    `forecast_days=${days}`
  ].join('&');

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          resolve(data);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function summarize(data) {
  if (!data || !data.daily) return 'No data available';
  const days = data.daily.time.map((t, i) => {
    const max = data.daily.temperature_2m_max[i];
    const min = data.daily.temperature_2m_min[i];
    const rain = data.daily.precipitation_sum[i];
    return `- ${t}: max ${max}°C, min ${min}°C, precip ${rain} mm`;
  });
  return days.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node weather_fetcher.js LAT LON [days]');
    process.exit(1);
  }
  const lat = parseFloat(args[0]);
  const lon = parseFloat(args[1]);
  const days = Math.max(1, Math.min(7, parseInt(args[2]) || 1));

  try {
    const data = await fetchWeather(lat, lon, days);
    console.log(`Weather summary for ${lat},${lon} (next ${days} days):\n`);
    console.log(summarize(data));
  } catch (e) {
    console.error('Failed to fetch weather:', e.message || e);
    console.log('\nFallback: sample summary');
    console.log('- 2025-10-01: max 30°C, min 22°C, precip 0 mm');
  }
}

if (require.main === module) main();
