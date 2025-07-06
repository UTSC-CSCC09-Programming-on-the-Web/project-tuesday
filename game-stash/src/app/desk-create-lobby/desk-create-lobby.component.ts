import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';

@Component({
  selector: 'app-desk-create-lobby',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
    MatProgressSpinnerModule,
    CommonModule,
  ],
  templateUrl: './desk-create-lobby.component.html',
  styleUrl: './desk-create-lobby.component.css',
})
export class DeskCreateLobbyComponent {
  /*
  Checklist for creating a new lobby:
  - button to create a new lobby
  - input field for lobby name
  - leads to loading screen
  - new lobby code
  - display that says enter the code in your phone
  - component for displaying cu
  */

  lobbyName: string = '';
  lobbyCode: string = '';

  loading: boolean = false;

  constructor(private router: Router) {}

  /* ID generator gotten from: https://stackoverflow.com/questions/1349404/generate-a-string-of-random-characters */
  makeId(length: number): string {
    console.log('Generating ID of length:', length);
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  createLobby() {
    // this.loading = true;
    this.lobbyCode = this.makeId(6);
    console.log('Lobby created with code:', this.lobbyCode);
    console.log('Creating lobby with name:', this.lobbyName);

    this.router.navigate(['/lobby'], {
      queryParams: { lobbyName: this.lobbyName, lobbyCode: this.lobbyCode },
    });
  }
}
