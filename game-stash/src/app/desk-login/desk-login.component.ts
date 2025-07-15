import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';

declare var Stripe: any;

@Component({
  selector: 'app-desk-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './desk-login.component.html',
  styleUrls: ['./desk-login.component.css']
})
export class DeskLoginComponent implements OnInit {
  loginForm: FormGroup;
  registerForm: FormGroup;
  isLoginMode = true;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Stripe related
  stripe: any;
  elements: any;
  cardElement: any;
  isProcessingPayment = false;
  showPaymentForm = false;
  registeredUser: User | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // NO-AUTH BRANCH: Skip Stripe initialization and authentication checks
    // Initialize Stripe with your actual test publishable key
    // this.stripe = Stripe('pk_test_51RgrGg2Xvu7GA77tKbkzt2SX1wI8dXX9zR9zG0fRj4fcTab2AA5RNf7liukYzBfXNGbupkqVgTgxdAOI7LGG36u500aioW0kL5');
    // this.elements = this.stripe.elements();
    
    // COMMENTED OUT FOR NO-AUTH BRANCH: Check if user is already authenticated
    // if (this.authService.isAuthenticated()) {
    //   this.router.navigate(['/desk-create-lobby']);
    // }
    
    // NO-AUTH BRANCH: Directly redirect to desk-create-lobby
    this.router.navigate(['/desk-create-lobby']);
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  setLoginMode(isLogin: boolean): void {
    if (this.isLoginMode !== isLogin) {
      this.isLoginMode = isLogin;
      this.errorMessage = '';
      this.successMessage = '';
      this.showPaymentForm = false;
    }
  }

  switchMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.successMessage = '';
    this.showPaymentForm = false;
  }

  onLogin(): void {
    // NO-AUTH BRANCH: Comment out login functionality
    // if (this.loginForm.valid) {
    //   this.isLoading = true;
    //   this.errorMessage = '';

    //   const { email, password } = this.loginForm.value;

    //   this.authService.login(email, password).subscribe({
    //     next: (response) => {
    //       if (response.success && response.user && response.token) {
    //         this.authService.setAuth(response.user, response.token);
            
    //         // Check subscription status
    //         if (this.authService.hasActiveSubscription()) {
    //           this.router.navigate(['/desk-create-lobby']);
    //         } else {
    //           this.router.navigate(['/user-account']);
    //         }
    //       } else {
    //         this.errorMessage = response.message || 'Login failed';
    //       }
    //       this.isLoading = false;
    //     },
    //     error: (error) => {
    //       this.errorMessage = error.error?.message || 'Login failed';
    //       this.isLoading = false;
    //     }
    //   });
    // }
    
    // NO-AUTH BRANCH: Directly redirect to desk-create-lobby
    this.router.navigate(['/desk-create-lobby']);
  }

  onRegister(): void {
    // NO-AUTH BRANCH: Comment out registration functionality
    // if (this.registerForm.valid) {
    //   this.isLoading = true;
    //   this.errorMessage = '';

    //   const { username, email, password } = this.registerForm.value;

    //   this.authService.register(username, email, password).subscribe({
    //     next: (response) => {
    //       if (response.success && response.user && response.token) {
    //         this.registeredUser = response.user;
    //         this.authService.setAuth(response.user, response.token);
    //         this.successMessage = 'Account created! Now please set up your subscription.';
    //         this.showPaymentForm = true;
    //         this.initializeStripeElements();
    //       } else {
    //         this.errorMessage = response.message || 'Registration failed';
    //       }
    //       this.isLoading = false;
    //     },
    //     error: (error) => {
    //       this.errorMessage = error.error?.message || 'Registration failed';
    //       this.isLoading = false;
    //     }
    //   });
    // }
    
    // NO-AUTH BRANCH: Directly redirect to desk-create-lobby
    this.router.navigate(['/desk-create-lobby']);
  }

  initializeStripeElements(): void {
    // NO-AUTH BRANCH: Comment out Stripe initialization
    // if (this.cardElement) {
    //   this.cardElement.destroy();
    // }

    // this.cardElement = this.elements.create('card', {
    //   style: {
    //     base: {
    //       fontSize: '16px',
    //       color: '#424770',
    //       '::placeholder': {
    //         color: '#aab7c4',
    //       },
    //     },
    //   },
    // });

    // setTimeout(() => {
    //   const cardElementContainer = document.getElementById('card-element');
    //   if (cardElementContainer) {
    //     this.cardElement.mount('#card-element');
    //   }
    // }, 100);
  }

  async onSetupSubscription(): Promise<void> {
    // NO-AUTH BRANCH: Comment out Stripe subscription setup
    // if (!this.cardElement) {
    //   this.errorMessage = 'Payment form not loaded. Please refresh and try again.';
    //   return;
    // }

    // this.isProcessingPayment = true;
    // this.errorMessage = '';

    // try {
    //   // Create payment method
    //   const { error: paymentMethodError, paymentMethod } = await this.stripe.createPaymentMethod({
    //     type: 'card',
    //     card: this.cardElement,
    //   });

    //   if (paymentMethodError) {
    //     this.errorMessage = paymentMethodError.message;
    //     this.isProcessingPayment = false;
    //     return;
    //   }

    //   // Create subscription
    //   this.authService.createSubscription().subscribe({
    //     next: async (response) => {
    //       if (response.success && response.clientSecret) {
    //         // Confirm the payment
    //         const { error: confirmError } = await this.stripe.confirmCardPayment(response.clientSecret, {
    //           payment_method: paymentMethod.id
    //         });

    //         if (confirmError) {
    //           this.errorMessage = confirmError.message;
    //         } else {
    //           this.successMessage = 'Payment confirmed! Setting up your account...';
              
    //           // Confirm subscription payment on the backend and refresh user data
    //           this.authService.confirmSubscriptionPayment().subscribe({
    //             next: (confirmResponse) => {
    //               if (confirmResponse.success) {
    //                 // Now refresh user data to get the updated subscription status
    //                 this.authService.verifyToken().subscribe({
    //                   next: (response) => {
    //                     if (response.success && response.user) {
    //                       this.authService.setAuth(response.user, localStorage.getItem('authToken') || '');
    //                       this.successMessage = 'Account setup complete! Redirecting to lobby...';
    //                     }
    //                     // Navigate to lobby after user data is refreshed
    //                     setTimeout(() => {
    //                       this.router.navigate(['/desk-create-lobby']);
    //                     }, 1500);
    //                   },
    //                   error: () => {
    //                     // If refresh fails, still navigate but user might need to refresh page
    //                     setTimeout(() => {
    //                       this.router.navigate(['/desk-create-lobby']);
    //                     }, 1500);
    //                   }
    //                 });
    //               } else {
    //                 this.errorMessage = 'Payment succeeded but failed to activate subscription. Please contact support.';
    //               }
    //               this.isProcessingPayment = false;
    //             },
    //             error: () => {
    //               // If backend confirmation fails, still try to refresh and navigate
    //               this.authService.verifyToken().subscribe({
    //                 next: (response) => {
    //                   if (response.success && response.user) {
    //                     this.authService.setAuth(response.user, localStorage.getItem('authToken') || '');
    //                   }
    //                   setTimeout(() => {
    //                     this.router.navigate(['/desk-create-lobby']);
    //                   }, 1500);
    //                 },
    //                 error: () => {
    //                   setTimeout(() => {
    //                     this.router.navigate(['/desk-create-lobby']);
    //                   }, 1500);
    //                 }
    //               });
    //               this.isProcessingPayment = false;
    //             }
    //           });
    //         }
    //       } else {
    //         this.errorMessage = response.message || 'Failed to create subscription';
    //         this.isProcessingPayment = false;
    //       }
    //     },
    //     error: (error) => {
    //       this.errorMessage = error.error?.message || 'Failed to create subscription';
    //       this.isProcessingPayment = false;
    //     }
    //   });
    // } catch (error) {
    //   this.errorMessage = 'An unexpected error occurred';
    //   this.isProcessingPayment = false;
    // }
    
    // NO-AUTH BRANCH: Directly redirect to desk-create-lobby
    this.router.navigate(['/desk-create-lobby']);
  }
}
