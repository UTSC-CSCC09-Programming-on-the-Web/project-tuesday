import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AdminSocketService,
  PlayerRanking,
  GameState,
} from '../services/admin.socket.service';
import { PlayerSocketService } from '../services/player.socket.service';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-mobile-rankings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobile-rankings.component.html',
  styleUrls: ['./mobile-rankings.component.css'],
})
export class MobileRankingsComponent implements OnInit, OnDestroy {
  targetNumber = signal(0);
  rankings = signal<PlayerRanking[]>([]);
  playerRank = signal(0);
  isGameOver = signal(false);
  countdown = signal(10);

  // Signals to store data from route parameters
  lobbyCode = signal('');
  playerName = signal('');
  roundNumber = signal(1);
  selectedGame = signal('');
  guess = signal(0);

  private countdownInterval?: number;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminSocketService: AdminSocketService,
    private playerSocketService: PlayerSocketService,
  ) {}

  ngOnInit(): void {
    console.log('PhoneRankings: Component initialized');

    // Reset all signals to default values
    this.targetNumber.set(0);
    this.rankings.set([]);
    this.playerRank.set(0);
    this.isGameOver.set(false);
    this.countdown.set(10);
    this.lobbyCode.set('');
    this.playerName.set('');
    this.roundNumber.set(1);
    this.selectedGame.set('');
    this.guess.set(0);

    console.log('PhoneRankings: All signals reset to defaults');

    // Read all parameters from route
    this.subscriptions.push(
      this.route.queryParams.subscribe((params) => {
        const lobbyCode = params['lobbyCode'];
        const playerName = params['playerName'];
        const roundNumber = params['roundNumber'];
        const selectedGame = params['selectedGame'] || 'Magic Number';
        const guess = params['guess'];

        if (!lobbyCode || !playerName) {
          console.error('PhoneRankings: Missing required parameters');
          this.router.navigate(['/mobile-join-lobby']);
          return;
        }

        this.lobbyCode.set(lobbyCode);
        this.playerName.set(playerName);
        this.roundNumber.set(roundNumber ? parseInt(roundNumber) : 1);
        this.selectedGame.set(selectedGame);
        this.guess.set(guess ? parseInt(guess) : 0);

        console.log('PhoneRankings: Loaded parameters', {
          lobbyCode: this.lobbyCode(),
          playerName: this.playerName(),
          roundNumber: this.roundNumber(),
          selectedGame: this.selectedGame(),
          guess: this.guess(),
        });

        // Determine if this is the final round
        this.isGameOver.set(this.roundNumber() >= 5);

        if (this.isGameOver()) {
          // Emit gameEnded to backend as soon as final rankings screen is shown
          this.adminSocketService.emitGameEnded();
        }

        if (!this.isGameOver()) {
          this.startCountdown();
        }
      }),
    );

    // Subscribe to rankings from AdminSocketService
    this.subscriptions.push(
      this.adminSocketService.gameState$
        .pipe(map((gameState) => gameState.playerRankings))
        .subscribe((rankings) => {
          this.rankings.set(rankings);

          // Find current player's rank based on socket ID
          const socketId = this.adminSocketService.getSocketId();
          if (socketId) {
            const currentPlayerRanking = rankings.find(
              (r) => r.playerId === socketId,
            );
            if (currentPlayerRanking) {
              this.playerRank.set(currentPlayerRanking.rank);
            }
          }
        }),
    );

    this.subscriptions.push(
      this.adminSocketService.gameState$
        .pipe(map((gameState) => gameState.data))
        .subscribe((targetNumber) => {
          this.targetNumber.set(targetNumber);
        }),
    );
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private startCountdown(): void {
    console.log(
      'PhoneRankings: Starting countdown for round',
      this.roundNumber(),
    );
    this.countdownInterval = window.setInterval(() => {
      const current = this.countdown();
      console.log('PhoneRankings: Countdown tick:', current);
      if (current > 1) {
        this.countdown.set(current - 1);
      } else {
        console.log('PhoneRankings: Countdown finished, moving to next round');
        this.stopCountdown();
        this.moveToNextRound();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private moveToNextRound(): void {
    // Reset round-specific parameters for next round
    console.log('PhoneRankings: Resetting round-specific state');
    this.countdown.set(10);
    this.rankings.set([]);
    this.targetNumber.set(0);
    this.playerRank.set(0);

    const nextRound = this.roundNumber() + 1;
    console.log('PhoneRankings: Moving to next round', nextRound);
    this.router.navigate(['/mobile-magic-number'], {
      queryParams: {
        lobbyCode: this.lobbyCode(),
        playerName: this.playerName(),
        roundNumber: nextRound,
        selectedGame: this.selectedGame() || 'Magic Number',
      },
    });
  }

  onStayInLobby(): void {
    this.router.navigate(['/mobile-lobby'], {
      queryParams: {
        lobbyCode: this.lobbyCode(),
        playerName: this.playerName(),
      },
    });
  }

  onLeaveLobby(): void {
    console.log('PhoneRankings: User clicked leave lobby');
    this.playerSocketService.leaveLobby();
    this.router.navigate(['/mobile-join-lobby']);
  }

  getPlayerPoints(): number {
    const socketId = this.adminSocketService.getSocketId();
    if (!socketId) return 0;

    const playerRanking = this.rankings().find((p) => p.playerId === socketId);
    return playerRanking ? playerRanking.points : 0;
  }

  getRoundWinners(): string[] {
    return this.rankings()
      .filter((player) => player.isRoundWinner)
      .map((player) => player.name);
  }

  getRankSuffix(rank: number): string {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  }
}
