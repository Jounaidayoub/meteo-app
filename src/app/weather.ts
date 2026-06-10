import {Injectable, inject, signal, computed} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of, throwError, forkJoin} from 'rxjs';
import {map, catchError, switchMap} from 'rxjs/operators';

export interface City {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  time: string;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  precipitationProbability: number;
  weatherCode: number;
  windSpeed: number;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  apparentMax: number;
  apparentMin: number;
  precipitation: number;
  weatherCode: number;
  windSpeedMax: number;
  sunrise: string;
  sunset: string;
  uvIndex: number;
}

export interface AirQuality {
  europeanAqi: number | null;
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  ozone: number | null;
}

export interface WeatherData {
  city: City;
  current: CurrentWeather;
  forecast: DailyForecast[];
  hourly: HourlyForecast[];
  airQuality: AirQuality | null;
}

export interface SearchResultItem {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
}

export interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    time: string;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
}

export interface WeatherCondition {
  label: string;
  icon: string;
  bgGradient: string;
  textColor: string;
  cardBg: string;
  isRain: boolean;
  isSnow: boolean;
}

export function convertTemp(celsius: number, unit: 'C' | 'F'): number {
  if (unit === 'F') return Math.round((celsius * 9) / 5 + 32);
  return Math.round(celsius);
}

export function formatTemp(celsius: number, unit: 'C' | 'F'): string {
  return `${convertTemp(celsius, unit)}°${unit}`;
}

export function getWeatherCondition(code: number): WeatherCondition {
  switch (code) {
    case 0:
      return {
        label: 'Clear Sky',
        icon: 'wb_sunny',
        bgGradient: 'from-amber-400 via-orange-400 to-amber-500',
        textColor: 'text-amber-500',
        cardBg: 'bg-amber-500/10 border-amber-500/20',
        isRain: false,
        isSnow: false,
      };
    case 1:
    case 2:
    case 3:
      return {
        label: 'Partly Cloudy',
        icon: 'cloud',
        bgGradient: 'from-sky-400 via-blue-400 to-slate-400',
        textColor: 'text-blue-500',
        cardBg: 'bg-blue-500/10 border-blue-500/20',
        isRain: false,
        isSnow: false,
      };
    case 45:
    case 48:
      return {
        label: 'Foggy',
        icon: 'filter_drama',
        bgGradient: 'from-slate-300 via-zinc-400 to-slate-500',
        textColor: 'text-slate-600',
        cardBg: 'bg-slate-500/10 border-slate-500/20',
        isRain: false,
        isSnow: false,
      };
    case 51:
    case 53:
    case 55:
      return {
        label: 'Drizzle',
        icon: 'grain',
        bgGradient: 'from-teal-400 via-cyan-400 to-blue-500',
        textColor: 'text-teal-600',
        cardBg: 'bg-teal-500/10 border-teal-500/20',
        isRain: true,
        isSnow: false,
      };
    case 56:
    case 57:
      return {
        label: 'Freezing Drizzle',
        icon: 'ac_unit',
        bgGradient: 'from-cyan-300 via-indigo-300 to-blue-400',
        textColor: 'text-cyan-600',
        cardBg: 'bg-cyan-500/10 border-cyan-500/20',
        isRain: true,
        isSnow: true,
      };
    case 61:
    case 63:
    case 65:
      return {
        label: 'Rainy',
        icon: 'water_drop',
        bgGradient: 'from-blue-400 via-indigo-500 to-slate-600',
        textColor: 'text-blue-600',
        cardBg: 'bg-blue-500/10 border-blue-500/20',
        isRain: true,
        isSnow: false,
      };
    case 66:
    case 67:
      return {
        label: 'Freezing Rain',
        icon: 'ac_unit',
        bgGradient: 'from-cyan-400 via-indigo-400 to-slate-600',
        textColor: 'text-cyan-600',
        cardBg: 'bg-cyan-500/10 border-cyan-500/20',
        isRain: true,
        isSnow: true,
      };
    case 71:
    case 73:
    case 75:
      return {
        label: 'Snowy',
        icon: 'ac_unit',
        bgGradient: 'from-sky-300 via-cyan-200 to-indigo-400',
        textColor: 'text-sky-500',
        cardBg: 'bg-sky-500/10 border-sky-500/20',
        isRain: false,
        isSnow: true,
      };
    case 77:
      return {
        label: 'Snow Grains',
        icon: 'ac_unit',
        bgGradient: 'from-slate-200 via-sky-200 to-slate-400',
        textColor: 'text-slate-400',
        cardBg: 'bg-slate-500/10 border-slate-500/20',
        isRain: false,
        isSnow: true,
      };
    case 80:
    case 81:
    case 82:
      return {
        label: 'Rain Showers',
        icon: 'shower',
        bgGradient: 'from-sky-500 via-indigo-500 to-slate-700',
        textColor: 'text-blue-700',
        cardBg: 'bg-indigo-500/10 border-indigo-500/20',
        isRain: true,
        isSnow: false,
      };
    case 85:
    case 86:
      return {
        label: 'Snow Showers',
        icon: 'ac_unit',
        bgGradient: 'from-blue-200 via-cyan-100 to-slate-400',
        textColor: 'text-cyan-500',
        cardBg: 'bg-cyan-400/10 border-cyan-400/20',
        isRain: false,
        isSnow: true,
      };
    case 95:
      return {
        label: 'Thunderstorm',
        icon: 'bolt',
        bgGradient: 'from-indigo-700 via-slate-800 to-purple-900',
        textColor: 'text-amber-500',
        cardBg: 'bg-indigo-650/10 border-indigo-650/20',
        isRain: true,
        isSnow: false,
      };
    case 96:
    case 99:
      return {
        label: 'Storm & Hail',
        icon: 'thunderstorm',
        bgGradient: 'from-indigo-900 via-slate-900 to-purple-950',
        textColor: 'text-amber-400',
        cardBg: 'bg-purple-900/10 border-purple-900/20',
        isRain: true,
        isSnow: true,
      };
    default:
      return {
        label: 'Unknown',
        icon: 'wb_sunny',
        bgGradient: 'from-slate-400 to-zinc-500',
        textColor: 'text-slate-500',
        cardBg: 'bg-slate-500/10 border-slate-500/20',
        isRain: false,
        isSnow: false,
      };
  }
}

interface NominatimResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
    country_code?: string;
    state?: string;
  };
}

interface AqiApiResponse {
  current?: {
    european_aqi?: number;
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    ozone?: number;
  };
}

export function getAQIInfo(aqi: number | null): { label: string; color: string; level: number } {
  if (aqi === null || aqi === undefined) return { label: 'No data', color: 'text-slate-400', level: 0 };
  if (aqi <= 20) return { label: 'Good', color: 'text-green-500', level: 1 };
  if (aqi <= 40) return { label: 'Fair', color: 'text-lime-500', level: 2 };
  if (aqi <= 60) return { label: 'Moderate', color: 'text-yellow-500', level: 3 };
  if (aqi <= 80) return { label: 'Poor', color: 'text-orange-500', level: 4 };
  return { label: 'Very Poor', color: 'text-red-500', level: 5 };
}

@Injectable({
  providedIn: 'root',
})
export class WeatherManager {
  private http = inject(HttpClient);

  readonly temperatureUnit = signal<'C' | 'F'>(
    (typeof localStorage !== 'undefined' ? localStorage.getItem('meteo_temp_unit') as 'C' | 'F' : null) || 'C'
  );

  readonly isDarkMode = signal<boolean>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('meteo_dark_mode') === 'true' : false
  );

  readonly currentCity = signal<City>({
    id: 2643743,
    name: 'London',
    latitude: 51.5085,
    longitude: -0.1257,
    country: 'United Kingdom',
    country_code: 'GB',
  });

  readonly weatherData = signal<WeatherData | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  readonly recentSearches = signal<City[]>(this.loadRecents());
  readonly favoriteCities = signal<City[]>(this.loadFavorites());

  readonly compareCityA = signal<City | null>(null);
  readonly compareCityB = signal<City | null>(null);
  readonly compareDataA = signal<WeatherData | null>(null);
  readonly compareDataB = signal<WeatherData | null>(null);
  readonly isComparingLoading = signal<boolean>(false);

  readonly aiSummary = signal<string | null>(null);
  readonly isAiLoading = signal<boolean>(false);

  readonly chartData = computed(() => {
    const data = this.weatherData();
    if (!data) return null;
    return this.computeChartCoordinates(data.forecast);
  });

  constructor() {
    this.selectCity(this.currentCity());
  }

  fetchAiBriefing(cityName: string, temp: number, condition: string): Observable<string> {
    return this.http.get<{summary: string}>('/api/weather-briefing', {
      params: {city: cityName, temp: String(temp), condition},
    }).pipe(
      map(r => r.summary),
      catchError(() => of(`Currently ${temp}°C with ${condition} in ${cityName}.`))
    );
  }

  loadAiBriefing(): void {
    const data = this.weatherData();
    if (!data || typeof window === 'undefined') return;
    this.isAiLoading.set(true);
    this.fetchAiBriefing(
      data.city.name,
      data.current.temperature,
      getWeatherCondition(data.current.weatherCode).label,
    ).subscribe({
      next: (summary) => {
        this.aiSummary.set(summary);
        this.isAiLoading.set(false);
      },
      error: () => this.isAiLoading.set(false),
    });
  }

  toggleTemperatureUnit(): void {
    this.temperatureUnit.update(u => u === 'C' ? 'F' : 'C');
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('meteo_temp_unit', this.temperatureUnit());
    }
  }

  toggleDarkMode(): void {
    this.isDarkMode.update(d => !d);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('meteo_dark_mode', String(this.isDarkMode()));
    }
    this.applyDarkMode();
  }

  applyDarkMode(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', this.isDarkMode());
    }
  }

  searchCities(query: string): Observable<City[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }
    const cleanUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
    return this.http.get<{results?: SearchResultItem[]}>(cleanUrl).pipe(
      map(response => {
        if (!response.results) return [];
        return response.results.map(item => ({
          id: item.id,
          name: item.name,
          latitude: item.latitude,
          longitude: item.longitude,
          country_code: item.country_code,
          country: item.country,
          admin1: item.admin1,
        }));
      }),
      catchError(() => of([]))
    );
  }

  reverseGeocode(lat: number, lon: number): Observable<City> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    return this.http.get<NominatimResponse>(url, { headers: { 'Accept-Language': 'en' } }).pipe(
      map(res => {
        const addr = res.address || {};
        return {
          id: Math.abs(Math.round(lat * 1000) + Math.round(lon * 1000)),
          name: addr.city || addr.town || addr.village || addr.municipality || 'Unknown',
          latitude: lat,
          longitude: lon,
          country: addr.country || '',
          country_code: addr.country_code?.toUpperCase() || '',
          admin1: addr.state || '',
        };
      }),
      catchError(() => of({
        id: Math.abs(Math.round(lat * 1000) + Math.round(lon * 1000)),
        name: 'Current Location',
        latitude: lat,
        longitude: lon,
        country: 'GPS Location',
        country_code: 'GPS',
      }))
    );
  }

  configWeather(city: City): Observable<WeatherData> {
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset,uv_index_max&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&timezone=auto&forecast_days=5`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.latitude}&longitude=${city.longitude}&current=european_aqi,us_aqi,pm2_5,pm10,ozone`;

    return forkJoin({
      weather: this.http.get<OpenMeteoResponse>(forecastUrl),
      aqi: this.http.get<AqiApiResponse>(aqiUrl).pipe(catchError(() => of(null))),
    }).pipe(
      map(({weather, aqi}) => {
        const currentData: CurrentWeather = {
          temperature: weather.current.temperature_2m,
          feelsLike: weather.current.apparent_temperature,
          humidity: weather.current.relative_humidity_2m,
          windSpeed: weather.current.wind_speed_10m,
          weatherCode: weather.current.weather_code,
          time: weather.current.time,
        };

        const dailyList: DailyForecast[] = [];
        const times: string[] = weather.daily.time;
        const daysToMap = Math.min(times.length, 5);

        for (let i = 0; i < daysToMap; i++) {
          dailyList.push({
            date: times[i],
            tempMax: weather.daily.temperature_2m_max[i],
            tempMin: weather.daily.temperature_2m_min[i],
            apparentMax: weather.daily.apparent_temperature_max[i],
            apparentMin: weather.daily.apparent_temperature_min[i],
            precipitation: weather.daily.precipitation_sum[i],
            weatherCode: weather.daily.weather_code[i],
            windSpeedMax: weather.daily.wind_speed_10m_max[i],
            sunrise: weather.daily.sunrise?.[i] || '',
            sunset: weather.daily.sunset?.[i] || '',
            uvIndex: weather.daily.uv_index_max?.[i] ?? 0,
          });
        }

        const hourlyList: HourlyForecast[] = [];
        const hourTimes: string[] = weather.hourly?.time || [];
        const hoursToMap = Math.min(hourTimes.length, 24);

        for (let i = 0; i < hoursToMap; i++) {
          hourlyList.push({
            time: hourTimes[i],
            temperature: weather.hourly.temperature_2m[i],
            precipitationProbability: weather.hourly.precipitation_probability[i],
            weatherCode: weather.hourly.weather_code[i],
            windSpeed: weather.hourly.wind_speed_10m[i],
          });
        }

        let airQuality: AirQuality | null = null;
        if (aqi?.current) {
          airQuality = {
            europeanAqi: aqi.current.european_aqi ?? null,
            usAqi: aqi.current.us_aqi ?? null,
            pm25: aqi.current.pm2_5 ?? null,
            pm10: aqi.current.pm10 ?? null,
            ozone: aqi.current.ozone ?? null,
          };
        }

        return { city, current: currentData, forecast: dailyList, hourly: hourlyList, airQuality };
      })
    );
  }

  selectCity(city: City): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.aiSummary.set(null);
    this.currentCity.set(city);

    this.configWeather(city).subscribe({
      next: (data) => {
        this.weatherData.set(data);
        this.isLoading.set(false);
        this.addToRecents(city);
        this.loadAiBriefing();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg.set('Unable to retrieve weather forecast for ' + city.name + '. Please check network connection.');
        this.isLoading.set(false);
      }
    });
  }

  fetchComparisonDetails(): void {
    const cityA = this.compareCityA();
    const cityB = this.compareCityB();
    if (!cityA || !cityB) return;

    this.isComparingLoading.set(true);

    forkJoin({
      dataA: this.configWeather(cityA),
      dataB: this.configWeather(cityB),
    }).subscribe({
      next: ({dataA, dataB}) => {
        this.compareDataA.set(dataA);
        this.compareDataB.set(dataB);
        this.isComparingLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isComparingLoading.set(false);
      }
    });
  }

  triggerGeolocation(): Observable<City> {
    if (typeof window === 'undefined' || !window.navigator.geolocation) {
      return throwError(() => new Error('Geolocation is not supported by your browser.'));
    }

    return new Observable<GeolocationPosition>(observer => {
      window.navigator.geolocation.getCurrentPosition(
        position => { observer.next(position); observer.complete(); },
        error => { observer.error(error); },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }).pipe(
      switchMap(position => this.reverseGeocode(position.coords.latitude, position.coords.longitude))
    );
  }

  private loadRecents(): City[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem('meteo_recent_searches');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private addToRecents(city: City): void {
    if (typeof localStorage === 'undefined') return;
    let list = this.loadRecents();
    list = list.filter(item => item.id !== city.id && !(item.latitude === city.latitude && item.longitude === city.longitude));
    list.unshift(city);
    list = list.slice(0, 6);
    this.recentSearches.set(list);
    try {
      localStorage.setItem('meteo_recent_searches', JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }

  clearRecents(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('meteo_recent_searches');
    }
    this.recentSearches.set([]);
  }

  private loadFavorites(): City[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem('meteo_favorites');
      return data ? JSON.parse(data) : [
        { id: 2643743, name: 'London', latitude: 51.5085, longitude: -0.1257, country: 'United Kingdom', country_code: 'GB' },
        { id: 5128581, name: 'New York', latitude: 40.7143, longitude: -74.006, country: 'United States', country_code: 'US' },
        { id: 2988507, name: 'Paris', latitude: 48.8534, longitude: 2.3488, country: 'France', country_code: 'FR' },
        { id: 1850147, name: 'Tokyo', latitude: 35.6895, longitude: 139.6917, country: 'Japan', country_code: 'JP' },
      ];
    } catch {
      return [];
    }
  }

  toggleFavorite(city: City): void {
    if (typeof localStorage === 'undefined') return;
    const list = this.loadFavorites();
    const isFav = list.some(item => item.id === city.id || (item.latitude === city.latitude && item.longitude === city.longitude));
    let updated: City[];
    if (isFav) {
      updated = list.filter(item => !(item.id === city.id || (item.latitude === city.latitude && item.longitude === city.longitude)));
    } else {
      updated = [...list, city];
    }
    this.favoriteCities.set(updated);
    try {
      localStorage.setItem('meteo_favorites', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  }

  isFavorite(city: City): boolean {
    return this.favoriteCities().some(item => item.id === city.id || (item.latitude === city.latitude && item.longitude === city.longitude));
  }

  getDayOfWeek(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[new Date(dateStr).getDay()];
    } catch {
      return dateStr;
    }
  }

  formatDateFormatted(dateStr: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    try {
      return new Date(timeStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return timeStr;
    }
  }

  formatHour(timeStr: string): string {
    if (!timeStr) return '';
    try {
      return new Date(timeStr).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    } catch {
      return timeStr;
    }
  }

  private computeChartCoordinates(list: DailyForecast[]) {
    const width = 600;
    const height = 240;
    const paddingX = 50;
    const paddingY = 40;

    const count = list.length;
    const xSpace = (width - paddingX * 2) / (count - 1);

    const maxTempVals = list.map(d => d.tempMax);
    const minTempVals = list.map(d => d.tempMin);

    const globalMax = Math.max(...maxTempVals);
    const globalMin = Math.min(...minTempVals);
    let span = globalMax - globalMin;
    if (span === 0) span = 1;

    const pointsMax = list.map((d, i) => {
      const x = paddingX + i * xSpace;
      const y = height - paddingY - ((d.tempMax - globalMin) / span) * (height - paddingY * 2);
      const label = this.getDayOfWeek(d.date).slice(0, 3);
      return { x, y, val: d.tempMax, label };
    });

    const pointsMin = list.map((d, i) => {
      const x = paddingX + i * xSpace;
      const y = height - paddingY - ((d.tempMin - globalMin) / span) * (height - paddingY * 2);
      const label = this.getDayOfWeek(d.date).slice(0, 3);
      return { x, y, val: d.tempMin, label };
    });

    const lineMax = pointsMax.reduce((p, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${p} L ${pt.x} ${pt.y}`, '');
    const lineMin = pointsMin.reduce((p, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${p} L ${pt.x} ${pt.y}`, '');

    const pathMaxArea = `${lineMax} L ${pointsMax[count - 1].x} ${height - paddingY} L ${pointsMax[0].x} ${height - paddingY} Z`;
    const pathMinArea = `${lineMin} L ${pointsMin[count - 1].x} ${height - paddingY} L ${pointsMin[0].x} ${height - paddingY} Z`;

    return { pointsMax, pointsMin, lineMax, lineMin, pathMaxArea, pathMinArea };
  }
}
