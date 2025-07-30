import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AdminSocketService,
  GameState,
} from '../services/admin.socket.service';
import { PlayerRanking } from '../services/socket.service.constants';
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
  ranking = signal<PlayerRanking>({
    player: {
      name: '',
      playerId: '',
    },
    points: 0,
    rank: -1,
    isRoundWinner: false,
    data: -1, //variable field used differently by different games
  });
  playerRank = signal(0);
  isGameOver = signal(false);
  countdown = signal(10);

  // Signals to store data from route parameters
  lobbyCode = signal('');
  playerName = signal('');
  roundNumber = signal(1);
  finalRound = signal(3);
  selectedGame = signal('');
  guess = signal(0);

  private countdownInterval?: number;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playerSocketService: PlayerSocketService,
  ) {}

  ngOnInit(): void {
    this.playerSocketService.playerState$
      .pipe(
        map((state) => state))
      .subscribe((state) => {
        this.lobbyCode.set(state.lobbyCode);
        this.playerName.set(state.playerName);
        this.roundNumber.set(state.roundNumber);
        this.selectedGame.set(state.selectedGame);
        this.guess.set(state.ranking.data || 0);
        this.isGameOver.set(state.finalRound <= state.roundNumber);
        this.finalRound.set(state.finalRound);
        if (this.isGameOver()) {
          // Emit gameEnded to backend as soon as final rankings screen is shown
          // this.playerSocketService.playerEmit('gameEnded', {});
        }

        if (!this.isGameOver()) {
          this.startCountdown();
        }
      });


    // Subscribe to rankings from PlayerSocketService
    this.subscriptions.push(
      this.playerSocketService.playerState$
        .pipe(map((playerState) => playerState.ranking))
        .subscribe((ranking) => {
          this.ranking.set(ranking);
        }),
    );

    // Subscribe to targetNumber from from PlayerSocketService
    this.subscriptions.push(
      this.playerSocketService.playerState$
        .pipe(map((playerState) => playerState.data))
        .subscribe((targetNumber) => {
          this.targetNumber.set(targetNumber);
        }),
    );

    this.subscriptions.push(
      this.playerSocketService.playerState$
        .pipe(map((playerState) => playerState.selectedGame))
        .subscribe((selectedGame) => {
          this.selectedGame.set(selectedGame);
          if (selectedGame === '') {
            this.router.navigate(['/mobile-lobby']);
          }
        }),
    );
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private startCountdown(): void {
    this.playerSocketService.useEffect('countdownTick', (tick) => {
      this.countdown.set(tick);
    });

    this.playerSocketService.useEffect('nextRound', (data) => {
      this.playerSocketService.updatePlayerState({
        roundNumber: data.roundNumber,
        finalRound: data.finalRound,
      });

      this.playerSocketService.removeEffect('countdownTick');
      this.playerSocketService.removeEffect('nextRound');

      if (data.roundNumber >= data.finalRound) {
        this.finishRound();
      } else {
        this.moveToNextRound();
      }
    });
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }

  private finishRound(): void {
    this.router.navigate(['/mobile-magic-number']);
  }

  private moveToNextRound(): void {
    // Reset round-specific parameters for next round
    this.playerSocketService.resetRoundState();
    this.countdown.set(10);

    this.targetNumber.set(0);
    this.playerRank.set(0);

    const nextRound = this.roundNumber() + 1;
    this.router.navigate(['/mobile-magic-number'], {
      queryParams: {
        lobbyCode: this.lobbyCode(),
        playerName: this.playerName(),
        roundNumber: nextRound,
        selectedGame: this.selectedGame() || 'Magic Number',
      },
    });
  }

  onLeaveLobby(): void {
    this.playerSocketService.leaveLobby();
    this.router.navigate(['/mobile-join-lobby']);
  }

  getPlayerPoints(): number {
    return this.ranking().points;
  }

  getPlayerRank(): number {
    return this.ranking().rank;
  }

  getRankSuffix(rank: number): string {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  }
}
