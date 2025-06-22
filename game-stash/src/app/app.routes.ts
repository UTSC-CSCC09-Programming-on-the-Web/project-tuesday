import { Routes } from '@angular/router';
import { MobileGameSelectComponent } from './mobile-game-select/mobile-game-select.component';
import { DeskCreateLobbyComponent } from './desk-create-lobby/desk-create-lobby.component';
import { DeskGameSelectComponent } from './desk-game-select/desk-game-select.component';
import { DeviceRedirectComponent } from './device-redirect/device-redirect.component';

export const routes: Routes = [
  { path: 'lobby', component: DeskGameSelectComponent },
  { path: 'player/:lobbyCode', component: MobileGameSelectComponent },
  { path: 'create-lobby', component: DeskCreateLobbyComponent},
  { path: '', component: DeviceRedirectComponent },
  { path: '', redirectTo: '/', pathMatch: 'full' }, // default route
  { path: '**', redirectTo: '/' } // catch-all
];
