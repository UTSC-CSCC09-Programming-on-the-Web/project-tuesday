import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSocketService } from '../services/admin.socket.service';
import { map } from 'rxjs';
import { Player } from '../services/socket.service.constants';

interface PlayerPoint {
  player: Player;
  points: number | undefined;
}
@Component({
  selector: 'app-desk-load-balancing',
  imports: [CommonModule],
  templateUrl: './desk-load-balancing.component.html',
  styleUrl: './desk-load-balancing.component.css',
})
export class DeskLoadBalancingComponent implements OnInit {
  width: number = 350;
  height: number = 500;

  players = signal([] as PlayerPoint[]);
  responded: Player[] = [];
  unresponded: Player[] = [];

  interval: any | undefined;
  timeout: any | undefined;
  private countdownInterval?: number;

  status = signal('');
  countdown = signal(10);

  @Output() gameOver = new EventEmitter<string>();

  constructor(private socketService: AdminSocketService) {}

  ngOnInit() {
    this.status.set('Waiting for players');

    this.socketService.gameState$
      .pipe(map((gameState) => gameState.playerRankings))
      .subscribe((players) => {
        this.players.set(
          players.map((player) => {
            return {
              player: player.player,
              points: player.data,
            };
          }),
        );
        this.responded = players
          .filter((players) => players.data !== undefined)
          .map((player) => player.player);
        this.unresponded = this.players()
          .filter(
            (player) =>
              !this.responded.find(
                (res) => res.playerId === player.player.playerId,
              ),
          )
          .map((player) => player.player);
        if (
          this.unresponded.length === 0 &&
          this.status() === 'Waiting for players'
        ) {
          this.status.set('Game Countdown');
          this.startCountdown(this.startGame.bind(this));
        }
      });
    this.socketService.resetRoundState();
    this.socketService.lobbyEmit('startGame', {
      gameId: 'Load Balancing',
    });
  }

  gameOverEmit() {
    this.gameOver.emit('Magic Number');
  }

  spawnBox() {
    const size = Math.random() * 50 + 20;
    const x = Math.random() * (this.width - 2 * size) + size;
    const y = 50;

    this.socketService.lobbyEmit('spawnBox', {
      x: x,
      y: y,
      size: size,
    });
  }

  startGame() {
    this.status.set('Game Started');
    this.interval = setInterval(this.spawnBox.bind(this), 2000);

    this.timeout = setTimeout(() => {
      clearInterval(this.interval);
      this.interval = setInterval(this.spawnBox.bind(this), 1000);
    }, 15000);

    this.countdown.set(30);
    this.startCountdown(
      (() => {
        clearInterval(this.interval);

        this.socketService.lobbyEmit('gameEnded', {
          gameId: 'Load Balancing',
          players: this.players(),
        });

        this.socketService.removeEffect('scoreUpdate');
        this.status.set('Game Over');
      }).bind(this),
    );

    this.socketService.useEffect('scoreUpdate', (data) => {
      const player = this.players().find(
        (player) => player.player.playerId === data.playerId,
      ) || { player: { playerId: data.playerId, name: '' }, points: undefined };
      player.points = data.points;
      this.players.set(
        this.players().sort((a, b) => {
          const aPoints = a.points || 0;
          const bPoints = b.points || 0;
          return bPoints - aPoints; // Sort in descending order
        }),
      );
    });
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private startCountdown(callback: () => void): void {
    this.countdownInterval = window.setInterval(() => {
      const current = this.countdown();
      if (current > 0) {
        this.countdown.set(current - 1);
      } else {
        this.stopCountdown();
        callback();
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.socketService.removeEffect('playerStart');
    this.socketService.removeEffect('scoreUpdate');
  }
}
