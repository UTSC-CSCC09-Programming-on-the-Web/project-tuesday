import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-mobile-magic-number',
  imports: [
    MatFormFieldModule,
    CommonModule,
    FormsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './mobile-magic-number.component.html',
  styleUrl: './mobile-magic-number.component.css'
})

export class MobileMagicNumberComponent {
  @Input() socket: any;
  @Input() lobbyCode: string = '';
  @Input() gameId: string = '';

  gameResponse: number | null = null;

  loading: boolean = false;

  constructor() {

  }

  respondToGameMagicNumber() {
    console.log("responding to game with magic number: ", this.gameResponse);
    this.socket.emit('gameResponse', {
        lobbyCode: this.lobbyCode,
        playerId: this.socket.id,
        gameId: this.gameId,
        response: this.gameResponse
    })
  }
}
