import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { SocketService } from '../services/socket.service';
import {MatListModule} from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { PlayerRanking } from '../mobile-rankings/mobile-rankings.component';

@Component({
  selector: 'app-desk-magic-number',
  imports: [
    MatListModule,
    CommonModule,
  ],
  templateUrl: './desk-magic-number.component.html',
  styleUrl: './desk-magic-number.component.css'
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

  constructor( private socketService: SocketService) {}

  getRoundWinners(): string[] {
    return this.rankings()
      .filter(player => player.isRoundWinner)
      .map(player => player.name);
  }

  ngOnInit(): void {
    this.socketService.players$.subscribe(players => {
      this.players = players;
    });

    this.socketService.responded$.subscribe(responded => {
      this.responded = responded;
      this.unresponded = this.players.filter(player => !responded.includes(player));
      if (this.unresponded.length === 0)
        this.roundEnd();
    });

    this.socketService.targetNumber$.subscribe(targetNumber => {
      this.targetNumber.set(targetNumber);
    });

    this.socketService.magicNumberRankings$.subscribe(rankings => {
      // Convert MagicNumberRankings to PlayerRanking format for display
      const playerRankings: PlayerRanking[] = rankings.map(ranking => ({
        playerId: ranking.playerId,
        name: ranking.name,
        guess: ranking.guess,
        points: ranking.points,
        rank: ranking.rank,
        isRoundWinner: ranking.isRoundWinner
      }));

      this.rankings.set(playerRankings);
    })

    this.startGame();
  }

  startGame() {
    console.log("Starting game with players:", this.players);
    this.socketService.startGame('Magic Number');
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
    this.socketService.setResponded([]);
    this.unresponded = this.players.slice();
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private startCountdown(): void {
    console.log('Magic Number: Starting countdown for round', this.roundNumber());
    this.countdownInterval = window.setInterval(() => {
      const current = this.countdown();
      console.log('Magic Number: Countdown tick:', current);
      if (current > 1) {
        this.countdown.set(current - 1);
      } else {
        console.log('Magic Number: Countdown finished, moving to next round');
        this.stopCountdown();
        this.moveToNextRound();
      }
    }, 1000);
  }

}
