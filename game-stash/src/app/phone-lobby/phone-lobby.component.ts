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
  }

  onLeaveLobby(): void {
    // Navigate back to join lobby screen
    this.router.navigate(['/phone-join-lobby']);
  }
}
