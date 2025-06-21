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
    loadComponent: () => import('./phone-lobby/phone-lobby.component').then(m => m.PhoneLobbyComponent)
  }
];
