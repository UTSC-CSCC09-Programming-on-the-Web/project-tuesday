import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { io } from 'socket.io-client';

interface GameResults {
  gameId: string;
  responses: Record<string, number>;
}

@Injectable({
  providedIn: 'root'
})

export class SocketService {

  private socket = io("http://localhost:3000/");

  private lobbyName: string = '';
  private lobbyCode: string = '';

  private playersSubject = new BehaviorSubject<string[]>([]);
  players$ = this.playersSubject.asObservable();

  constructor() { }

  startGame(gameId: string) {
    if (gameId === 'Magic Number') {
      this.socket.emit("startGame", {
        gameId: gameId,
        lobbyCode: this.lobbyCode
      })
    }
  }

  connectToSocket() {
    this.socket.on("welcome", (res) => {
        console.log(res.message);
    });

    // Create a new lobby
    this.socket.on("connect", () => {
        this.socket.emit("createLobby", {
          lobbyCode: this.lobbyCode,
          admin: this.socket.id,
        });
    });

    // If a user leaves the lobby, update the UI accordingly
    this.socket.on("userJoinedLobby", (arg) => {
        const userId = arg.user;
        this.addPlayer(userId);
    });

    // If a user leaves the lobby, update the UI accordingly
    this.socket.on("userLeftLobby", (message) => {
        const userId = message.split(" ")[0];
        this.setPlayers(this.players.filter(player => player !== userId));
        console.log("user left lobby:", message);
    });

    this.socket.on("gameResults", (arg: GameResults) => {
      switch (arg.gameId) {
        case 'Magic Number':
          const winners = [];
          const answerNumber = this.getRandomInt(100);
          let lowestDifference : number = 100;

          const responses = arg.responses;

          // calculate the difference between each player's response and the answer number
          for (const [player, response] of Object.entries(responses)) {
            let difference = Math.abs(response - answerNumber);
            responses[player] = difference;
            
            if (difference < lowestDifference) {
              lowestDifference = difference;
            } 
          }

          // find all the winning players
          for (const [player, response] of Object.entries(responses)) {
            if (response === lowestDifference) {
              winners.push(player);
            }

            console.log("winners: ", winners);
          }

          break;
        default:
          console.log("Unknown game ID:", arg.gameId);
          break;
      }
    })
  }

  getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  get players(): string[] {
    return this.playersSubject.value;
  }

  setPlayers(players: string[]) {
    this.playersSubject.next(players);
  }

  addPlayer(player: string) {
    const updated = [...this.playersSubject.value, player];
    this.playersSubject.next(updated);
  }

  removePlayer(player: string) {
    const updated = this.playersSubject.value.filter(p => p !== player);
    this.playersSubject.next(updated);
  }

  getLobbyName(): string {
    return this.lobbyName;
  }

  getLobbyCode(): string {
    return this.lobbyCode;
  }

  setLobby(lobbyName: string, lobbyCode: string) {
    this.lobbyName = lobbyName;
    this.lobbyCode = lobbyCode;
  }
}
