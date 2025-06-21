import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'game-stash';
  message = 'Loading...';

  constructor(
  ) {
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
