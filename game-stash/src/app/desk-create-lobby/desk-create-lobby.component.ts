import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-desk-create-lobby',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
    MatProgressSpinnerModule,
    CommonModule,
  ],
  templateUrl: './desk-create-lobby.component.html',
  styleUrl: './desk-create-lobby.component.css',
})
export class DeskCreateLobbyComponent implements OnInit, OnDestroy {
  lobbyName: string = '';
  lobbyCode: string = '';
  loading: boolean = false;
  user: User | null = null;

  private userSubscription?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // NO-AUTH BRANCH: Skip authentication checks
    // Subscribe to current user
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.user = user;

      // COMMENTED OUT FOR NO-AUTH BRANCH: If user is not authenticated, redirect to login
      // if (!user) {
      //   this.router.navigate(['/desk-login']);
      //   return;
      // }

      // COMMENTED OUT FOR NO-AUTH BRANCH: If user doesn't have active subscription, redirect to account page
      // if (!this.authService.hasActiveSubscription()) {
      //   this.router.navigate(['/user-account']);
      //   return;
      // }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  goToUserAccount(): void {
    // NO-AUTH BRANCH: Comment out user account navigation
    // this.router.navigate(['/user-account'], { queryParams: { from: 'menu' } });
  }

  logout(): void {
    // NO-AUTH BRANCH: Comment out logout functionality
    // this.authService.logout();
  }

  /* ID generator gotten from: https://stackoverflow.com/questions/1349404/generate-a-string-of-random-characters */
  makeId(length: number): string {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  createLobby() {
    // this.loading = true;
    this.lobbyCode = this.makeId(6);

    this.router.navigate(['/lobby'], {
      queryParams: { lobbyName: this.lobbyName, lobbyCode: this.lobbyCode },
    });
  }
}
