import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Subscription } from 'rxjs';

declare var Stripe: any;

@Component({
  selector: 'app-desk-user-account',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './desk-user-account.component.html',
  styleUrls: ['./desk-user-account.component.css'],
})
export class DeskUserAccountComponent implements OnInit, OnDestroy {
  user: User | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Track navigation context
  private cameFromMenu = false;

  // Stripe related
  stripe: any;
  elements: any;
  cardElement: any;
  isProcessingPayment = false;

  private userSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Initialize Stripe with your actual test publishable key
    this.stripe = Stripe(
      'pk_test_51RgrGg2Xvu7GA77tKbkzt2SX1wI8dXX9zR9zG0fRj4fcTab2AA5RNf7liukYzBfXNGbupkqVgTgxdAOI7LGG36u500aioW0kL5',
    ); // Replace with your real test key
    this.elements = this.stripe.elements();

    // Check if user came here from menu (lobby)
    this.cameFromMenu = this.route.snapshot.queryParams['from'] === 'menu';

    // Initialize Stripe elements immediately
    this.initializeStripeElements();

    // Subscribe to current user
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.user = user;

      // If user is not authenticated, redirect to login
      if (!user) {
        this.router.navigate(['/desk-login']);
        return;
      }

      // If user has active subscription and didn't come from menu, redirect to lobby
      // But don't redirect if we're currently processing a payment (to avoid conflicts)
      if (
        this.authService.hasActiveSubscription() &&
        !this.cameFromMenu &&
        !this.isProcessingPayment
      ) {
        this.router.navigate(['/desk-create-lobby']);
        return;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }

    if (this.cardElement) {
      this.cardElement.destroy();
    }
  }

  getSubscriptionStatusDisplay(): string {
    if (!this.user) return 'Unknown';

    switch (this.user.subscriptionStatus) {
      case 'active':
        return 'Active';
      case 'past_due':
        return 'Payment Due';
      case 'canceled':
        return 'Canceled';
      case 'inactive':
        return 'Inactive';
      default:
        return 'Unknown';
    }
  }

  getSubscriptionStatusClass(): string {
    if (!this.user) return '';

    switch (this.user.subscriptionStatus) {
      case 'active':
        return 'status-active';
      case 'past_due':
        return 'status-warning';
      case 'canceled':
      case 'inactive':
        return 'status-inactive';
      default:
        return '';
    }
  }

  initializeStripeElements(): void {
    if (this.cardElement) {
      this.cardElement.destroy();
    }

    this.cardElement = this.elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
      },
    });

    setTimeout(() => {
      const cardElementContainer = document.getElementById(
        'card-element-update',
      );
      if (cardElementContainer) {
        this.cardElement.mount('#card-element-update');
      }
    }, 100);
  }

  async updatePaymentMethod(): Promise<void> {
    if (!this.cardElement) {
      this.errorMessage = 'Payment form not loaded. Please try again.';
      return;
    }

    this.isProcessingPayment = true;
    this.errorMessage = '';

    try {
      // Create payment method
      const { error: paymentMethodError, paymentMethod } =
        await this.stripe.createPaymentMethod({
          type: 'card',
          card: this.cardElement,
        });

      if (paymentMethodError) {
        this.errorMessage = paymentMethodError.message;
        this.isProcessingPayment = false;
        return;
      }

      // Update payment method on server
      this.authService.updatePaymentMethod(paymentMethod.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage =
              'Payment method updated successfully! Checking subscription status...';

            // Refresh user data and check if we should redirect
            this.refreshUserDataAndRedirect();
          } else {
            this.errorMessage =
              response.message || 'Failed to update payment method';
          }
          this.isProcessingPayment = false;
        },
        error: (error) => {
          this.errorMessage =
            error.error?.message || 'Failed to update payment method';
          this.isProcessingPayment = false;
        },
      });
    } catch (error) {
      this.errorMessage = 'An unexpected error occurred';
      this.isProcessingPayment = false;
    }
  }

  cancelSubscription(): void {
    if (
      !confirm(
        'Are you sure you want to cancel your subscription? You will lose access to Game Stash features.',
      )
    ) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.cancelSubscription().subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Subscription canceled successfully.';
          this.refreshUserData();
        } else {
          this.errorMessage =
            response.message || 'Failed to cancel subscription';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'Failed to cancel subscription';
        this.isLoading = false;
      },
    });
  }

  refreshUserData(): void {
    this.authService.verifyToken().subscribe({
      next: (response) => {
        if (response.success && response.user) {
          this.authService.setAuth(
            response.user,
            localStorage.getItem('authToken') || '',
          );
          // Update local user data immediately to reflect changes
          this.user = response.user;
        }
      },
      error: () => {
        // Token might be invalid, redirect to login
        this.authService.logout();
      },
    });
  }

  refreshUserDataAndRedirect(): void {
    this.authService.verifyToken().subscribe({
      next: (response) => {
        if (response.success && response.user) {
          this.authService.setAuth(
            response.user,
            localStorage.getItem('authToken') || '',
          );

          // Update local user data immediately to reflect changes
          this.user = response.user;

          // If subscription is now active, always redirect to lobby
          if (response.user.subscriptionStatus === 'active') {
            this.successMessage =
              'Payment successful! Subscription is now active. Redirecting to lobby...';
            this.router.navigate(['/desk-create-lobby']);
          } else {
            this.successMessage = 'Payment method updated successfully!';
          }
        }
      },
      error: () => {
        // Token might be invalid, redirect to login
        this.authService.logout();
      },
    });
  }

  goBack(): void {

    // If user came from menu (lobby) and has active subscription, go back to lobby
    // Otherwise logout and go to login
    if (this.cameFromMenu && this.authService.hasActiveSubscription()) {
      this.router.navigate(['/desk-create-lobby']);
    } else {
      this.authService.logout(); // This will handle navigation to login and cleanup
    }
  }

  getBackButtonText(): string {
    const shouldShowLobby =
      this.cameFromMenu && this.authService.hasActiveSubscription();

    // Return appropriate text based on navigation context and subscription status
    if (shouldShowLobby) {
      return 'Back to Lobby';
    } else {
      return 'Back to Login';
    }
  }
}
