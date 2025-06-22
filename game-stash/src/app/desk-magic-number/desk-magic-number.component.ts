import { Component, OnInit } from '@angular/core';
import { SocketService } from '../services/socket.service';

@Component({
  selector: 'app-desk-magic-number',
  imports: [],
  templateUrl: './desk-magic-number.component.html',
  styleUrl: './desk-magic-number.component.css'
})
export class DeskMagicNumberComponent implements OnInit {
  players: string[] = [];

  constructor( private socketService: SocketService) {}

  ngOnInit(): void {
    this.socketService.players$.subscribe(players => {
      this.players = players;
    });
    this.startGame();
  }

  startGame() {
    console.log("Starting game with players:", this.players);
    this.socketService.startGame('Magic Number');
  }
}
