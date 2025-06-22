import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-phone-lobby',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './phone-lobby.component.html',
  styleUrls: ['./phone-lobby.component.css']
})
export class PhoneLobbyComponent implements OnInit {
  lobbyCode = signal('');
  playerName = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}
  ngOnInit(): void {
    // Get lobby details from query parameters
    this.route.queryParams.subscribe(params => {
      const lobbyCode = params['lobbyCode'];
      const playerName = params['playerName'];
      
      if (!lobbyCode || !playerName) {
        // Redirect to join lobby if missing required parameters
        this.router.navigate(['/phone-join-lobby']);
        return;
      }
      
      this.lobbyCode.set(lobbyCode);
      this.playerName.set(playerName);
    });

    // Simulate game starting after some time (in real app, this would be WebSocket/polling)
    setTimeout(() => {
      this.startGame();
    }, 8000); // Wait 8 seconds then start game
  }
  private startGame(): void {
    // Navigate to game screen
    this.router.navigate(['/phone-guessing-game'], {
      queryParams: {
        lobbyCode: this.lobbyCode(),
        playerName: this.playerName(),
        round: 1
      }
    });
  }

  onLeaveLobby(): void {
    // Navigate back to join lobby screen
    this.router.navigate(['/phone-join-lobby']);
  }
}
