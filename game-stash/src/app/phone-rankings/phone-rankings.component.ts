import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../services/socket.service';

interface PlayerRanking {
  name: string;
  guess: number;
  points: number;
  distance: number;
  rank: number;
}

@Component({
  selector: 'app-phone-rankings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './phone-rankings.component.html',
  styleUrls: ['./phone-rankings.component.css']
})
export class PhoneRankingsComponent implements OnInit, OnDestroy {
  lobbyCode = signal('');
  playerName = signal('');
  roundNumber = signal(1);
  guess = signal(0);
  targetNumber = signal(0);
  rankings = signal<PlayerRanking[]>([]);
  playerRank = signal(0);
  isGameOver = signal(false);
  countdown = signal(10);
  
  private countdownInterval?: number;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService
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
    });    // Simulate getting rankings data (in real app, this would come from server)
    this.generateMockRankings();

    // Determine if this is the final round
    this.isGameOver.set(this.roundNumber() >= 5);

    if (this.isGameOver()) {
      // Emit gameEnded to backend as soon as final rankings screen is shown
      this.socketService['socket'].emit('gameEnded', {
        lobbyCode: this.lobbyCode()
      });
    }

    if (!this.isGameOver()) {
      // Start countdown for next round
      this.startCountdown();
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(): void {
    this.countdownInterval = window.setInterval(() => {
      const current = this.countdown();
      if (current > 1) {
        this.countdown.set(current - 1);
      } else {
        this.stopCountdown();
        this.moveToNextRound();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
  private moveToNextRound(): void {
    const nextRound = this.roundNumber() + 1;
    this.router.navigate(['/phone-guessing-game'], {
      queryParams: {
        lobbyCode: this.lobbyCode(),
        playerName: this.playerName(),
        round: nextRound
      }
    });
  }private generateMockRankings(): void {
    // Generate a random target number
    const target = Math.floor(Math.random() * 100) + 1;
    this.targetNumber.set(target);
    
    // Generate mock players and rankings
    const mockPlayers: string[] = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
    const allPlayers = [...mockPlayers.filter(name => name !== this.playerName()), this.playerName()];
    
    // Generate guesses for each player
    const rankings: PlayerRanking[] = allPlayers.map((name, index) => {
      let playerGuess;
      if (name === this.playerName()) {
        playerGuess = this.guess();
      } else {
        // Generate random guesses for other players
        playerGuess = Math.floor(Math.random() * 100) + 1;
      }
      
      const distance = Math.abs(target - playerGuess);
      
      return {
        name,
        guess: playerGuess,
        distance,
        points: 0, // Will be assigned after finding closest
        rank: 0 // Will be set after sorting
      };
    });    // Find the minimum distance (best guess)
    const minDistance = Math.min(...rankings.map(p => p.distance));
    
    // Assign 1 point to all players with the minimum distance
    rankings.forEach(player => {
      if (player.distance === minDistance) {
        player.points = 1;
      }
    });

    // Sort by points (higher is better) and assign ranks with proper tie handling
    rankings.sort((a, b) => b.points - a.points);
    
    // Assign ranks based purely on points with proper tie handling
    // Example: If players have points [1, 1, 1, 0, 0]
    // Ranks should be [1, 1, 1, 4, 4] (not [1, 2, 3, 4, 5])
    let currentRank = 1;
    for (let i = 0; i < rankings.length; i++) {
      if (i > 0 && rankings[i].points !== rankings[i - 1].points) {
        // Different points from previous player, so rank jumps by number of tied players
        // currentRank becomes the current index + 1, which accounts for all previous tied players
        currentRank = i + 1;
      }
      rankings[i].rank = currentRank;
    }

    this.rankings.set(rankings);
      // Find player's rank
    const playerRanking = rankings.find(p => p.name === this.playerName());
    if (playerRanking) {
      this.playerRank.set(playerRanking.rank);
    }
  }

  onStayInLobby(): void {
    this.router.navigate(['/phone-lobby'], {
      queryParams: {
        lobbyCode: this.lobbyCode(),
        playerName: this.playerName()
      }
    });
  }
  onLeaveLobby(): void {
    // Navigate back to join lobby screen
    this.router.navigate(['/phone-join-lobby']);
  }
  getPlayerPoints(): number {
    const playerRanking = this.rankings().find(p => p.name === this.playerName());
    return playerRanking ? playerRanking.points : 0;
  }

  getRoundWinners(): string[] {
    return this.rankings()
      .filter(player => player.points === 1)
      .map(player => player.name);
  }
  getRankSuffix(rank: number): string {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  }
}
