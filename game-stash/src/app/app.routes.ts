import { Routes } from '@angular/router';
import { LobbyViewComponent } from './components/LobbyView/LobbyView';
import { PlayerViewComponent } from './components/PlayerView/PlayerView';
import { AppComponent } from './app.component';
import { DefaultViewComponent } from './components/DefaultView/DefaultView';

export const routes: Routes = [
  { path: 'lobby', component: LobbyViewComponent },
  { path: 'player/:roomId', component: PlayerViewComponent },
  {path: 'default', component: DefaultViewComponent},
  { path: '', redirectTo: '/default', pathMatch: 'full' }, // default route
  { path: '**', redirectTo: '/default' } // catch-all
];