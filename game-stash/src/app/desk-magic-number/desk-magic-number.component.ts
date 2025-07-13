import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import {
  AdminSocketService,
  GameState,
} from '../services/admin.socket.service';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs/operators';
import { PlayerRanking } from '../services/socket.service.constants';

@Component({
  selector: 'app-desk-magic-number',
  imports: [MatListModule, CommonModule],
  templateUrl: './desk-magic-number.component.html',
  styleUrl: './desk-magic-number.component.css',
})
export class DeskMagicNumberComponent implements OnInit {
  players: string[] = [];
  responded: string[] = [];
  unresponded: string[] = [];

  rankings = signal<PlayerRanking[]>([]);
  isRoundOver = signal(false);
  isGameOver = signal(false);
  countdown = signal(10);
  roundNumber = signal(1);
  targetNumber = signal(0);

  @Output() gameOver = new EventEmitter<string>();

  private countdownInterval?: number;

  constructor(private adminSocketService: AdminSocketService) {}

  getRoundWinners(): string[] {
    return this.rankings()
      .filter((player) => player.isRoundWinner)
      .map((player) => player.name);
  }

  ngOnInit(): void {
    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.players))
      .subscribe((players) => (this.players = players));

    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.responded))
      .subscribe((responded) => {
        this.responded = responded;
        this.unresponded = this.players.filter(
          (player) => !responded.includes(player),
        );
        if (this.unresponded.length === 0) this.roundEnd();
      });

    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.data))
      .subscribe((targetNumber) => {
        this.targetNumber.set(targetNumber);
      });

    this.adminSocketService.gameState$
      .pipe(map((gameState) => gameState.playerRankings))
      .subscribe((rankings) => {
        this.rankings.set(rankings)
        console.log()
        });

    this.startGame();
  }

  startGame() {
    this.adminSocketService.startGame('Magic Number');
  }

  roundEnd() {
    this.isGameOver.set(this.roundNumber() >= 5);
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
    this.countdown.set(10);
    this.rankings.set([]);
    this.targetNumber.set(0);
    this.roundNumber.set(this.roundNumber() + 1);
    this.responded = [];
    this.adminSocketService.setResponded([]);
    this.unresponded = this.players.slice();
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private startCountdown(): void {
    this.countdownInterval = window.setInterval(() => {
      const current = this.countdown();
      if (current > 1) {
        this.countdown.set(current - 1);
      } else {
        this.stopCountdown();
        this.moveToNextRound();
      }
    }, 1000);
  }
}
