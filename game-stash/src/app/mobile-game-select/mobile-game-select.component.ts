import { Component } from '@angular/core';
import { MobileMagicNumberComponent } from '../mobile-magic-number/mobile-magic-number.component';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { io } from 'socket.io-client';

@Component({
  selector: 'app-mobile-game-select',
  imports: [
    MobileMagicNumberComponent,
    CommonModule
  ],
  templateUrl: './mobile-game-select.component.html',
  styleUrl: './mobile-game-select.component.css'
})
export class MobileGameSelectComponent {
  selectedGame: string = '';
  lobbyCode: string;
  socket = io("http://localhost:3000/");

  constructor(private route: ActivatedRoute) {
      this.lobbyCode = this.route.snapshot.paramMap.get('lobbyCode') ?? "";
      
      this.connectToSocket();
  }

  connectToSocket() {
      // connect to a lobby
      this.socket.on("connect", () => {
          this.socket.emit("joinLobby", {
              lobbyCode: this.lobbyCode,
              client: this.socket.id
          });
      });

      // listen for game start event
      this.socket.on("startGamePlayer", (arg) => {
          console.log("receieved ping to start ", arg.gameId)
          this.selectedGame = arg.gameId; 
      })

      // when game results are receieved, reset the UI to prompt users to look at the screen
      this.socket.on("gameResults", (arg) => {
        console.log("everyone has responded")
        this.selectedGame = '';
      })
  }

}
