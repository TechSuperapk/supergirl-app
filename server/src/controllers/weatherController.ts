/**
 * weatherController — current weather + 5-day forecast via the OpenWeather proxy.
 */
import { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { currentByCoords, currentByCity, forecastByCoords } from '../services/weatherService';

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// GET /api/weather/current?lat=&lon=   or   ?city=
export async function current(req: Request, res: Response) {
  const lat = num(req.query.lat);
  const lon = num(req.query.lon);
  const city = typeof req.query.city === 'string' ? req.query.city : '';
  if (lat !== null && lon !== null) {
    res.json(await currentByCoords(lat, lon));
    return;
  }
  if (city) {
    res.json(await currentByCity(city));
    return;
  }
  throw new AppError(422, 'Provide lat & lon, or city');
}

// GET /api/weather/forecast?lat=&lon=
export async function forecast(req: Request, res: Response) {
  const lat = num(req.query.lat);
  const lon = num(req.query.lon);
  if (lat === null || lon === null) throw new AppError(422, 'Provide lat & lon');
  res.json(await forecastByCoords(lat, lon));
}
