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

  async fetchMessage() {
    try {
      const response = await fetch('http://localhost:3000/');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.message = data.message;
    } catch (error) {
      this.message = 'Error fetching data';
      console.error(error);
    }
  }
}
