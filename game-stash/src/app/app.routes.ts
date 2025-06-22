import { Routes } from '@angular/router';
import { MobileGameSelectComponent } from './mobile-game-select/mobile-game-select.component';
import { DeskCreateLobbyComponent } from './desk-create-lobby/desk-create-lobby.component';
import { DeskGameSelectComponent } from './desk-game-select/desk-game-select.component';
import { DeviceRedirectComponent } from './device-redirect/device-redirect.component';

export const routes: Routes = [
  { path: 'lobby', component: DeskGameSelectComponent },
  { path: 'player/:lobbyCode', component: MobileGameSelectComponent },
  { path: 'create-lobby', component: DeskCreateLobbyComponent},
  {
    path: 'phone-join-lobby',
    loadComponent: () => import('./phone-join-lobby/phone-join-lobby.component').then(m => m.PhoneJoinLobbyComponent)
  },
  {
    path: 'phone-lobby',
    loadComponent: () => import('./phone-lobby/phone-lobby.component').then(m => m.PhoneLobbyComponent)  },  {
    path: 'phone-guessing-game',
    loadComponent: () => import('./phone-guessing-game/phone-guessing-game.component').then(m => m.PhoneGuessingGameComponent)
  },  {
    path: 'phone-guessing-game-waiting',
    loadComponent: () => import('./phone-guessing-game-waiting/phone-guessing-game-waiting.component').then(m => m.PhoneGuessingGameWaitingComponent)
  },
  {
    path: 'phone-rankings',
    loadComponent: () => import('./phone-rankings/phone-rankings.component').then(m => m.PhoneRankingsComponent)
  },
  { path: '', component: DeviceRedirectComponent },
  { path: '', redirectTo: '/', pathMatch: 'full' }, // default route
  { path: '**', redirectTo: '/' }, // catch-all
];
