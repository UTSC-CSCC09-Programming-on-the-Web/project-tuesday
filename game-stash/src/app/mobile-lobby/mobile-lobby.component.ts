import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AdminSocketService } from '../services/admin.socket.service';
import { PlayerSocketService } from '../services/player.socket.service';
import { Subscription, map } from 'rxjs';

@Component({
  selector: 'app-mobile-lobby',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobile-lobby.component.html',
  styleUrls: ['./mobile-lobby.component.css'],
})
export class MobileLobbyComponent implements OnInit, OnDestroy {
  lobbyCode = signal('');
  playerName = signal('');
  connectionStatus = signal('Connected to lobby');
  selectedGame = signal('');

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminSocketService: AdminSocketService,
    private playerSocketService: PlayerSocketService,
  ) {}

  ngOnInit(): void {
    // Get lobby details from query parameters
    if (!this.playerSocketService.checkConnection()) {
      this.router.navigate(['/mobile-join-lobby']);
      return;
    }
    this.setupSocketSubscriptions();
  }

  private setupSocketSubscriptions(): void {
    // Subscribe to selected game for navigation
    this.subscriptions.push(
      this.playerSocketService.playerState$
        .pipe(map((playerState) => playerState.selectedGame))
        .subscribe((gameId) => {
          if (gameId) {
            this.selectedGame.set(gameId);
            this.navigateToGame(gameId);
          }
        }),
    );
    this.subscriptions.push(
      this.playerSocketService.playerState$
        .pipe(map((playerState) => playerState.playerName))
        .subscribe((playerName) => {
          if (playerName) {
            this.playerName.set(playerName);
          }
        }),
    );
    this.subscriptions.push(
      this.playerSocketService.playerState$
        .pipe(map((playerState) => playerState.lobbyCode))
        .subscribe((lobbyCode) => {
          if (lobbyCode) {
            this.lobbyCode.set(lobbyCode);
          } else {
            this.router.navigate(['/mobile-join-lobby']);
          }
        }),
    );
  }

  private navigateToGame(gameId: string): void {
    if (gameId === 'Load Balancing')
      this.router.navigate(['/mobile-load-balancing'], {
        queryParams: {
          lobbyCode: this.lobbyCode(),
          playerName: this.playerName(),
          selectedGame: gameId,
          roundNumber: 1,
        },
      });
    else if (gameId === 'Magic Number')
      this.router.navigate(['/mobile-magic-number'], {
        queryParams: {
          lobbyCode: this.lobbyCode(),
          playerName: this.playerName(),
          selectedGame: gameId,
          roundNumber: 1,
        },
      });
    else if (gameId === 'Throw and Catch') {
      console.log('attempt to navigate to throw and catch');
      this.router.navigate(['/mobile-throw-and-catch'], {
        queryParams: {
          lobbyCode: this.lobbyCode(),
          playerName: this.playerName(),
          selectedGame: gameId,
          roundNumber: 1,
        },
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onLeaveLobby(): void {
    this.playerSocketService.leaveLobby();
    this.router.navigate(['/mobile-join-lobby']);
  }
}
