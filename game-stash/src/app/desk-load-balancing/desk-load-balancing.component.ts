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
  styleUrl: './desk-load-balancing.component.css'
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
    console.log(this.status());

    // .pipe(map((gameState) => gameState.playerRankings))
    //   .subscribe((players) => {
    //     this.players = players.map(player => player.player)
    //     this.responded = players.filter(players => players.data !== undefined).map(player => player.player);
    //     this.unresponded = this.players.filter(
    //       (player) => !this.responded.find(res => res.playerId === player.playerId),
    //     );
    //     if (this.unresponded.length === 0) this.roundEnd();
    //   });

    this.socketService.gameState$.pipe(map((gameState) => gameState.playerRankings))
      .subscribe((players) => {
        this.players.set(players.map(player => {
          return {
            player: player.player,
            points: player.data
          }
        }));
        this.responded = players.filter(players => players.data !== undefined).map(player => player.player);
        this.unresponded = this.players().filter(
          (player) => !this.responded.find(res => res.playerId === player.player.playerId),
        ).map(player => player.player);
        if (this.unresponded.length === 0) {
          this.status.set('Game Countdown');
          this.startCountdown(this.startGame.bind(this));
        }
      });
    this.socketService.resetRoundState();
    this.socketService.lobbyEmit("startGame", {
      gameId: "Load Balancing"
    });

    /* THIS IS REPLACED BY GAMERESPONSERECEIVED. RESPONDED ARRAY IS NOW JUST THE DATA VALUE NOT BEING UNDEFINED IN THE PLAYERRANKING ARRAY */
    // this.socketService.useEffect("playerStart", (data) => {
    //   this.socketService.setResponded([...this.responded, this.players().find(player => player.playerId === data.playerId)!]);
    //   console.log(`Player ${data.playerId} started the game in lobby`);
    //   if (this.responded.length === this.players().length) {
    //     console.log("All players have started the game, starting the game logic");
    //     this.status.set('Game Countdown');
    //     this.startCountdown(this.startGame.bind(this));
    //   }
    // });
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
}

  startGame() {
    this.status.set('Game Started');
    this.interval = setInterval(this.spawnBox.bind(this), 2000);

    this.timeout = setTimeout(() => {
      clearInterval(this.interval);
      this.interval = setInterval(this.spawnBox.bind(this), 1000);
    }, 15000);

    this.countdown.set(5);
    this.startCountdown((() => {
      clearInterval(this.interval);

      this.socketService.lobbyEmit("gameEnded", {
        gameId: "Load Balancing",
        lobbyCode: this.socketService.getLobbyCode(),
        players: this.players(),
        // points: this.points,
      });

      this.socketService.removeEffect("scoreUpdate");
      console.log("Game ended");
      this.status.set('Game Over');
    }).bind(this));

    this.socketService.useEffect("scoreUpdate", (data) => {
      console.log("Score update received:", data);
      const player = this.players().find(player => player.player.playerId === data.playerId) || { player: { playerId: data.playerId, name: '' }, points: undefined };
      player.points = data.points;
      console.log("Updated points:", player);
      this.players.set(this.players().sort((a,b) => {
        const aPoints = a.points || 0;
        const bPoints = b.points || 0;
        return bPoints - aPoints; // Sort in descending order
      }))
    });
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private startCountdown(callback: () => void): void {
    console.log("starting countdown", this.countdownInterval);
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
    this.socketService.removeEffect("playerStart");
    this.socketService.removeEffect("scoreUpdate");
    console.log("DeskLoadBalancingComponent destroyed");
  }
}
