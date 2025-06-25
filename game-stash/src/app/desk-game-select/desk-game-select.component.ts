import { Component, Input } from '@angular/core';
import { DeskMagicNumberComponent } from '../desk-magic-number/desk-magic-number.component';
import { io } from 'socket.io-client';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SocketService } from '../services/socket.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import {MatListModule} from '@angular/material/list';

@Component({
  selector: 'app-desk-game-select',
  imports: [
    DeskMagicNumberComponent,
    CommonModule,
    MatFormFieldModule,
    MatSelect,
    MatOption,
    MatButton,
    MatListModule,
  ],
  templateUrl: './desk-game-select.component.html',
  styleUrl: './desk-game-select.component.css'
})

export class DeskGameSelectComponent {

  constructor (
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService,
  ) {}

  players: string[] = [];
  lobbyName: string = '';
  lobbyCode: string = '';

  games: string[] = [
    'Magic Number',
    'exampleGame1',
    'exampleGame2',
    'exampleGame3',
  ];

  selectedGame: string = '';

  ngOnInit() {
    this.route.queryParams.subscribe(value => {
      this.socketService.setLobby(value['lobbyName'], value['lobbyCode']);
      this.lobbyName = this.socketService.getLobbyName();
      this.lobbyCode = this.socketService.getLobbyCode();
    });

    this.socketService.connectToSocket();

    this.socketService.players$.subscribe(players => {
      this.players = players;
    });

  }

  openNewTab() {
    const url = this.router.serializeUrl( this.router.createUrlTree(['/player', this.socketService.getLobbyCode()]));
    window.open(url, '_blank');
  }

  playGame(game: string) {
    if (game === 'Magic Number') {
      this.selectedGame = 'Magic Number';
    } else {
      console.error('Game not implemented:', game);
    }
  }
}
