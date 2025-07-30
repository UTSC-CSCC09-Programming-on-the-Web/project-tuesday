import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminSocketService } from '../services/admin.socket.service';
import { PlayerSocketService } from '../services/player.socket.service';
import { map, Subscription } from 'rxjs';

@Component({
  selector: 'app-mobile-magic-number-waiting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobile-magic-number-waiting.component.html',
  styleUrls: ['./mobile-magic-number-waiting.component.css'],
})
export class MobileMagicNumberWaitingComponent implements OnInit, OnDestroy {
  // Signals to store data from route parameters
  lobbyCode = signal('');
  playerName = signal('');
  roundNumber = signal(1);
  selectedGame = signal('');
  guess = signal(0);
  allSubmitted = signal(false);
  init: boolean = false;

  private subscriptions: Subscription[] = [];

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
        this.guess.set(state.ranking.data || 0);

        this.setupSocketSubscriptions();

        // Emit game response when component initializes
        if (!this.init) {
          this.playerSocketService.playerEmit('gameResponse', {
            gameId: this.selectedGame(),
            data: this.guess(),
          });
        }
        this.init = true;
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private setupSocketSubscriptions(): void {
    // Subscribe to game round complete event to detect when all players have submitted
    this.subscriptions.push(
      this.playerSocketService.gameRoundComplete$.subscribe(() => {
        this.allSubmitted.set(true);
        this.navigateToRankings();
      }),
    );
  }

  private navigateToRankings(): void {
    this.router.navigate(['/mobile-rankings']);
  }

  onLeaveLobby(): void {
    this.playerSocketService.leaveLobby();
    this.router.navigate(['/mobile-join-lobby']);
  }
}
