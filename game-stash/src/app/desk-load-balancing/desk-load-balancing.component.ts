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

  players: string[] = [];
  points: number[] = [];

  results: number[] = [];

  interval: any | undefined;
  timeout: any | undefined;

  isGameOver = signal(false);

  @Output() gameOver = new EventEmitter<string>();

  constructor(private socketService: AdminSocketService) {}


  ngOnInit() {
    this.socketService.gameState$.pipe(map((gameState) => gameState.players))
      .subscribe((players) => {
        this.players = players;
        this.points = Array(players.length).fill(0);
      });
    this.startGame();
  }

  gameOverEmit() {
    this.gameOver.emit('Magic Number');
  }

  startGame() {
    this.socketService.startGame("Load Balancing");
    this.interval = setInterval(() => {
      // Example of a game action after 5 seconds
      console.log("Game action executed after 5 seconds");

      const size = Math.random() * 50 + 20;
      const x = Math.random() * (this.width - size) + size / 2;
      const y = Math.random() * 100;


      // const box = Bodies.rectangle(x, y, size, size);
      // this.bodies.push(box);
      // World.add(this.engine.world, box);

      this.socketService.lobbyEmit("spawnBox", {
        x: x,
        y: y,
        size: size
      });
      console.log(typeof this.interval, this.interval);
    }, 2000);

    this.timeout = setTimeout(() => {
      clearInterval(this.interval);
      this.socketService.lobbyEmit("gameEnded", {
        gameId: "Load Balancing",
        lobbyCode: this.socketService.getLobbyCode()
      });
      this.socketService.removeEffect("scoreUpdate");
      console.log("Game ended");
      this.isGameOver.set(true);
      this.results = [...this.points];
    }, 30000);

    this.socketService.useEffect("scoreUpdate", (data) => {
      console.log("Score update received:", data);
      const playerIndex = this.players.indexOf(data.playerId);
      if (playerIndex !== -1) {
        this.points[playerIndex] = data.points;
      }
      console.log("Updated points:", this.points);
    });
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
