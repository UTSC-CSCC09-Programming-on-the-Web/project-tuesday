import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mobile-magic-number-waiting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobile-magic-number-waiting.component.html',
  styleUrls: ['./mobile-magic-number-waiting.component.css']
})

export class MobileMagicNumberWaitingComponent implements OnInit, OnDestroy {
  // Signals to store data from route parameters
  lobbyCode = signal('');
  playerName = signal('');
  roundNumber = signal(1);
  selectedGame = signal('');
  guess = signal(0);
  allSubmitted = signal(false);

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService
  ) {}
  
  ngOnInit(): void {
    console.log('PhoneGuessingGameWaiting: Component initialized');
    
    // Reset all signals to default values
    this.lobbyCode.set('');
    this.playerName.set('');
    this.roundNumber.set(1);
    this.selectedGame.set('');
    this.guess.set(0);
    this.allSubmitted.set(false);
    
    // Read all parameters from route
    this.subscriptions.push(
      this.route.queryParams.subscribe(params => {
        const lobbyCode = params['lobbyCode'];
        const playerName = params['playerName'];
        const roundNumber = params['roundNumber'];
        const selectedGame = params['selectedGame'] || 'Magic Number';
        const guess = params['guess'];
        
        if (!lobbyCode || !playerName || guess === undefined) {
          console.error('PhoneGuessingGameWaiting: Missing required parameters');
          this.router.navigate(['/mobile-join-lobby']);
          return;
        }
        
        this.lobbyCode.set(lobbyCode);
        this.playerName.set(playerName);
        this.roundNumber.set(roundNumber ? parseInt(roundNumber) : 1);
        this.selectedGame.set(selectedGame);
        this.guess.set(parseInt(guess));
        
        console.log('PhoneGuessingGameWaiting: Loaded parameters', {
          lobbyCode: this.lobbyCode(),
          playerName: this.playerName(),
          roundNumber: this.roundNumber(),
          selectedGame: this.selectedGame(),
          guess: this.guess()
        });
        
        this.setupSocketSubscriptions();

        // Emit game response when component initializes
        this.submitGameResponse();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private submitGameResponse(): void {
    console.log('PhoneGuessingGameWaiting: Submitting game response with guess:', this.guess());
    this.socketService.submitGameResponse('Magic Number', this.guess());
  }
  
  private setupSocketSubscriptions(): void {
    // Subscribe to game round complete event to detect when all players have submitted
    this.subscriptions.push(
      this.socketService.gameRoundComplete$.subscribe(() => {
        console.log('PhoneGuessingGameWaiting: Game round complete, all players submitted');
        this.allSubmitted.set(true);
        this.navigateToRankings();
      })
    );
  }

  private navigateToRankings(): void {
    console.log('PhoneGuessingGameWaiting: Navigating to rankings screen');
    this.router.navigate(['/mobile-rankings'], {
      queryParams: {
        lobbyCode: this.lobbyCode(),
        playerName: this.playerName(),
        roundNumber: this.roundNumber(),
        selectedGame: this.selectedGame(),
        guess: this.guess()
      }
    });
  }

  onLeaveLobby(): void {
    console.log('PhoneGuessingGameWaiting: User clicked leave lobby');
    this.socketService.leaveLobby();
    this.router.navigate(['/mobile-join-lobby']);
  }
}
