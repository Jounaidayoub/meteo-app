import {Injectable, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of, throwError} from 'rxjs';
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

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  apparentMax: number;
  apparentMin: number;
  precipitation: number;
  weatherCode: number;
  windSpeedMax: number;
}

export interface WeatherData {
  city: City;
  current: CurrentWeather;
  forecast: DailyForecast[];
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

// Maps WMO codes to clear, expressive statuses and icons
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

@Injectable({
  providedIn: 'root',
})
export class WeatherManager {
  private http = inject(HttpClient);

  // Core signals for state management
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

  // Recent/Favorite Cities list managed via localStorage
  readonly recentSearches = signal<City[]>(this.loadRecents());
  readonly favoriteCities = signal<City[]>(this.loadFavorites());

  // Comparison State
  readonly compareCityA = signal<City | null>(null);
  readonly compareCityB = signal<City | null>(null);
  readonly compareDataA = signal<WeatherData | null>(null);
  readonly compareDataB = signal<WeatherData | null>(null);
  readonly isComparingLoading = signal<boolean>(false);

  constructor() {
    // Load default weather on startup
    this.selectCity(this.currentCity());
  }

  // Geocoding API search - suggestions
  searchCities(query: string): Observable<City[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }
    const cleanUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
    return this.http.get<{results?: SearchResultItem[]}>(cleanUrl).pipe(
      map(response => {
        if (!response.results) {
          return [];
        }
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

  // Fetch weather for a given city
  configWeather(city: City): Observable<WeatherData> {
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,wind_speed_10m_max&timezone=auto`;

    return this.http.get<OpenMeteoResponse>(forecastUrl).pipe(
      map(res => {
        const currentData: CurrentWeather = {
          temperature: res.current.temperature_2m,
          feelsLike: res.current.apparent_temperature,
          humidity: res.current.relative_humidity_2m,
          windSpeed: res.current.wind_speed_10m,
          weatherCode: res.current.weather_code,
          time: res.current.time,
        };

        const dailyList: DailyForecast[] = [];
        const times: string[] = res.daily.time;
        // Limit to 5 days of forecast as requested
        const daysToMap = Math.min(times.length, 5);

        for (let i = 0; i < daysToMap; i++) {
          dailyList.push({
            date: times[i],
            tempMax: res.daily.temperature_2m_max[i],
            tempMin: res.daily.temperature_2m_min[i],
            apparentMax: res.daily.apparent_temperature_max[i],
            apparentMin: res.daily.apparent_temperature_min[i],
            precipitation: res.daily.precipitation_sum[i],
            weatherCode: res.daily.weather_code[i],
            windSpeedMax: res.daily.wind_speed_10m_max[i],
          });
        }

        return {
          city,
          current: currentData,
          forecast: dailyList,
        };
      })
    );
  }

  // Trigger main dashboard city switch
  selectCity(city: City): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.currentCity.set(city);

    this.configWeather(city).subscribe({
      next: (data) => {
        this.weatherData.set(data);
        this.isLoading.set(false);
        this.addToRecents(city);
      },
      error: (err) => {
        console.error(err);
        this.errorMsg.set('Unable to retrieve weather forecast for ' + city.name + '. Please check network connection.');
        this.isLoading.set(false);
      }
    });
  }

  // Fetch data specifically for comparison
  fetchComparisonDetails(): void {
    const cityA = this.compareCityA();
    const cityB = this.compareCityB();

    if (!cityA || !cityB) return;

    this.isComparingLoading.set(true);
    
    // Call both endpoints sequentially or concurrently
    this.configWeather(cityA).subscribe({
      next: (dataA) => {
        this.compareDataA.set(dataA);
        this.configWeather(cityB).subscribe({
          next: (dataB) => {
            this.compareDataB.set(dataB);
            this.isComparingLoading.set(false);
          },
          error: (err) => {
            console.error(err);
            this.isComparingLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.isComparingLoading.set(false);
      }
    });
  }

  // Geolocation trigger
  triggerGeolocation(): Observable<City> {
    if (typeof window === 'undefined' || !window.navigator.geolocation) {
      return throwError(() => new Error('Geolocation is not supported by your browser.'));
    }

    return new Observable<GeolocationPosition>(observer => {
      window.navigator.geolocation.getCurrentPosition(
        position => {
          observer.next(position);
          observer.complete();
        },
        error => {
          observer.error(error);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }).pipe(
      switchMap(position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        // Search the closest city name using Geocoding API by coordinates reverse lookup or reverse-lookup Open-Meteo endpoint
        // Open-Meteo doesn't have direct reverse geocoding API, but we can display it as "My Location" or do a simple fetch to a free reverse geocoder
        const locCity: City = {
          id: -999, // Custom flag for GPS
          name: 'Current Location',
          latitude: Number(lat.toFixed(4)),
          longitude: Number(lon.toFixed(4)),
          country: 'GPS Location',
          country_code: 'GPS',
        };
        return of(locCity);
      })
    );
  }

  // Local Recents Helpers
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
    // Filter duplicates
    list = list.filter(item => item.id !== city.id && !(item.latitude === city.latitude && item.longitude === city.longitude));
    list.unshift(city);
    // Keep max 6 cities
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

  // Favorites Helpers
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
}
