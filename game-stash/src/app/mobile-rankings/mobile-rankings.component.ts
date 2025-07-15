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
      name: "",
      playerId: "",
      points: 0,
      rank: -1,
      isRoundWinner: false,
      response: "",
      data: -1, //variable field used differently by different games
      });
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

  private maxRounds: number = 3;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminSocketService: AdminSocketService,
    private playerSocketService: PlayerSocketService,
  ) {}

  ngOnInit(): void {
    // Reset all signals to default values
    this.targetNumber.set(0);
    this.ranking.set({
      name: "",
      playerId: "",
      points: 0,
      rank: -1,
      isRoundWinner: false,
      response: "",
      data: -1, //variable field used differently by different games
      });
    this.playerRank.set(0);
    this.isGameOver.set(false);
    this.countdown.set(10);
    this.lobbyCode.set('');
    this.playerName.set('');
    this.roundNumber.set(1);
    this.selectedGame.set('');
    this.guess.set(0);
    
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

        // Determine if this is the final round
        this.isGameOver.set(this.roundNumber() >= this.maxRounds);

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
      this.playerSocketService.playerState$
      .pipe(map((playerState) => playerState.ranking))
      .subscribe((ranking) => {
        this.ranking.set(ranking)
        })
        
    );

    // Subscribe to targetNumber from from PlayerSocketService
    this.subscriptions.push(
      this.playerSocketService.playerState$
        .pipe(map((playerState) => playerState.data))
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
    this.countdownInterval = window.setInterval(() => {
      const current = this.countdown();
      if (current > 1) {
        this.countdown.set(current - 1);
      } else {
        this.stopCountdown();
        if (this.roundNumber() === this.maxRounds) {
          this.finishRound();
        } else {
          this.moveToNextRound();
        }
        
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private finishRound(): void {

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

  private moveToNextRound(): void {
    // Reset round-specific parameters for next round
    this.countdown.set(10);
    this.ranking.set({
      name: "",
      playerId: "",
      points: 0,
      rank: -1,
      isRoundWinner: false,
      response: "",
      data: -1, //variable field used differently by different games
      });
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

  onStayInLobby(): void {
    this.router.navigate(['/mobile-lobby'], {
      queryParams: {
        lobbyCode: this.lobbyCode(),
        playerName: this.playerName(),
      },
    });
  }

  onLeaveLobby(): void {
    this.playerSocketService.leaveLobby();
    this.router.navigate(['/mobile-join-lobby']);
  }

  getPlayerPoints(): number {
    const socketId = this.adminSocketService.getSocketId();
    if (!socketId) return 0;

    return this.ranking().points
  }

  getPlayerRank(): number {
    return this.ranking().rank
  }

  getRankSuffix(rank: number): string {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  }
}
