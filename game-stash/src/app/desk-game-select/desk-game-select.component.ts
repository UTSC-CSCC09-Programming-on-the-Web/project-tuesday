import { Component, Input } from '@angular/core';
import { DeskMagicNumberComponent } from '../desk-magic-number/desk-magic-number.component';
import { io } from 'socket.io-client';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminSocketService } from '../services/admin.socket.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { DeskLoadBalancingComponent } from "../desk-load-balancing/desk-load-balancing.component";
import { map } from 'rxjs';
import { Player } from '../services/socket.service.constants';

@Component({
  selector: 'app-desk-game-select',
  imports: [
    DeskMagicNumberComponent,
    CommonModule,
    MatFormFieldModule,
    MatListModule,
    DeskLoadBalancingComponent
],
  templateUrl: './desk-game-select.component.html',
  styleUrl: './desk-game-select.component.css',
})
export class DeskGameSelectComponent {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminSocketService: AdminSocketService,
  ) {}

  players: Player[] = [];
  lobbyName: string = '';
  lobbyCode: string = '';

  games: string[] = [
    'Magic Number',
    'Load Balancing',
    'exampleGame2',
    'exampleGame3',
  ];

  selectedGame: string = '';

  ngOnInit() {
    this.route.queryParams.subscribe((value) => {
      this.adminSocketService.setLobby(value['lobbyName'], value['lobbyCode']);
      this.lobbyName = this.adminSocketService.getLobbyName();
      this.lobbyCode = this.adminSocketService.getLobbyCode();
    });

    this.adminSocketService.connectToSocket();

    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.players))
      .subscribe((players) => {
        console.log('Players in lobby:', players);
        this.players = players
      });
  }

  openNewTab() {
    const url = this.router.serializeUrl(
      this.router.createUrlTree([
        '/player',
        this.adminSocketService.getLobbyCode(),
      ]),
    );
    window.open(url, '_blank');
  }

  resetGame() {
    this.selectedGame = '';
    this.adminSocketService.resetGameState();
  }

  playGame(game: string) {
    if (game === 'Magic Number') {
      if (this.players.length < 2) {
        alert('At least 2 players are required to start the game.');
      } else {
        this.selectedGame = 'Magic Number';
      }
    } else if (game === 'Load Balancing'){
      this.selectedGame = 'Load Balancing';
    } else {
      console.error('Game not implemented:', game);
    }
  }
}
