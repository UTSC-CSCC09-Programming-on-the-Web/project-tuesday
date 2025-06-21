import { Routes } from '@angular/router';
import { LobbyViewComponent } from './components/LobbyView/LobbyView';
import { PlayerViewComponent } from './components/PlayerView/PlayerView';
import { AppComponent } from './app.component';
import { DefaultViewComponent } from './components/DefaultView/DefaultView';
import { DeskCreateLobbyComponent } from './desk-create-lobby/desk-create-lobby.component';
import { DeskGameSelectComponent } from './desk-game-select/desk-game-select.component';
import { DeviceRedirectComponent } from './device-redirect/device-redirect.component';

export const routes: Routes = [
  { path: 'lobby', component: DeskGameSelectComponent },
  { path: 'player/:roomId', component: PlayerViewComponent },
  { path: 'create-lobby', component: DeskCreateLobbyComponent},
  { path: '', component: DeviceRedirectComponent },
  { path: '', redirectTo: '/', pathMatch: 'full' }, // default route
  { path: '**', redirectTo: '/' } // catch-all
];
