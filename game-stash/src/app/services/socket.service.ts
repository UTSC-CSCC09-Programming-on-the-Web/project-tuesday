import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { io } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket = io("http://localhost:3000/");

  private lobbyName: string = '';
  private lobbyCode: string = '';

  constructor() { }

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

  connectToSocket() {
    this.socket.on("welcome", (res) => {
        console.log(res.message);
    });

    // Create a new lobby
    this.socket.on("connect", () => {
        this.socket.emit("createRoom", this.lobbyCode);
    });

    // If a user leaves the lobby, update the UI accordingly
    this.socket.on("userJoinedRoom", (message) => {
        const userId = message.split(" ")[0];
        this.addPlayer(userId);
        // console.log("user joined room:", message);
        // document.querySelector('.current-players')!.innerHTML += `<p id=${userId}>player: ${userId}</p>`;
    });

    // If a user leaves the lobby, update the UI accordingly
    this.socket.on("userLeftRoom", (message) => {
        const userId = message.split(" ")[0];
        this.setPlayers(this.players.filter(player => player !== userId));
        console.log("user left room:", message);
        // document.querySelector(`#${userId}`)?.remove();
    });
  }
  private playersSubject = new BehaviorSubject<string[]>([]);
  players$ = this.playersSubject.asObservable(); // expose as observable

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
}
