import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-phone-guessing-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phone-guessing-game.component.html',
  styleUrls: ['./phone-guessing-game.component.css']
})
export class PhoneGuessingGameComponent implements OnInit {
  lobbyCode = signal('');
  playerName = signal('');
  guess = signal('');
  isSubmitting = signal(false);
  errorMessage = signal('');
  roundNumber = signal(1);
  
  // Computed properties for validation
  guessNumber = computed(() => parseInt(this.guess()));
  isGuessValid = computed(() => {
    const num = this.guessNumber();
    return !isNaN(num) && num >= 1 && num <= 100;
  });
  isFormValid = computed(() => this.isGuessValid() && !this.isSubmitting());

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get lobby details from query parameters
    this.route.queryParams.subscribe(params => {
      const lobbyCode = params['lobbyCode'];
      const playerName = params['playerName'];
      const round = params['round'] || '1';
      
      if (!lobbyCode || !playerName) {
        // Redirect to join lobby if missing required parameters
        this.router.navigate(['/phone-join-lobby']);
        return;
      }
      
      this.lobbyCode.set(lobbyCode);
      this.playerName.set(playerName);
      this.roundNumber.set(parseInt(round));
    });
  }

  onSubmitGuess(): void {
    if (!this.isFormValid()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');    // Simulate API call to submit guess
    setTimeout(() => {
      try {
        // Navigate to waiting screen
        this.router.navigate(['/phone-guessing-game-waiting'], {
          queryParams: {
            lobbyCode: this.lobbyCode(),
            playerName: this.playerName(),
            round: this.roundNumber(),
            guess: this.guessNumber()
          }
        });
      } catch (error) {
        this.isSubmitting.set(false);
        this.errorMessage.set('Failed to submit guess. Please try again.');
      }
    }, 1000);
  }

  onLeaveLobby(): void {
    // Navigate back to join lobby screen
    this.router.navigate(['/phone-join-lobby']);
  }

  formatGuess(event: any): void {
    let value = event.target.value.replace(/[^0-9]/g, '');
    if (value.length > 3) {
      value = value.substring(0, 3);
    }
    this.guess.set(value);
  }
}
