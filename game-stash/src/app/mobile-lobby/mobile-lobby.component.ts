import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AdminSocketService,
  GameState,
} from '../services/admin.socket.service';
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
    this.subscriptions.push(
      this.route.queryParams.subscribe((params) => {
        const lobbyCode = params['lobbyCode'];
        const playerName = params['playerName'];

        if (!lobbyCode || !playerName) {
          // Redirect to join lobby if missing required parameters
          this.router.navigate(['/mobile-join-lobby']);
          return;
        }

        this.lobbyCode.set(lobbyCode);
        this.playerName.set(playerName);

        this.setupSocketSubscriptions();
      }),
    );
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
  }

  private navigateToGame(gameId: string): void {
    if (gameId === 'Load Balancing')
      this.router.navigate(['/mobile-load-balancing'], {
        queryParams: {
          lobbyCode: this.lobbyCode(),
          playerName: this.playerName(),
          selectedGame: gameId,
          roundNumber: 1
        }
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
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onLeaveLobby(): void {
    this.playerSocketService.leaveLobby();
    this.router.navigate(['/mobile-join-lobby']);
  }
}
