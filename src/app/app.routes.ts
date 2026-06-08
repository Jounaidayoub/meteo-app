import {Routes} from '@angular/router';
import {Dashboard} from './dashboard';
import {Forecast} from './forecast';
import {Compare} from './compare';

export const routes: Routes = [
  {path: '', component: Dashboard},
  {path: 'forecast/:lat/:lon/:name', component: Forecast},
  {path: 'compare', component: Compare},
  {path: '**', redirectTo: ''}
];
