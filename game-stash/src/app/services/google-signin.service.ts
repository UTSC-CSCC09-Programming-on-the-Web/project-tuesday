import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    google: any;
    googleSignInCallback: (response: any) => void;
  }
}

@Injectable({
  providedIn: 'root'
})
export class GoogleSignInService {
  private clientId = environment.googleClientId;
  
  constructor(private authService: AuthService) {}

  async initializeGoogleSignIn(): Promise<void> {
    try {
      await this.loadGoogleSignIn();
      
      if (!window.google?.accounts) {
        throw new Error('Google Sign-In not available');
      }

      window.google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Set up the global callback for the button
      window.googleSignInCallback = this.handleCredentialResponse.bind(this);
      
    } catch (error) {
      console.error('Failed to initialize Google Sign-In:', error);
      throw error;
    }
  }

  async loadGoogleSignIn(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Sign-In script'));
      document.head.appendChild(script);
    });
  }

  renderSignInButton(elementId: string): void {
    if (!window.google?.accounts) {
      console.error('Google Sign-In not initialized');
      return;
    }

    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id '${elementId}' not found`);
      return;
    }

    element.innerHTML = '';

    window.google.accounts.id.renderButton(
      element,
      {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: element.offsetWidth || 300
      }
    );
  }

  private handleCredentialResponse(response: any): void {
    if (response.credential) {
      // Send the ID token to our backend for verification
      this.authService.verifyGoogleToken(response.credential).subscribe({
        next: (authResponse) => {
          if (authResponse.success && authResponse.user && authResponse.token) {
            this.authService.setAuth(authResponse.user, authResponse.token);
            
            // Redirect based on subscription status
            if (this.authService.hasActiveSubscription()) {
              window.location.href = '/create-lobby';
            } else {
              window.location.href = '/user-account';
            }
          } else {
            console.error('Authentication failed:', authResponse.message);
            alert('Google sign-in failed. Please try again.');
          }
        },
        error: (error) => {
          console.error('Google sign-in error:', error);
          alert('Google sign-in failed. Please try again.');
        }
      });
    }
  }

  signOut(): void {
    if (window.google?.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }
  }
}
