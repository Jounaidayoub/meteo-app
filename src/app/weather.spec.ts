import {TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideHttpClient} from '@angular/common/http';
import {WeatherManager, getWeatherCondition, convertTemp, formatTemp, getAQIInfo} from './weather';

function flushInitialRequests(httpMock: HttpTestingController) {
  const forecastReq = httpMock.expectOne(r => r.url.includes('api.open-meteo.com/v1/forecast'));
  forecastReq.flush({
    current: {temperature_2m: 15, apparent_temperature: 13, relative_humidity_2m: 72, wind_speed_10m: 12, weather_code: 0, time: '2026-06-08T12:00'},
    daily: {time: ['2026-06-08'], temperature_2m_max: [20], temperature_2m_min: [10], apparent_temperature_max: [18], apparent_temperature_min: [8], precipitation_sum: [0], weather_code: [0], wind_speed_10m_max: [15], sunrise: ['2026-06-08T05:30'], sunset: ['2026-06-08T20:30'], uv_index_max: [5]},
    hourly: {time: ['2026-06-08T12:00'], temperature_2m: [15], precipitation_probability: [10], weather_code: [0], wind_speed_10m: [12]},
  });
  const aqiReq = httpMock.expectOne(r => r.url.includes('air-quality-api.open-meteo.com'));
  aqiReq.flush({current: {european_aqi: 20, us_aqi: 30, pm2_5: 5, pm10: 10, ozone: 50}});
  const briefingReq = httpMock.expectOne(r => r.url.includes('/api/weather-briefing'));
  briefingReq.flush({summary: 'Test briefing'});
}

describe('WeatherManager', () => {
  let service: WeatherManager;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherManager,
      ],
    });
    service = TestBed.inject(WeatherManager);
    httpMock = TestBed.inject(HttpTestingController);
    flushInitialRequests(httpMock);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with London as default city', () => {
    expect(service.currentCity().name).toBe('London');
  });

  it('should toggle temperature unit', () => {
    expect(service.temperatureUnit()).toBe('C');
    service.toggleTemperatureUnit();
    expect(service.temperatureUnit()).toBe('F');
    service.toggleTemperatureUnit();
    expect(service.temperatureUnit()).toBe('C');
  });

  it('should toggle dark mode', () => {
    const initial = service.isDarkMode();
    service.toggleDarkMode();
    expect(service.isDarkMode()).toBe(!initial);
    service.toggleDarkMode();
    expect(service.isDarkMode()).toBe(initial);
  });

  it('should search cities from Open-Meteo geocoding API', () => {
    const mockResponse = {
      results: [
        {id: 1, name: 'London', latitude: 51.5, longitude: -0.1, country_code: 'GB', country: 'United Kingdom'},
      ],
    };

    service.searchCities('London').subscribe(cities => {
      expect(cities.length).toBe(1);
      expect(cities[0].name).toBe('London');
    });

    const req = httpMock.expectOne(r => r.url.includes('geocoding-api.open-meteo.com'));
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should return empty array for short queries', () => {
    service.searchCities('a').subscribe(cities => {
      expect(cities).toEqual([]);
    });
  });

  it('should fetch weather data from Open-Meteo', () => {
    const mockResponse = {
      current: {
        temperature_2m: 15,
        apparent_temperature: 13,
        relative_humidity_2m: 72,
        wind_speed_10m: 12,
        weather_code: 0,
        time: '2026-06-08T12:00',
      },
      daily: {
        time: ['2026-06-08'],
        temperature_2m_max: [20],
        temperature_2m_min: [10],
        apparent_temperature_max: [18],
        apparent_temperature_min: [8],
        precipitation_sum: [0],
        weather_code: [0],
        wind_speed_10m_max: [15],
        sunrise: ['2026-06-08T05:30'],
        sunset: ['2026-06-08T20:30'],
        uv_index_max: [5],
      },
      hourly: {
        time: ['2026-06-08T12:00'],
        temperature_2m: [15],
        precipitation_probability: [10],
        weather_code: [0],
        wind_speed_10m: [12],
      },
    };

    service.configWeather({id: 1, name: 'Test', latitude: 51.5, longitude: -0.1}).subscribe(data => {
      expect(data.city.name).toBe('Test');
      expect(data.current.temperature).toBe(15);
      expect(data.forecast.length).toBe(1);
      expect(data.forecast[0].sunrise).toBe('2026-06-08T05:30');
      expect(data.forecast[0].uvIndex).toBe(5);
      expect(data.hourly.length).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.includes('api.open-meteo.com/v1/forecast'));
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);

    const aqiReq = httpMock.expectOne(r => r.url.includes('air-quality-api.open-meteo.com'));
    aqiReq.flush({current: {european_aqi: 20, us_aqi: 30, pm2_5: 5, pm10: 10, ozone: 50}});
  });

  it('should clear recents', () => {
    service.clearRecents();
    expect(service.recentSearches()).toEqual([]);
  });
});

describe('getWeatherCondition', () => {
  it('should return clear sky for code 0', () => {
    expect(getWeatherCondition(0).label).toBe('Clear Sky');
    expect(getWeatherCondition(0).icon).toBe('wb_sunny');
  });

  it('should return thunderstorm for code 95', () => {
    expect(getWeatherCondition(95).label).toBe('Thunderstorm');
    expect(getWeatherCondition(95).isRain).toBe(true);
  });

  it('should return unknown for invalid code', () => {
    expect(getWeatherCondition(-1).label).toBe('Unknown');
  });
});

describe('convertTemp', () => {
  it('should return celsius when unit is C', () => {
    expect(convertTemp(25, 'C')).toBe(25);
  });

  it('should convert to fahrenheit', () => {
    expect(convertTemp(0, 'F')).toBe(32);
    expect(convertTemp(100, 'F')).toBe(212);
  });
});

describe('formatTemp', () => {
  it('should format with unit', () => {
    expect(formatTemp(25, 'C')).toBe('25°C');
    expect(formatTemp(0, 'F')).toBe('32°F');
  });
});

describe('getAQIInfo', () => {
  it('should return good for low AQI', () => {
    expect(getAQIInfo(10).label).toBe('Good');
    expect(getAQIInfo(10).color).toBe('text-green-500');
  });

  it('should return no data for null', () => {
    expect(getAQIInfo(null).label).toBe('No data');
  });

  it('should return very poor for high AQI', () => {
    expect(getAQIInfo(100).label).toBe('Very Poor');
    expect(getAQIInfo(100).color).toBe('text-red-500');
  });
});
