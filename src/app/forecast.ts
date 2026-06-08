import {Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {WeatherManager, City, WeatherData, DailyForecast, getWeatherCondition} from './weather';

@Component({
  selector: 'app-forecast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      
      <!-- Back Header Navigation -->
      <nav class="mb-6 flex items-center justify-between">
        <a routerLink="/" 
           id="back-home-btn"
           class="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
          <mat-icon>arrow_back</mat-icon>
          Back to Dashboard
        </a>
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-bold bg-slate-100 border border-slate-200 text-slate-500 rounded px-2 py-0.5">
            5-Day Meteorological Insights
          </span>
        </div>
      </nav>

      <!-- Forecast Header Panel -->
      @if (isLoading()) {
        <div class="bg-white rounded-2xl border border-slate-100 p-8 shadow-xs flex flex-col items-center justify-center min-h-[400px] animate-pulse">
          <div class="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mb-4"></div>
          <p class="text-sm text-slate-500 font-medium">Downloading microclimate trend points...</p>
        </div>
      } @else if (errorMsg()) {
        <div class="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center shadow-xs">
          <mat-icon class="text-rose-500 text-3xl mb-2">cloud_off</mat-icon>
          <h3 class="text-md font-bold text-rose-950">Microclimate Connection Interrupted</h3>
          <p class="text-xs text-rose-700 mt-1 mb-4">{{ errorMsg() }}</p>
          <a routerLink="/" class="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium inline-flex items-center gap-1">
            <mat-icon class="text-sm">arrow_back</mat-icon> Return Home
          </a>
        </div>
      } @else if (forecastData(); as data) {
        
        <header class="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-xs mb-8">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2.5">
                <span class="text-xs font-mono font-bold uppercase bg-indigo-50 border border-indigo-200 text-indigo-600 px-2.5 py-0.5 rounded">
                  GPS Latitude & Longitude Verified
                </span>
              </div>
              <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mt-3 font-sans">
                {{ data.city.name }} Trend Forecast
              </h1>
              <p class="text-xs text-slate-500 mt-0.5 font-mono">
                Coordinates: {{ data.city.latitude }}°N, {{ data.city.longitude }}°E | Timezone: Auto
              </p>
            </div>

            <!-- Mini Summary Box -->
            <div class="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3.5 max-w-xs">
              <span class="material-icons text-3xl text-indigo-500 bg-white p-2 border border-slate-150 rounded-xl shadow-2xs">wb_sunny</span>
              <div>
                <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Extreme Peaks</h4>
                <p class="text-sm font-bold text-slate-800 leading-snug mt-0.5">
                  High: {{ getGlobalMax(data.forecast) }}°C / Low: {{ getGlobalMin(data.forecast) }}°C
                </p>
              </div>
            </div>
          </div>
        </header>

        <!-- Temperature Line Chart Section -->
        <section class="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-xs mb-8">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
            <div>
              <h2 class="text-base font-bold text-slate-900 font-sans">High & Low Temperature Gradient</h2>
              <p class="text-xs text-slate-400 mt-0.5">Compare daily temperature peaks and valleys over 5 contiguous days</p>
            </div>
            
            <!-- Custom Chart Legend -->
            <div class="flex items-center gap-4 text-xs font-medium text-slate-600 self-start">
              <span class="flex items-center gap-1.5">
                <span class="w-3 h-1.5 rounded-full bg-rose-500 block"></span> High Temp
              </span>
              <span class="flex items-center gap-1.5">
                <span class="w-3 h-1.5 rounded-full bg-blue-500 block"></span> Low Temp
              </span>
            </div>
          </div>

          <!-- Responsive Custom SVG Chart Wrapper -->
          <div class="w-full relative pt-2">
            @let svg = getChartCoordinates(data.forecast);
            <div class="w-full overflow-x-auto select-none" id="svg-chart-container">
              <svg viewBox="0 0 600 240" class="w-full min-w-[500px] h-60">
                <defs>
                  <linearGradient id="rose-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.1" />
                    <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.0" />
                  </linearGradient>
                  <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.08" />
                    <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
                  </linearGradient>
                </defs>

                <!-- Grid lines background -->
                <line x1="50" y1="30" x2="550" y2="30" stroke="#f1f5f9" stroke-width="1.5" stroke-dasharray="3" />
                <line x1="50" y1="85" x2="550" y2="85" stroke="#f1f5f9" stroke-width="1.5" stroke-dasharray="3" />
                <line x1="50" y1="140" x2="550" y2="140" stroke="#f1f5f9" stroke-width="1.5" stroke-dasharray="3" />
                <line x1="50" y1="195" x2="550" y2="195" stroke="#f1f5f9" stroke-width="1.5" stroke-dasharray="3" />

                <!-- Vertical guidelines for each day code -->
                @for (p of svg.pointsMax; track $index) {
                  <line [attr.x1]="p.x" y1="30" [attr.x2]="p.x" y2="195" stroke="#f8fafc" stroke-width="1.5" />
                }

                <!-- Max Temp Gradient Area under the curve -->
                <path [attr.d]="svg.pathMaxArea" fill="url(#rose-grad)" />
                <!-- Min Temp Gradient Area under the curve -->
                <path [attr.d]="svg.pathMinArea" fill="url(#blue-grad)" />

                <!-- Path Max -->
                <path [attr.d]="svg.lineMax" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                <!-- Path Min -->
                <path [attr.d]="svg.lineMin" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

                <!-- Point nodes Max Temp -->
                @for (p of svg.pointsMax; track p.label) {
                  <circle [attr.cx]="p.x" [attr.cy]="p.y" r="5" fill="#ffffff" stroke="#ef4444" stroke-width="2.5" class="transition-all hover:r-7 duration-200" />
                  <!-- High Tech Value text labels -->
                  <text [attr.x]="p.x" [attr.y]="p.y - 12" fill="#ef4444" font-size="11" font-weight="600" font-family="monospace" text-anchor="middle">
                    {{ p.val }}°
                  </text>
                }

                <!-- Point nodes Min Temp -->
                @for (p of svg.pointsMin; track p.label) {
                  <circle [attr.cx]="p.x" [attr.cy]="p.y" r="5" fill="#ffffff" stroke="#3b82f6" stroke-width="2.5" class="transition-all hover:r-7 duration-200" />
                  <!-- Low Tech Value text labels -->
                  <text [attr.x]="p.x" [attr.y]="p.y + 18" fill="#3b82f6" font-size="11" font-weight="600" font-family="monospace" text-anchor="middle">
                    {{ p.val }}°
                  </text>
                }

                <!-- X Axis Labels (Days of Week) -->
                @for (p of svg.pointsMax; track p.label; let i = $index) {
                  <text [attr.x]="p.x" y="225" fill="#64748b" font-weight="600" font-size="10.5" text-anchor="middle">
                    {{ p.label }}
                  </text>
                }
              </svg>
            </div>
          </div>
        </section>

        <!-- Detailed Cards Grid -->
        <section class="mb-8">
          <h2 class="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
            <mat-icon class="text-blue-500">grid_view</mat-icon>
            Detailed Daily Meteorological Breakdown
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            @for (day of data.forecast; track day.date; let idx = $index) {
              @let cCond = getCond(day.weatherCode);
              <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs flex flex-col items-center justify-between text-center transition-all hover:scale-[1.03] group">
                <!-- Day Title -->
                <div>
                  <h3 class="font-bold text-slate-800 text-sm tracking-wide font-sans group-hover:text-indigo-600 transition-colors">
                    {{ getDayOfWeek(day.date) }}
                  </h3>
                  <p class="text-[10px] text-slate-400 font-mono mt-0.5">{{ formatDateFormatted(day.date) }}</p>
                </div>

                <!-- Weather visual conditions -->
                <div class="my-4 flex flex-col items-center gap-1.5">
                  <span class="material-icons text-3xl p-3 rounded-full {{ cCond.textColor }} {{ cCond.cardBg }} group-hover:scale-110 transition-transform">
                    {{ cCond.icon }}
                  </span>
                  <span class="text-xs font-semibold text-slate-700 font-sans tracking-tight leading-tight block">
                    {{ cCond.label }}
                  </span>
                </div>

                <!-- Min Max Temperature span -->
                <div class="w-full border-t border-slate-50 pt-3.5">
                  <div class="flex items-center justify-around gap-1">
                    <div>
                      <span class="text-[9px] text-slate-400 uppercase font-bold block">Max</span>
                      <span class="text-sm font-bold text-rose-500 font-sans">{{ day.tempMax }}°C</span>
                    </div>
                    <div class="w-px h-6 bg-slate-100"></div>
                    <div>
                      <span class="text-[9px] text-slate-400 uppercase font-bold block">Min</span>
                      <span class="text-sm font-bold text-blue-500 font-sans">{{ day.tempMin }}°C</span>
                    </div>
                  </div>
                </div>

                <!-- Secondary environmental gauges inside cards -->
                <div class="w-full mt-3 bg-slate-50/70 py-1.5 px-2.5 rounded-lg border border-slate-100 divide-y divide-slate-100 flex flex-col text-[10px] text-slate-500 gap-1 font-sans">
                  <div class="flex items-center justify-between pb-1">
                    <span class="text-slate-400">Wind</span>
                    <span class="font-semibold text-slate-700">{{ day.windSpeedMax }} km/h</span>
                  </div>
                  <div class="flex items-center justify-between pt-1">
                    <span class="text-slate-400">Rain</span>
                    <span class="font-semibold text-slate-700">{{ day.precipitation }} mm</span>
                  </div>
                </div>

              </div>
            }
          </div>
        </section>

      }
    </div>
  `,
  styleUrls: []
})
export class Forecast implements OnInit {
  private route = inject(ActivatedRoute);
  private manager = inject(WeatherManager);

  forecastData = signal<WeatherData | null>(null);
  isLoading = signal<boolean>(true);
  errorMsg = signal<string | null>(null);

  getCond(code: number) {
    return getWeatherCondition(code);
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const latStr = params.get('lat');
      const lonStr = params.get('lon');
      const name = params.get('name') || 'Selected City';

      if (latStr && lonStr) {
        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        const targetCity: City = {
          id: idxIdGen(lat, lon),
          name: name,
          latitude: lat,
          longitude: lon
        };
        this.fetchWeatherData(targetCity);
      } else {
        this.errorMsg.set('Invalid coordinate parameters specified in router transition.');
        this.isLoading.set(false);
      }
    });
  }

  private fetchWeatherData(city: City) {
    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.manager.configWeather(city).subscribe({
      next: (data) => {
        this.forecastData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMsg.set('Unable to download weather trends. Please check network connections.');
        this.isLoading.set(false);
      }
    });
  }

  getDayOfWeek(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dt = new Date(dateStr);
      return days[dt.getDay()];
    } catch {
      return dateStr;
    }
  }

  formatDateFormatted(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const dt = new Date(dateStr);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  getGlobalMax(list: DailyForecast[]): number {
    return Math.max(...list.map(d => d.tempMax));
  }

  getGlobalMin(list: DailyForecast[]): number {
    return Math.min(...list.map(d => d.tempMin));
  }

  // Pure mathematical SVG projecting
  getChartCoordinates(list: DailyForecast[]) {
    // Horizontal space constraints
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

    // Project coordinates
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

    // Generate line-strings for path
    const lineMax = pointsMax.reduce((path, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
    }, '');

    const lineMin = pointsMin.reduce((path, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
    }, '');

    // Area path formulas
    const pathMaxArea = `${lineMax} L ${pointsMax[count - 1].x} ${height - paddingY} L ${pointsMax[0].x} ${height - paddingY} Z`;
    const pathMinArea = `${lineMin} L ${pointsMin[count - 1].x} ${height - paddingY} L ${pointsMin[0].x} ${height - paddingY} Z`;

    return {
      pointsMax,
      pointsMin,
      lineMax,
      lineMin,
      pathMaxArea,
      pathMinArea
    };
  }
}

function idxIdGen(lat: number, lon: number): number {
  return Math.abs(Math.round(lat * 1000) + Math.round(lon * 1000));
}
