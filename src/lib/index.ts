import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

console.log("Starting NSE Upper Circuit Checker...");
async function fetchDaily(symbol: string) {
  const url = 'https://www.alphavantage.co/query';
  const params = {
    function: 'TIME_SERIES_DAILY_ADJUSTED',
    symbol,
    outputsize: 'compact',
    apikey: process.env.ALPHA_VANTAGE_API_KEY,
  };

  const response = await axios.get(url, { params });
  return response.data;
}


function buildNseSymbol(symbol: string): string {
  return `NSE:${symbol}`;
}

// index.ts - PR 4 (append below PR 3 code)

function isUpperCircuit(timeSeries: any): boolean {
  const series = timeSeries['Time Series (Daily)'];
  if (!series) return false;

  const dates = Object.keys(series).sort().reverse(); // latest first
  if (dates.length < 2) return false;

  const today = dates[0];
  const prev = dates[1];

  const recToday = series[today];
  const recPrev = series[prev];

  const closeToday = parseFloat(recToday['4. close']);
  const highToday = parseFloat(recToday['2. high']);
  const closePrev = parseFloat(recPrev['4. close']);

  const pctMove = (closeToday - closePrev) / closePrev;

  return closeToday >= highToday && pctMove >= 0.05;
}

async function checkStocks(symbols: string[]): Promise<string[]> {
  const upperCircuitSymbols: string[] = [];

  for (const sym of symbols) {
    try {
      const fullSym = buildNseSymbol(sym);
      const data = await fetchDaily(fullSym);

      if (isUpperCircuit(data)) {
        upperCircuitSymbols.push(sym);
      }

      // Respect rate limits: 5 requests per minute on free plan
      await new Promise((res) => setTimeout(res, 15000)); // 15 seconds
    } catch (err) {
      console.error(`Error fetching ${sym}:`, err);
    }
  }

  return upperCircuitSymbols;
}