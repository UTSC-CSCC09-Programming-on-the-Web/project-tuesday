import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/phone-join-lobby',
    pathMatch: 'full'
  },
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
  }
];
