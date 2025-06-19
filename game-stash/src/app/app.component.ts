import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { io } from 'socket.io-client';

@Component({
  selector: 'app-root',
  standalone: true, 
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'game-stash';
  message = 'Loading...';

  constructor() {
    this.fetchMessage();
    this.connectToSocket();
  }

  // basic fetch request to the backend, runs on init
  fetchMessage() {
    fetch('http://localhost:3000/')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        this.message = data.message;
      })
      .catch(error => {
        this.message = 'Error fetching data';
        console.error(error);
      });
  }

  connectToSocket() {
    const socket = io("http://localhost:3000/");
    
    socket.on("welcome", (res) => {
        console.log(res.message);
    });

    console.log('Running');
  }

}
