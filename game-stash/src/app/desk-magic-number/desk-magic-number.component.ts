import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import {
  AdminSocketService,
  GameState,
} from '../services/admin.socket.service';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs/operators';
import { Player, PlayerRanking } from '../services/socket.service.constants';

@Component({
  selector: 'app-desk-magic-number',
  imports: [MatListModule, CommonModule],
  templateUrl: './desk-magic-number.component.html',
  styleUrl: './desk-magic-number.component.css',
})
export class DeskMagicNumberComponent implements OnInit {
  players: Player[] = [];
  responded: Player[] = [];
  unresponded: Player[] = [];

  rankings = signal<PlayerRanking[]>([]);
  isRoundOver = signal(false);
  isGameOver = signal(false);
  countdown = signal(10);
  roundNumber = signal(1);
  finalRound = signal(3);
  targetNumber = signal(0);

  @Output() gameOver = new EventEmitter<string>();

  private countdownInterval?: number;

  constructor(private adminSocketService: AdminSocketService) {}

  getRoundWinners(): string[] {
    return this.rankings()
      .filter((player) => player.isRoundWinner)
      .map((player) => player.player.name);
  }

  ngOnInit(): void {
    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.playerRankings))
      .subscribe((players) => {
        this.rankings.set(players);
        this.players = players.map((player) => player.player);
        this.responded = players
          .filter((players) => players.data !== undefined)
          .map((player) => player.player);
        this.unresponded = this.players.filter(
          (player) =>
            !this.responded.find((res) => res.playerId === player.playerId),
        );
        if (this.unresponded.length === 0 && !this.isRoundOver())
          this.roundEnd();
      });

    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.data))
      .subscribe((targetNumber) => {
        console.log('Target number updated:', targetNumber);
        this.targetNumber.set(targetNumber || 0);
      });

    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.roundNumber))
      .subscribe((roundNumber) => {
        console.log('Round number updated:', roundNumber);
        this.roundNumber.set(roundNumber || 1);
      });

    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.finalRound))
      .subscribe((finalRound) => {
        console.log('Final round updated:', finalRound);
        this.finalRound.set(finalRound || 3);
      });

    // Start the game
    this.adminSocketService.lobbyEmit('startGame', {
      gameId: 'Magic Number',
    });
  }

  roundEnd() {
    this.isGameOver.set(this.roundNumber() >= this.finalRound());
    this.isRoundOver.set(true);
    if (!this.isGameOver()) {
      this.startCountdown();
    }
    if (this.isGameOver()) {
      console.log('Magic Number: Game over, final rankings:', this.rankings());
    }
  }

  gameOverEmit() {
    this.gameOver.emit('Magic Number');
  }

  moveToNextRound() {
    this.isRoundOver.set(false);
    this.rankings.set([]);
    this.targetNumber.set(0);
    this.responded = [];
    this.unresponded = this.players.slice();

    this.adminSocketService.resetRoundState();
    this.adminSocketService.setRound(this.roundNumber() + 1);
  }

  private stopCountdown(): void {
    console.log('Stopping countdown', this.countdownInterval);
    clearInterval(this.countdownInterval);
  }

  private startCountdown(): void {
    this.countdown.set(10);
    console.log('starting countdown', this.countdownInterval);
    this.countdownInterval = window.setInterval(() => {
      const current = this.countdown();
      if (current > 0) {
        this.countdown.set(current - 1);
      } else {
        console.log('Countdown finished, moving to next round');
        this.stopCountdown();
        this.moveToNextRound();
      }
      this.adminSocketService.lobbyEmit('countdownTick', {
        countdown: this.countdown(),
      });
    }, 1000);
  }
}
