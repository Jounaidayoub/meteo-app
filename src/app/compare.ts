import {Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule, FormControl} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {Subscription, of} from 'rxjs';
import {debounceTime, distinctUntilChanged, switchMap, catchError} from 'rxjs/operators';
import {WeatherManager, City, getWeatherCondition, formatTemp} from './weather';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-compare',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="max-w-7xl mx-auto px-6 py-10 animate-fade-in" id="compare-viewport"
         [class.dark]="manager.isDarkMode()">
      
      <!-- Back navigation line -->
      <nav class="mb-6 flex items-center justify-between">
        <a routerLink="/" 
           id="to-dash-btn"
           class="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
          <mat-icon>arrow_back</mat-icon>
          Back to Dashboard
        </a>
        <span class="text-xs font-mono font-bold bg-indigo-50 border border-indigo-150 text-indigo-600 px-2 py-0.5 rounded">
          Dual City Weather Comparison
        </span>
      </nav>

      <!-- Comparison Header -->
      <header class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 md:p-10 shadow-xs mb-8">
        <div class="flex items-center gap-2">
          <span class="material-icons text-indigo-600 text-3xl font-semibold">compare_arrows</span>
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">Side-by-Side Comparison</h1>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-300 mt-1 font-sans">
          Select any two cities to compare current atmospheric elements and respective 5-day patterns
        </p>
      </header>

      <!-- Selection & Lookup Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        <!-- City A Selector -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-xs relative">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-indigo-500"></span> City A
            </h3>
            @if (manager.compareCityA(); as cityA) {
              <span class="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {{ cityA.name }}
              </span>
            }
          </div>

          <div class="relative">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-300">
              <mat-icon>place</mat-icon>
            </div>
            <input 
              [formControl]="searchACtrl"
              type="text"
              placeholder="Search City A..."
              id="search-a-input"
              class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100/70 dark:hover:bg-slate-600/50 focus:bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl outline-hidden border border-transparent focus:border-indigo-600/30 transition-all text-sm"
            />
            @if (isSuggestingA()) {
              <div class="absolute right-3 top-3.5">
                <div class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }
          </div>

          @if (suggestionsA().length > 0) {
            <div class="absolute left-4 right-4 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-xl z-50 overflow-hidden divide-y divide-slate-50 dark:divide-slate-700">
              @for (item of suggestionsA(); track item.id) {
                <button 
                  (click)="selectCityA(item)"
                  class="w-full text-left px-4 py-2.5 hover:bg-indigo-50/50 transition-colors flex items-center justify-between text-xs"
                >
                  <span class="font-medium text-slate-700 dark:text-slate-200">{{ item.name }}, {{ item.country }}</span>
                  <span class="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-mono px-1 rounded">{{ item.country_code }}</span>
                </button>
              }
            </div>
          }
        </div>

        <!-- City B Selector -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-xs relative">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-sky-500"></span> City B
            </h3>
            @if (manager.compareCityB(); as cityB) {
              <span class="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                {{ cityB.name }}
              </span>
            }
          </div>

          <div class="relative">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-300">
              <mat-icon>place</mat-icon>
            </div>
            <input 
              [formControl]="searchBCtrl"
              type="text"
              placeholder="Search City B..."
              id="search-b-input"
              class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100/70 dark:hover:bg-slate-600/50 focus:bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl outline-hidden border border-transparent focus:border-indigo-600/30 transition-all text-sm"
            />
            @if (isSuggestingB()) {
              <div class="absolute right-3 top-3.5">
                <div class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }
          </div>

          @if (suggestionsB().length > 0) {
            <div class="absolute left-4 right-4 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-xl z-50 overflow-hidden divide-y divide-slate-50 dark:divide-slate-700">
              @for (item of suggestionsB(); track item.id) {
                <button 
                  (click)="selectCityB(item)"
                  class="w-full text-left px-4 py-2.5 hover:bg-sky-50/50 transition-colors flex items-center justify-between text-xs"
                >
                  <span class="font-medium text-slate-700 dark:text-slate-200">{{ item.name }}, {{ item.country }}</span>
                  <span class="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-mono px-1 rounded">{{ item.country_code }}</span>
                </button>
              }
            </div>
          }
        </div>

      </div>

      <!-- Quick presets shortcuts -->
      <div class="flex flex-wrap items-center gap-3 mb-10 text-sm font-sans">
        <span class="text-slate-400 dark:text-slate-300 font-semibold uppercase tracking-wider">Presets:</span>
        <button (click)="applyPreset('London', 51.5085, -0.1257, 'United Kingdom', 'New York', 40.7143, -74.006, 'United States')" 
                class="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg text-slate-500 dark:text-slate-300 font-medium transition-all shadow-3xs border border-transparent hover:border-indigo-150">
          London vs New York
        </button>
        <button (click)="applyPreset('Paris', 48.8534, 2.3488, 'France', 'Tokyo', 35.6895, 139.6917, 'Japan')" 
                class="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg text-slate-500 dark:text-slate-300 font-medium transition-all shadow-3xs border border-transparent hover:border-indigo-150">
          Paris vs Tokyo
        </button>
        <button (click)="applyPreset('Rome', 41.8919, 12.5113, 'Italy', 'Cairo', 30.0626, 31.2497, 'Egypt')" 
                class="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg text-slate-500 dark:text-slate-300 font-medium transition-all shadow-3xs border border-transparent hover:border-indigo-150">
          Rome vs Cairo
        </button>
      </div>

      <!-- Comparison loading shield -->
      @if (manager.isComparingLoading()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 shadow-xs flex flex-col items-center justify-center min-h-[300px] animate-pulse">
          <div class="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mb-4"></div>
          <p class="text-xs text-slate-500 dark:text-slate-300 font-semibold uppercase tracking-wider">Syncing comparative matrices...</p>
        </div>
      }

      <!-- Comparison metrics board -->
      @else if (manager.compareDataA(); as dataA) {
        @if (manager.compareDataB(); as dataB) {
          
          @let difference = getTempDiff(dataA.current.temperature, dataB.current.temperature);
          <div class="mb-8 p-5 bg-gradient-to-r from-indigo-500/10 to-sky-500/10 border border-slate-150 rounded-2xl flex items-center gap-4 shadow-3xs">
            <span class="material-icons text-indigo-600 text-3xl">lightbulb</span>
            <div>
              <h4 class="text-sm font-bold text-slate-900 dark:text-white font-sans">Comparative Intel</h4>
              <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {{ dataA.city.name }}'s current temperature is 
                <span class="font-extrabold text-indigo-700">
                  @if (difference === 0) {
                    identical to
                  } @else {
                    {{ abs(difference) }}°C {{ difference > 0 ? 'warmer than' : 'cooler than' }}
                  }
                </span> 
                {{ dataB.city.name }}.
              </p>
            </div>
          </div>

          <!-- Comparison Table with horizontal scroll for mobile -->
          <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden shadow-2xs mb-8" id="comparison-results-panel">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[400px] text-center border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-400 dark:text-slate-300 tracking-wider">
                    <th class="py-5 px-6 text-left max-w-[140px]">Atmospheric Element</th>
                    <th class="py-5 px-6 text-indigo-600 font-extrabold text-sm">{{ dataA.city.name }}</th>
                    <th class="py-5 px-6 text-sky-600 font-extrabold text-sm">{{ dataB.city.name }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200">
                  
                  <!-- Current Temp -->
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td class="py-5 px-6 text-left font-sans font-semibold text-slate-500 dark:text-slate-300 text-xs uppercase tracking-wide">
                      Temperature
                    </td>
                    <td class="py-5 px-6 font-mono text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                      {{ formatTemp(dataA.current.temperature, manager.temperatureUnit()) }}
                    </td>
                    <td class="py-5 px-6 font-mono text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                      {{ formatTemp(dataB.current.temperature, manager.temperatureUnit()) }}
                    </td>
                  </tr>

                  <!-- Feels like -->
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td class="py-5 px-6 text-left font-sans font-semibold text-slate-500 dark:text-slate-300 text-xs uppercase tracking-wide">
                      Feels Like
                    </td>
                    <td class="py-5 px-6 font-mono">
                      {{ formatTemp(dataA.current.feelsLike, manager.temperatureUnit()) }}
                    </td>
                    <td class="py-5 px-6 font-mono">
                      {{ formatTemp(dataB.current.feelsLike, manager.temperatureUnit()) }}
                    </td>
                  </tr>

                  <!-- Condition -->
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td class="py-5 px-6 text-left font-sans font-semibold text-slate-500 dark:text-slate-300 text-xs uppercase tracking-wide">
                      Sky Condition
                    </td>
                    <td class="py-5 px-6">
                      @let condA = getCond(dataA.current.weatherCode);
                      <div class="flex items-center justify-center gap-2">
                        <span class="material-icons text-xl {{ condA.textColor }}">{{ condA.icon }}</span>
                        <span class="font-sans font-bold text-slate-800 dark:text-slate-100">{{ condA.label }}</span>
                      </div>
                    </td>
                    <td class="py-5 px-6">
                      @let condB = getCond(dataB.current.weatherCode);
                      <div class="flex items-center justify-center gap-2">
                        <span class="material-icons text-xl {{ condB.textColor }}">{{ condB.icon }}</span>
                        <span class="font-sans font-bold text-slate-800 dark:text-slate-100">{{ condB.label }}</span>
                      </div>
                    </td>
                  </tr>

                  <!-- Humidity -->
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td class="py-5 px-6 text-left font-sans font-semibold text-slate-500 dark:text-slate-300 text-xs uppercase tracking-wide">
                      Humidity
                    </td>
                    <td class="py-5 px-6 font-mono">
                      {{ dataA.current.humidity }}%
                    </td>
                    <td class="py-5 px-6 font-mono">
                      {{ dataB.current.humidity }}%
                    </td>
                  </tr>

                  <!-- Wind -->
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td class="py-5 px-6 text-left font-sans font-semibold text-slate-500 dark:text-slate-300 text-xs uppercase tracking-wide">
                      Wind Speed
                    </td>
                    <td class="py-5 px-6 font-mono">
                      {{ dataA.current.windSpeed }} km/h
                    </td>
                    <td class="py-5 px-6 font-mono">
                      {{ dataB.current.windSpeed }} km/h
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

          <!-- Trend projection side-by-side columns -->
          <section>
            <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-5 flex items-center gap-2">
              <mat-icon class="text-indigo-500">trending_up</mat-icon>
              5-Day Forecast Patterns Comparison
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
              @for (dayA of dataA.forecast; track dayA.date; let idx = $index) {
                @let dayB = dataB.forecast[idx];
                <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-3xs flex flex-col justify-between text-center transition-all hover:scale-[1.03]">
                  
                  <div>
                    <span class="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans tracking-wide block">
                      {{ manager.getDayOfWeek(dayA.date) }}
                    </span>
                    <span class="text-[9px] text-slate-400 dark:text-slate-300 font-mono">{{ manager.formatDateFormatted(dayA.date) }}</span>
                  </div>

                  <div class="my-4 flex flex-col gap-3 text-xs w-full divide-y divide-slate-50 dark:divide-slate-700">
                    
                    <div class="pt-1.5 self-center">
                      <span class="text-[9px] text-indigo-500 font-extrabold uppercase tracking-widest block mb-0.5">
                        {{ dataA.city.name.slice(0, 3) }}
                      </span>
                      <div class="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1">
                        <span class="text-rose-500">{{ formatTemp(dayA.tempMax, manager.temperatureUnit()) }}</span>
                        <span class="text-slate-300 dark:text-slate-400">/</span>
                        <span class="text-blue-500">{{ formatTemp(dayA.tempMin, manager.temperatureUnit()) }}</span>
                      </div>
                    </div>

                    <div class="pt-3.5 self-center">
                      <span class="text-[9px] text-sky-500 font-extrabold uppercase tracking-widest block mb-0.5">
                        {{ dataB.city.name.slice(0, 3) }}
                      </span>
                      <div class="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1">
                        <span class="text-rose-500">{{ formatTemp(dayB.tempMax, manager.temperatureUnit()) }}</span>
                        <span class="text-slate-300 dark:text-slate-400">/</span>
                        <span class="text-blue-500">{{ formatTemp(dayB.tempMin, manager.temperatureUnit()) }}</span>
                      </div>
                    </div>

                  </div>

                  <div class="w-full bg-slate-50 dark:bg-slate-700/50 py-1.5 px-2 rounded-lg text-[9px] text-slate-500 dark:text-slate-300 font-mono">
                    High Diff: <span class="font-extrabold" [class.text-rose-600]="dayA.tempMax - dayB.tempMax > 0" [class.text-blue-600]="dayA.tempMax - dayB.tempMax < 0">
                      {{ (dayA.tempMax - dayB.tempMax) > 0 ? '+' : '' }}{{ (dayA.tempMax - dayB.tempMax).toFixed(1) }}°C
                    </span>
                  </div>

                </div>
              }
            </div>
          </section>

        }
      } @else {
        <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-10 text-center shadow-xs">
          <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-3xs">
            <mat-icon class="text-3xl">compare_arrows</mat-icon>
          </div>
          <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 font-sans">Cities Unselected</h3>
          <p class="text-xs text-slate-500 dark:text-slate-300 max-w-sm mx-auto mt-1 leading-normal">
            Input search strings for both slots above, select the preferred suggestions, and the comparative elements will dynamically render
          </p>
        </div>
      }

    </div>
  `,
  styleUrls: []
})
export class Compare implements OnInit, OnDestroy {
  manager = inject(WeatherManager);

  searchACtrl = new FormControl('');
  searchBCtrl = new FormControl('');

  suggestionsA = signal<City[]>([]);
  suggestionsB = signal<City[]>([]);

  isSuggestingA = signal<boolean>(false);
  isSuggestingB = signal<boolean>(false);

  private subA?: Subscription;
  private subB?: Subscription;

  getCond = getWeatherCondition;
  formatTemp = formatTemp;

  ngOnInit() {
    this.subA = this.searchACtrl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(value => {
        if (!value || value.trim().length < 2) {
          this.suggestionsA.set([]);
          return of([]);
        }
        this.isSuggestingA.set(true);
        return this.manager.searchCities(value).pipe(catchError(() => of([])));
      })
    ).subscribe(cities => {
      this.suggestionsA.set(cities);
      this.isSuggestingA.set(false);
    });

    this.subB = this.searchBCtrl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(value => {
        if (!value || value.trim().length < 2) {
          this.suggestionsB.set([]);
          return of([]);
        }
        this.isSuggestingB.set(true);
        return this.manager.searchCities(value).pipe(catchError(() => of([])));
      })
    ).subscribe(cities => {
      this.suggestionsB.set(cities);
      this.isSuggestingB.set(false);
    });

    if (!this.manager.compareCityA() || !this.manager.compareCityB()) {
      this.applyPreset(
        'London', 51.5085, -0.1257, 'United Kingdom', 
        'Paris', 48.8534, 2.3488, 'France'
      );
    }
  }

  ngOnDestroy() {
    this.subA?.unsubscribe();
    this.subB?.unsubscribe();
  }

  selectCityA(city: City) {
    this.manager.compareCityA.set(city);
    this.suggestionsA.set([]);
    this.searchACtrl.setValue('', { emitEvent: false });
    this.manager.fetchComparisonDetails();
  }

  selectCityB(city: City) {
    this.manager.compareCityB.set(city);
    this.suggestionsB.set([]);
    this.searchBCtrl.setValue('', { emitEvent: false });
    this.manager.fetchComparisonDetails();
  }

  applyPreset(
    nameA: string, latA: number, lonA: number, countryA: string,
    nameB: string, latB: number, lonB: number, countryB: string
  ) {
    const cityA: City = { id: 10001, name: nameA, latitude: latA, longitude: lonA, country: countryA };
    const cityB: City = { id: 10002, name: nameB, latitude: latB, longitude: lonB, country: countryB };
    
    this.manager.compareCityA.set(cityA);
    this.manager.compareCityB.set(cityB);
    this.manager.fetchComparisonDetails();
  }

  getTempDiff(tempA: number, tempB: number): number {
    return Number((tempA - tempB).toFixed(1));
  }

  abs(val: number): number {
    return Math.abs(val);
  }
}
