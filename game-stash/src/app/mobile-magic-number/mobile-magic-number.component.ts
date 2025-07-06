import {
  Component,
  signal,
  computed,
  OnInit,
  OnDestroy,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mobile-magic-number',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mobile-magic-number.component.html',
  styleUrls: ['./mobile-magic-number.component.css'],
})
export class MobileMagicNumberComponent implements OnInit, OnDestroy {
  // Signals to store data from route parameters
  lobbyCode = signal('');
  selectedGame = signal('');
  playerName = signal('');
  roundNumber = signal(1);

  // Internal signals
  guessInput = signal('');
  isSubmitting = signal(false);
  errorMessage = signal('');

  private subscriptions: Subscription[] = [];

  guess = computed(() => {
    const input = this.guessInput().trim();
    return input === '' ? 0 : parseInt(input);
  });

  isGuessValid = computed(() => {
    const input = this.guessInput().trim();
    if (input === '') return false;
    const num = this.guess();
    return !isNaN(num) && num >= 1 && num <= 100;
  });

  isFormValid = computed(() => this.isGuessValid() && !this.isSubmitting());
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService,
  ) {}

  ngOnInit(): void {
    console.log('PhoneGuessingGameComponent initialized');

    // Reset ALL component state for new navigation
    this.lobbyCode.set('');
    this.selectedGame.set('');
    this.playerName.set('');
    this.roundNumber.set(1);
    this.guessInput.set('');
    this.isSubmitting.set(false);
    this.errorMessage.set('');

    // Read all parameters from route
    this.subscriptions.push(
      this.route.queryParams.subscribe((params) => {
        const lobbyCode = params['lobbyCode'];
        const playerName = params['playerName'];
        const roundNumber = params['roundNumber'];
        const selectedGame = params['selectedGame'] || 'Magic Number';

        if (!lobbyCode || !playerName) {
          console.error('PhoneGuessingGame: Missing required parameters');
          this.router.navigate(['/mobile-join-lobby']);
          return;
        }

        this.lobbyCode.set(lobbyCode);
        this.playerName.set(playerName);
        this.roundNumber.set(roundNumber ? parseInt(roundNumber) : 1);
        this.selectedGame.set(selectedGame);

        console.log('PhoneGuessingGame: Loaded parameters', {
          lobbyCode: this.lobbyCode(),
          playerName: this.playerName(),
          roundNumber: this.roundNumber(),
          selectedGame: this.selectedGame(),
        });
      }),
    );
  }

  onSubmitGuess(): void {
    if (!this.isFormValid()) return;

    const guessValue = this.guess();
    console.log('PhoneGuessingGame: onSubmitGuess called');
    console.log('PhoneGuessingGame: guessInput value:', this.guessInput());
    console.log('PhoneGuessingGame: computed guess value:', guessValue);
    console.log('PhoneGuessingGame: isGuessValid:', this.isGuessValid());

    if (isNaN(guessValue)) {
      console.error('PhoneGuessingGame: Invalid guess value (NaN)');
      this.errorMessage.set('Please enter a valid number');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    console.log(
      'PhoneGuessingGame: Set isSubmitting to true, navigating to waiting screen with guess:',
      guessValue,
    );

    this.router.navigate(['/mobile-magic-number-waiting'], {
      queryParams: {
        lobbyCode: this.lobbyCode(),
        playerName: this.playerName(),
        roundNumber: this.roundNumber(),
        selectedGame: this.selectedGame(),
        guess: guessValue,
      },
    });
  }

  onLeaveLobby(): void {
    console.log('PhoneGuessingGame: User clicked leave lobby');
    this.socketService.leaveLobby();
    this.router.navigate(['/mobile-join-lobby']);
  }

  formatGuess(event: any): void {
    let value = event.target.value.replace(/[^0-9]/g, '');
    if (value.length > 3) {
      value = value.substring(0, 3);
    }
    this.guessInput.set(value);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
