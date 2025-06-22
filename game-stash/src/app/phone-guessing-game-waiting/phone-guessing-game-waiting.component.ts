import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-phone-guessing-game-waiting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './phone-guessing-game-waiting.component.html',
  styleUrls: ['./phone-guessing-game-waiting.component.css']
})
export class PhoneGuessingGameWaitingComponent implements OnInit {  lobbyCode = signal('');
  playerName = signal('');
  roundNumber = signal(1);
  guess = signal(0);

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}
  ngOnInit(): void {
    // Get game details from query parameters
    this.route.queryParams.subscribe(params => {
      const lobbyCode = params['lobbyCode'];
      const playerName = params['playerName'];
      const round = params['round'] || '1';
      const guess = params['guess'] || '0';
      
      if (!lobbyCode || !playerName) {
        // Redirect to join lobby if missing required parameters
        this.router.navigate(['/phone-join-lobby']);
        return;
      }
      
      this.lobbyCode.set(lobbyCode);
      this.playerName.set(playerName);
      this.roundNumber.set(parseInt(round));
      this.guess.set(parseInt(guess));
    });    // Simulate waiting for other players (in real app, this would be WebSocket/polling)
    setTimeout(() => {
      this.navigateToRankings();
    }, 5000); // Wait 5 seconds then show rankings
  }

  private navigateToRankings(): void {
    this.router.navigate(['/phone-rankings'], {
      queryParams: {
        lobbyCode: this.lobbyCode(),
        playerName: this.playerName(),
        round: this.roundNumber(),
        guess: this.guess()
      }
    });
  }

  onLeaveLobby(): void {
    // Navigate back to join lobby screen
    this.router.navigate(['/phone-join-lobby']);
  }
}
