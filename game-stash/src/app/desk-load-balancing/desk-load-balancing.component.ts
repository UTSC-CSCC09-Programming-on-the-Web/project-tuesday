import { Component, OnInit, signal } from '@angular/core';
import { SocketService } from '../services/socket.service';
import { CommonModule } from '@angular/common';

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

  interval: any | undefined;
  timeout: any | undefined;

  isGameOver = signal(false);

  constructor(private socketService: SocketService) {}


  ngOnInit() {
    this.socketService.players$.subscribe(players => {
      this.players = players;
      this.points = Array(players.length).fill(0);
    });
    this.startGame();
  }

  startGame() {
    this.socketService.startGame("Load Balancing");
    this.interval = setInterval(() => {
      // Example of a game action after 5 seconds
      console.log("Game action executed after 5 seconds");

      const x = Math.random() * this.width;
      const y = Math.random() * 100;
      const size = Math.random() * 50 + 20;


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
      console.log("Game ended");
      this.isGameOver.set(true);
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
