import { Component, Input } from '@angular/core';
import { DeskMagicNumberComponent } from '../desk-magic-number/desk-magic-number.component';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminSocketService } from '../services/admin.socket.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { DeskLoadBalancingComponent } from '../desk-load-balancing/desk-load-balancing.component';
import { DeskThrowCatchComponent } from '../desk-throw-catch/desk-throw-catch.component';
import { map } from 'rxjs';
import { GlobalRanking, Player } from '../services/socket.service.constants';

@Component({
  selector: 'app-desk-game-select',
  imports: [
    DeskMagicNumberComponent,
    CommonModule,
    MatFormFieldModule,
    MatListModule,
    DeskLoadBalancingComponent,
    DeskThrowCatchComponent,
  ],
  templateUrl: './desk-game-select.component.html',
  styleUrl: './desk-game-select.component.css',
})
export class DeskGameSelectComponent {
  constructor(
    private router: Router,
    private adminSocketService: AdminSocketService,
  ) {}

  players: Player[] = [];
  rankings: GlobalRanking = {};
  lobbyName: string = '';
  lobbyCode: string = '';

  games: string[] = ['Magic Number', 'Load Balancing', 'Throw and Catch'];

  selectedGame: string = '';

  ngOnInit() {
    if (!this.adminSocketService.checkConnection()) {
      this.router.navigate(['/desk-create-lobby'])
    }
    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.playerRankings))
      .subscribe((players) => {
        this.players = players.map((player) => player.player);
      });
    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.globalRankings))
      .subscribe((globalRankings) => {
        this.rankings = globalRankings;
        this.players.sort((a, b) => {
          const aRank = this.rankings[a.playerId]?.points || 0;
          const bRank = this.rankings[b.playerId]?.points || 0;
          return bRank - aRank;
        });
      });
    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.lobbyCode))
      .subscribe((code) => {
        this.lobbyCode = code;
      });

    /* Done so that in case there is some screw-up on the frontend  */
    setInterval(() => {
      this.adminSocketService.lobbyEmit('stats', {}, (response: any) => {
        for (const player of this.players) {
          if (response.data.players[player.playerId] === undefined) {
            this.adminSocketService.removePlayer(player.playerId);
          }
        }
      });
    }, 10000);
  }

  openNewTab() {
    const url = this.router.serializeUrl(
      this.router.createUrlTree([
        '/player',
        this.lobbyCode,
      ]),
    );
    window.open(url, '_blank');
  }

  resetGame() {
    this.selectedGame = '';
    this.adminSocketService.resetGameState();
  }

  playGame(game: string) {
    // this.adminSocketService.lobbyEmit('stats', {});
    if (game === 'Magic Number') {
      if (this.players.length < 2) {
        alert('At least 2 players are required to start the game.');
      } else {
        this.adminSocketService.setRound(1, 3);
        this.selectedGame = 'Magic Number';
      }
    } else if (game === 'Load Balancing') {
      this.adminSocketService.setRound(1, 1);
      this.selectedGame = 'Load Balancing';
    } else if (game === 'Throw and Catch') {
      this.adminSocketService.setRound(1, 1);
      this.selectedGame = 'Throw and Catch';
    } else {
      console.error('Game not implemented:', game);
    }
  }
}
