import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

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
  }

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

}
