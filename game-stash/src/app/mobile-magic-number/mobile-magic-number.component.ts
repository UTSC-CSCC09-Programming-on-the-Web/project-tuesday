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
import { AdminSocketService } from '../services/admin.socket.service';
import { PlayerSocketService } from '../services/player.socket.service';
import { map, Subscription } from 'rxjs';
import { PlayerRanking } from '../services/socket.service.constants';

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

  ranking = signal<PlayerRanking>({
    player: {
      name: '',
      playerId: '',
    },
    points: 0,
    rank: -1,
    isRoundWinner: false,
    data: -1, // variable field used differently by different games
  })

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
    private playerSocketService: PlayerSocketService,
  ) {}

  ngOnInit(): void {

    this.playerSocketService.playerState$
      .pipe(
        map((state) => state))
      .subscribe((state) => {
        this.lobbyCode.set(state.lobbyCode);
        this.playerName.set(state.playerName);
        this.roundNumber.set(state.roundNumber);
        this.selectedGame.set(state.selectedGame);
        this.ranking.set(state.ranking);
      });
  }

  onSubmitGuess(): void {
    if (!this.isFormValid()) return;

    const guessValue = this.guess();
    if (isNaN(guessValue)) {
      this.errorMessage.set('Please enter a valid number');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const ranking = this.ranking();
    ranking.data = guessValue;
    this.playerSocketService.updatePlayerState({
      ranking
    });

    this.router.navigate(['/mobile-magic-number-waiting']);
  }

  onLeaveLobby(): void {
    this.playerSocketService.leaveLobby();
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
