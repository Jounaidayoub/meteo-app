import {Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule, FormControl} from '@angular/forms';
import {RouterLink, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {Subscription, of} from 'rxjs';
import {debounceTime, distinctUntilChanged, switchMap, catchError} from 'rxjs/operators';
import {animate, style, transition, trigger} from '@angular/animations';
import {WeatherManager, City, getWeatherCondition, getAQIInfo, formatTemp} from './weather';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="max-w-7xl mx-auto px-6 py-10 animate-fade-in"
         [class.dark]="manager.isDarkMode()">
      
      <!-- Top Branding and Search Section -->
      <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div>
          <div class="flex items-center gap-2">
            <span class="material-icons text-indigo-600 text-4xl font-semibold">filter_drama</span>
            <h1 class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">Meteo App</h1>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-300 mt-1 font-sans">A minimalist clean weather intelligence dashboard</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button (click)="manager.toggleDarkMode()"
                  id="dark-mode-btn"
                  class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all font-medium text-sm shadow-xs"
                  title="Toggle dark mode">
            <mat-icon>{{ manager.isDarkMode() ? 'dark_mode' : 'light_mode' }}</mat-icon>
          </button>

          <button (click)="manager.toggleTemperatureUnit()"
                  id="unit-toggle-btn"
                  class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all font-medium text-sm shadow-xs"
                  title="Toggle temperature unit">
            <mat-icon>thermostat</mat-icon>
            {{ manager.temperatureUnit() }}°
          </button>

          <a routerLink="/compare" 
             id="compare-nav-btn"
             class="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all font-medium text-sm text-center shadow-xs">
            <mat-icon>compare_arrows</mat-icon>
            Compare
          </a>

          <button (click)="locateMe()" 
                  id="locate-btn"
                  [disabled]="isGeoLoading()"
                  class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all font-medium text-sm shadow-xs disabled:opacity-55 disabled:cursor-not-allowed">
            <mat-icon [class.animate-spin]="isGeoLoading()">my_location</mat-icon>
            {{ isGeoLoading() ? 'Detecting...' : 'Detect' }}
          </button>
        </div>
      </header>

      <!-- Main Columns Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <!-- Left Side: Autocomplete, Favorites, Recents -->
        <div class="lg:col-span-1 flex flex-col gap-6">
          
          <!-- Autocomplete Search Panel -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-xs relative">
            <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
              <mat-icon class="text-indigo-500 text-lg">search</mat-icon>
              City Search
            </h2>

            <div class="relative">
              <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-300">
                <mat-icon>place</mat-icon>
              </div>
              <input 
                [formControl]="searchCtrl"
                type="text"
                placeholder="Type city name (e.g. Rome)..."
                id="city-search-input"
                class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100/70 dark:hover:bg-slate-600/50 focus:bg-white text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl outline-hidden border border-transparent focus:border-indigo-600/30 transition-all text-sm shadow-inner"
              />
              @if (isSuggesting()) {
                <div class="absolute right-3 top-3.5">
                  <div class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              }
            </div>

            @if (suggestions().length > 0) {
              <div class="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-xl z-50 overflow-hidden divide-y divide-slate-50 dark:divide-slate-700 animate-fade-in">
                @for (item of suggestions(); track item.id) {
                  <button 
                    (click)="selectSuggestedCity(item)"
                    class="w-full text-left px-4 py-3 hover:bg-indigo-50/50 transition-all flex items-center justify-between text-sm group"
                  >
                    <div>
                      <span class="font-medium text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:hover:text-indigo-400">{{ item.name }}</span>
                      @if (item.admin1) {
                        <span class="text-xs text-slate-400 dark:text-slate-300 ml-1">, {{ item.admin1 }}</span>
                      }
                    </div>
                    <span class="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-mono px-1.5 py-0.5 rounded uppercase font-bold">
                      {{ item.country_code || 'WMO' }}
                    </span>
                  </button>
                }
              </div>
            } @else if (searchCtrl.value && searchCtrl.value.trim().length >= 2 && !isSuggesting() && focusedInput) {
              <div class="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-xl z-50 text-center text-xs text-slate-400 dark:text-slate-300">
                No matching cities found
              </div>
            }
          </div>

          <!-- Favorites List -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-xs">
            <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <mat-icon class="text-rose-500 text-lg">favorite</mat-icon>
              Favorites
            </h2>

            @if (manager.favoriteCities().length === 0) {
              <div class="text-center py-4 bg-slate-50/55 dark:bg-slate-700/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
                <p class="text-xs text-slate-400 dark:text-slate-300 font-sans">No favorites saved yet</p>
              </div>
            } @else {
              <div class="flex flex-col gap-2">
                @for (fav of manager.favoriteCities(); track fav.id) {
                  <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50/40 rounded-xl p-2.5 transition-all text-sm group">
                    <button 
                      (click)="manager.selectCity(fav)"
                      class="flex-1 text-left font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <span class="truncate block max-w-[140px]">{{ fav.name }}</span>
                      <span class="text-[10px] text-slate-400 dark:text-slate-300 block -mt-0.5">{{ fav.country }}</span>
                    </button>
                    <button 
                      (click)="manager.toggleFavorite(fav)"
                      id="remove-fav-{{fav.id}}"
                      class="p-1 text-slate-300 dark:text-slate-400 hover:text-rose-500 transition-colors rounded-lg"
                      title="Remove from favorites"
                    >
                      <mat-icon class="text-md">favorite</mat-icon>
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Recently Viewed -->
          @if (manager.recentSearches().length > 0) {
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-xs">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <mat-icon class="text-slate-500 dark:text-slate-300 text-lg">history</mat-icon>
                  Recents
                </h2>
                <button (click)="manager.clearRecents()" 
                        class="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors">
                  Clear
                </button>
              </div>

              <div class="flex flex-wrap gap-2">
                @for (recent of manager.recentSearches(); track recent.id) {
                  <button 
                    (click)="manager.selectCity(recent)"
                    class="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50/50 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 font-medium rounded-xl transition-all border border-slate-100 dark:border-slate-700"
                  >
                    {{ recent.name }}
                  </button>
                }
              </div>
            </div>
          }

        </div>

        <!-- Right Side: Weather Display -->
        <div class="lg:col-span-3 flex flex-col gap-6">
          
          <!-- Loading Skeleton -->
          @if (manager.isLoading()) {
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-xs">
              <div class="bg-slate-200 dark:bg-slate-700 animate-pulse h-52"></div>
              <div class="p-6 space-y-4">
                <div class="h-4 bg-slate-200 dark:bg-slate-700 animate-pulse rounded w-1/3"></div>
                <div class="h-8 bg-slate-200 dark:bg-slate-700 animate-pulse rounded w-1/2"></div>
                <div class="grid grid-cols-3 gap-4">
                  <div class="h-20 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-xl"></div>
                  <div class="h-20 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-xl"></div>
                  <div class="h-20 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-xl"></div>
                </div>
              </div>
            </div>
          }

          <!-- Fail Safe Error Notice -->
          @else if (manager.errorMsg()) {
            <div class="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center shadow-xs">
              <mat-icon class="text-rose-500 text-4xl mb-3">error_outline</mat-icon>
              <h3 class="text-lg font-semibold text-rose-900 dark:text-rose-200 mb-1">Network Transmission Failed</h3>
              <p class="text-sm text-rose-700 dark:text-rose-300 max-w-md mx-auto mb-4">{{ manager.errorMsg() }}</p>
              <button (click)="retryCurrentCity()" class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium shadow-xs transition-colors inline-flex items-center gap-2">
                <mat-icon>refresh</mat-icon> Retry Request
              </button>
            </div>
          }

          <!-- Weather Dashboard View -->
          @else if (manager.weatherData(); as data) {
            @let condition = getCond(data.current.weatherCode);
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-xs">
              <div class="bg-gradient-to-br {{ condition.bgGradient }} text-white p-8 md:p-10 relative">
                
                <div class="absolute right-8 top-8 opacity-20 pointer-events-none">
                  <mat-icon class="text-[150px] leading-none">{{ condition.icon }}</mat-icon>
                </div>

                <div class="flex items-start justify-between relative z-10">
                  <div>
                    <div class="flex items-center gap-3">
                      <span class="text-xs font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-xs">
                        {{ data.city.country_code || 'GPS' }}
                      </span>
                      <button (click)="manager.toggleFavorite(data.city)" 
                              id="toggle-fav-main"
                              class="text-white hover:scale-105 transition-transform" 
                              title="Toggle Favorite">
                        <mat-icon class="text-xl">
                          {{ manager.isFavorite(data.city) ? 'favorite' : 'favorite_border' }}
                        </mat-icon>
                      </button>
                    </div>
                    <h2 class="text-4xl font-bold tracking-tight mt-2 font-sans">{{ data.city.name }}</h2>
                    <p class="text-white/80 text-sm mt-0.5 font-sans">
                      {{ data.city.country }} @if (data.city.admin1) { — {{ data.city.admin1 }} }
                    </p>
                  </div>

                  <div class="text-right">
                    <span class="text-6xl md:text-7xl font-light font-sans tracking-tight">
                      {{ formatTemp(data.current.temperature, manager.temperatureUnit()) }}
                    </span>
                    <p class="text-sm text-white/80 font-medium mt-1 font-sans">
                      Feels like {{ formatTemp(data.current.feelsLike, manager.temperatureUnit()) }}
                    </p>
                  </div>
                </div>

                <div class="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 relative z-10">
                  <div class="flex items-center gap-3.5">
                    <span class="material-icons text-4xl bg-white/20 p-2.5 rounded-xl backdrop-blur-xs">{{ condition.icon }}</span>
                    <div>
                      <h3 class="text-sm font-semibold text-white tracking-wide uppercase">Atmosphere</h3>
                      <p class="text-lg font-bold text-white leading-tight mt-0.5">{{ condition.label }}</p>
                    </div>
                  </div>
                  <div class="text-xs bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-xs font-mono">
                    Updated: {{ manager.formatTime(data.current.time) }}
                  </div>
                </div>
              </div>

              <!-- Quick details grid -->
              <div class="p-8 md:p-10 bg-slate-50/45 dark:bg-slate-700/40 border-b border-slate-100 dark:border-slate-700">
                <div class="grid grid-cols-3 gap-6">
                  
                  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 transition-all hover:scale-[1.02] shadow-2xs">
                    <div class="flex items-center gap-2 mb-1.5 text-slate-400 dark:text-slate-300">
                      <mat-icon class="text-blue-500">water_drop</mat-icon>
                      <span class="text-xs font-medium uppercase font-sans">Humidity</span>
                    </div>
                    <span class="text-xl font-bold text-slate-800 dark:text-slate-100 font-sans">{{ data.current.humidity }}%</span>
                  </div>

                  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 transition-all hover:scale-[1.02] shadow-2xs">
                    <div class="flex items-center gap-2 mb-1.5 text-slate-400 dark:text-slate-300">
                      <mat-icon class="text-teal-500">air</mat-icon>
                      <span class="text-xs font-medium uppercase font-sans">Wind Speed</span>
                    </div>
                    <span class="text-xl font-bold text-slate-800 dark:text-slate-100 font-sans">{{ data.current.windSpeed }} km/h</span>
                  </div>

                  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 transition-all hover:scale-[1.02] shadow-2xs">
                    <div class="flex items-center gap-2 mb-1.5 text-slate-400 dark:text-slate-300">
                      <mat-icon class="text-amber-500">hourglass_empty</mat-icon>
                      <span class="text-xs font-medium uppercase font-sans">Lat / Lon</span>
                    </div>
                    <span class="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 tracking-tight block">
                      {{ data.city.latitude }}°N<br>{{ data.city.longitude }}°E
                    </span>
                  </div>

                </div>
              </div>

              <!-- AI Weather Briefing -->
              @if (manager.aiSummary(); as summary) {
                <div class="px-6 md:px-8 py-4 bg-gradient-to-r from-indigo-50 dark:from-indigo-950/60 to-sky-50 dark:to-sky-950/60 border-b border-slate-100 dark:border-slate-700">
                  <div class="flex items-start gap-3">
                    <span class="material-icons text-indigo-500 dark:text-indigo-400 mt-0.5">auto_awesome</span>
                    <p class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{{ summary }}</p>
                  </div>
                </div>
              } @else if (manager.isAiLoading()) {
                <div class="px-6 md:px-8 py-4 bg-gradient-to-r from-indigo-50 dark:from-indigo-950/60 to-sky-50 dark:to-sky-950/60 border-b border-slate-100 dark:border-slate-700">
                  <div class="flex items-center gap-3">
                    <div class="w-4 h-4 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    <p class="text-sm text-slate-400 dark:text-slate-300 animate-pulse">Generating weather briefing...</p>
                  </div>
                </div>
              }

              <!-- Hourly Forecast Strip -->
              @if (data.hourly.length > 0) {
                <div class="p-6 md:p-8 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <mat-icon class="text-indigo-500">schedule</mat-icon>
                    Hourly Forecast
                  </h3>
                  <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                    @for (hour of data.hourly; track hour.time) {
                      @let hCond = getCond(hour.weatherCode);
                      <div class="flex flex-col items-center gap-1.5 min-w-[64px] p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 shrink-0">
                        <span class="text-[10px] font-mono text-slate-500 dark:text-slate-300 font-bold">{{ manager.formatHour(hour.time) }}</span>
                        <span class="material-icons text-lg {{ hCond.textColor }}">{{ hCond.icon }}</span>
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ formatTemp(hour.temperature, manager.temperatureUnit()) }}</span>
                        @if (hour.precipitationProbability > 0) {
                          <span class="text-[9px] text-blue-500 font-mono">{{ hour.precipitationProbability }}%</span>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Air Quality Card -->
              @if (data.airQuality; as aqi) {
                <div class="p-6 md:p-8 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <mat-icon class="text-green-500">air</mat-icon>
                    Air Quality Index
                  </h3>
                  <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 text-center">
                      <span class="text-[9px] text-slate-400 dark:text-slate-300 uppercase font-bold block">EU AQI</span>
                      <span class="text-lg font-bold {{ getAQIInfo(aqi.europeanAqi).color }}">{{ aqi.europeanAqi ?? '—' }}</span>
                      <span class="text-[9px] text-slate-500 dark:text-slate-300 font-medium block">{{ getAQIInfo(aqi.europeanAqi).label }}</span>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 text-center">
                      <span class="text-[9px] text-slate-400 dark:text-slate-300 uppercase font-bold block">US AQI</span>
                      <span class="text-lg font-bold {{ getAQIInfo(aqi.usAqi).color }}">{{ aqi.usAqi ?? '—' }}</span>
                      <span class="text-[9px] text-slate-500 dark:text-slate-300 font-medium block">{{ getAQIInfo(aqi.usAqi).label }}</span>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 text-center">
                      <span class="text-[9px] text-slate-400 dark:text-slate-300 uppercase font-bold block">PM2.5</span>
                      <span class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ aqi.pm25 ?? '—' }}</span>
                      <span class="text-[9px] text-slate-500 dark:text-slate-300 font-medium block">µg/m³</span>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 text-center">
                      <span class="text-[9px] text-slate-400 dark:text-slate-300 uppercase font-bold block">PM10</span>
                      <span class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ aqi.pm10 ?? '—' }}</span>
                      <span class="text-[9px] text-slate-500 dark:text-slate-300 font-medium block">µg/m³</span>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 text-center">
                      <span class="text-[9px] text-slate-400 dark:text-slate-300 uppercase font-bold block">Ozone</span>
                      <span class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ aqi.ozone ?? '—' }}</span>
                      <span class="text-[9px] text-slate-500 dark:text-slate-300 font-medium block">µg/m³</span>
                    </div>
                  </div>
                </div>
              }

              <!-- Action Link to detailed 5-day view -->
              <div class="p-6 md:p-8 bg-white dark:bg-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 class="text-sm font-semibold text-slate-900 dark:text-white font-sans">Looking for high-fidelity forecast trends?</h4>
                  <p class="text-xs text-slate-500 dark:text-slate-300 mt-0.5">Explore 5-day temperature gradients, charting, precipitation summaries, and climate projections.</p>
                </div>
                <a [routerLink]="['/forecast', data.city.latitude, data.city.longitude, data.city.name]"
                   id="view-forecast-details-btn"
                   class="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 border border-slate-900 dark:border-slate-700 text-white font-medium hover:bg-slate-800 hover:border-slate-800 transition-all text-sm w-full md:w-auto justify-center shadow-xs">
                  View 5-Day Forecast
                  <mat-icon>insights</mat-icon>
                </a>
              </div>
            </div>
          }
        </div>

      </div>
    </div>
  `,
  styleUrls: [],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class Dashboard implements OnInit, OnDestroy {
  manager = inject(WeatherManager);
  router = inject(Router);

  searchCtrl = new FormControl('');
  suggestions = signal<City[]>([]);
  isSuggesting = signal<boolean>(false);
  isGeoLoading = signal<boolean>(false);
  focusedInput = false;

  private sub?: Subscription;

  getCond(code: number) { return getWeatherCondition(code); }
  getAQIInfo = getAQIInfo;
  formatTemp = formatTemp;

  ngOnInit() {
    this.sub = this.searchCtrl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(value => {
        if (!value || value.trim().length < 2) {
          this.suggestions.set([]);
          return of([]);
        }
        this.isSuggesting.set(true);
        return this.manager.searchCities(value).pipe(catchError(() => of([])));
      })
    ).subscribe(cities => {
      this.suggestions.set(cities);
      this.isSuggesting.set(false);
      this.focusedInput = true;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  selectSuggestedCity(city: City) {
    this.manager.selectCity(city);
    this.suggestions.set([]);
    this.searchCtrl.setValue('', { emitEvent: false });
    this.focusedInput = false;
  }

  retryCurrentCity() {
    this.manager.selectCity(this.manager.currentCity());
  }

  locateMe() {
    this.isGeoLoading.set(true);
    this.manager.triggerGeolocation().subscribe({
      next: (gpsCity) => {
        this.isGeoLoading.set(false);
        this.manager.selectCity(gpsCity);
      },
      error: (err) => {
        console.error(err);
        this.isGeoLoading.set(false);
        alert(err.message || 'Geolocation access declined or unavailable. Please enable permissions.');
      }
    });
  }
}
