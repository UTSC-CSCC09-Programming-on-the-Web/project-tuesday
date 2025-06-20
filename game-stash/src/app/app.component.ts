import { Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LobbyViewComponent } from './components/LobbyView/LobbyView';
import { PlayerViewComponent } from './components/PlayerView/PlayerView';
import { io } from 'socket.io-client';

@Component({
  selector: 'app-root',
  imports: [RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  
  constructor() {
    console.log("app component view");
  }

  /*
  connectToSocket() {
    const socket = io("http://localhost:3000/");
    
    socket.on("welcome", (res) => {
        console.log(res.message);
    });

    console.log('Running');
  }
  */
}
