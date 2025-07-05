import { Routes } from '@angular/router';
import { DeskCreateLobbyComponent } from './desk-create-lobby/desk-create-lobby.component';
import { DeskGameSelectComponent } from './desk-game-select/desk-game-select.component';
import { DeviceRedirectComponent } from './device-redirect/device-redirect.component';

export const routes: Routes = [
  { path: 'lobby', component: DeskGameSelectComponent },
  { path: 'player/:lobbyCode', redirectTo: '/mobile-join-lobby', pathMatch: 'full' },
  { path: 'create-lobby', component: DeskCreateLobbyComponent },
  {
    path: 'mobile-join-lobby',
    loadComponent: () => import('./mobile-join-lobby/mobile-join-lobby.component').then(m => m.MobileJoinLobbyComponent)
  },
  {
    path: 'mobile-lobby',
    loadComponent: () => import('./mobile-lobby/mobile-lobby.component').then(m => m.MobileLobbyComponent)
  },
  {
    path: 'mobile-load-balancing',
    loadComponent: () => import('./mobile-load-balancing/mobile-load-balancing.component').then(m => m.MobileLoadBalancingComponent)
  },
  {
    path: 'mobile-magic-number',
    loadComponent: () => import('./mobile-magic-number/mobile-magic-number.component').then(m => m.MobileMagicNumberComponent)
  },
  {
    path: 'mobile-magic-number-waiting',
    loadComponent: () => import('./mobile-magic-number-waiting/mobile-magic-number-waiting.component').then(m => m.MobileMagicNumberWaitingComponent)
  },
  {
    path: 'mobile-rankings',
    loadComponent: () => import('./mobile-rankings/mobile-rankings.component').then(m => m.MobileRankingsComponent)
  },
  { path: '', component: DeviceRedirectComponent },
  { path: '', redirectTo: '/', pathMatch: 'full' }, // default route
  { path: '**', redirectTo: '/' } // catch-all
];
