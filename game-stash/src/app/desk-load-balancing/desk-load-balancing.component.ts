import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSocketService } from '../services/admin.socket.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-desk-load-balancing',
  imports: [CommonModule],
  templateUrl: './desk-load-balancing.component.html',
  styleUrl: './desk-load-balancing.component.css'
})
export class DeskLoadBalancingComponent implements OnInit {

  width: number = 600;
  height: number = 800;

  players = signal([] as string[]);
  points: number[] = [];
  responded: string[] = [];
  unresponded: string[] = [];

  results: number[] = [];

  interval: any | undefined;
  timeout: any | undefined;
  private countdownInterval?: number;

  status = signal('');
  countdown = signal(10);

  @Output() gameOver = new EventEmitter<string>();

  constructor(private socketService: AdminSocketService) {}


  ngOnInit() {
    this.status.set('Waiting for players');
    console.log(this.status());
    this.socketService.gameState$.pipe(map((gameState) => gameState.responded))
      .subscribe((responded) => {
        this.responded = responded;
        this.unresponded = this.players().filter((player) => !responded.includes(player));
      });
    this.socketService.gameState$.pipe(map((gameState) => gameState.players))
      .subscribe((players) => {
        this.players.set(players);
        this.points = Array(players.length).fill(0);
      });
    this.socketService.setResponded([]);
    this.socketService.startGame("Load Balancing");
    this.socketService.useEffect("playerStart", (data) => {
      this.socketService.setResponded([...this.responded, data.playerId]);
      console.log(`Player ${data.playerId} started the game in lobby`);
      console.log()
      if (this.responded.length === this.players().length) {
        console.log("All players have started the game, starting the game logic");
        this.status.set('Game Countdown');
        this.startCountdown(this.startGame.bind(this));
      }
    });
  }

  gameOverEmit() {
    this.gameOver.emit('Magic Number');
  }

  spawnBox(){
    const size = Math.random() * 50 + 20;
    const x = Math.random() * (this.width - 2 * size) + size;
    const y = 50;

    this.socketService.lobbyEmit("spawnBox", {
      x: x,
      y: y,
      size: size
    });
    console.log(typeof this.interval, this.interval);
}

  startGame() {
    this.status.set('Game Started');
    this.interval = setInterval(this.spawnBox.bind(this), 2000);

    this.timeout = setTimeout(() => {
      clearInterval(this.interval);
      this.interval = setInterval(this.spawnBox.bind(this), 1000);
    }, 15000);

    this.countdown.set(30);
    this.startCountdown((() => {
      clearInterval(this.interval);
      this.socketService.lobbyEmit("gameEnded", {
        gameId: "Load Balancing",
        lobbyCode: this.socketService.getLobbyCode()
      });
      this.socketService.removeEffect("scoreUpdate");
      console.log("Game ended");
      this.status.set('Game Over');
      this.results = [...this.points];
    }).bind(this));

    this.socketService.useEffect("scoreUpdate", (data) => {
      console.log("Score update received:", data);
      const playerIndex = this.players().indexOf(data.playerId);
      if (playerIndex !== -1) {
        this.points[playerIndex] = data.points;
      }
      console.log("Updated points:", this.points);
    });
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private startCountdown(callback: () => void): void {
    console.log(this.countdownInterval);
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
    console.log("DeskLoadBalancingComponent destroyed");
  }
}
