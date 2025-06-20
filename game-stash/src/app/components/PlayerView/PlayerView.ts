import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { io } from 'socket.io-client';

@Component({
  selector: 'app-player-view',
  template: `
    <div class="player-view">  
        <p>this is the player's view</p>
    </div>
    <div class="current-players"></div>
    `
})

export class PlayerViewComponent {
    roomId: string;

    constructor(private route: ActivatedRoute) {
        this.roomId = this.route.snapshot.paramMap.get('roomId') ?? "";
        console.log("player component view");
        console.log("Room ID:", this.roomId);
        
        this.connectToSocket();
    }

    connectToSocket() {
        const socket = io("http://localhost:3000/");

        // connect to a lobby
        socket.on("connect", () => {
            socket.emit("joinRoom", this.roomId);
        });
    }
}