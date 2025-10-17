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