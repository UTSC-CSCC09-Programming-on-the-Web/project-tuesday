import { Component, OnInit } from '@angular/core';
import { SocketService } from '../services/socket.service';
import {MatListModule} from '@angular/material/list';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-desk-magic-number',
  imports: [
    MatListModule,
    CommonModule,
  ],
  templateUrl: './desk-magic-number.component.html',
  styleUrl: './desk-magic-number.component.css'
})
export class DeskMagicNumberComponent implements OnInit {
  players: string[] = [];
  responded: string[] = [];
  unresponded: string[] = [];

  constructor( private socketService: SocketService) {}

  ngOnInit(): void {
    this.socketService.players$.subscribe(players => {
      this.players = players;
    });
    this.socketService.responded$.subscribe(responded => {
      this.responded = responded;
      this.unresponded = this.players.filter(player => {
        if (!responded.includes(player))
          console.log('Unresponded player:', player);
        return !responded.includes(player);
      });
      console.log('Responded players:', this.responded);
      console.log('Unresponded players:', this.unresponded);
    });
    this.startGame();
  }

  startGame() {
    console.log("Starting game with players:", this.players);
    this.socketService.startGame('Magic Number');
  }
}
