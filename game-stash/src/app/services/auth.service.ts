import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  subscriptionStatus: 'active' | 'inactive' | 'past_due' | 'canceled';
  subscriptionId?: string;
  authProvider?: 'local' | 'google';
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  authProvider?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  clientSecret?: string;
  subscriptionId?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    // Check for existing token on service initialization
    this.checkStoredAuth();
  }

  private checkStoredAuth(): void {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');

    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
      // Optionally verify token is still valid
      this.verifyToken().subscribe({
        error: () => this.logout(),
      });
    }
  }

  register(
    username: string,
    email: string,
    password: string,
  ): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, {
      username,
      email,
      password,
    });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password,
    });
  }

  verifyGoogleToken(idToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google/verify`, {
      idToken
    });
  }

  createSubscription(): Observable<SubscriptionResponse> {
    return this.http.post<SubscriptionResponse>(
      `${this.apiUrl}/stripe/create-subscription`,
      {},
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  updatePaymentMethod(paymentMethodId: string): Observable<any> {
    return this.http
      .post(
        `${this.apiUrl}/stripe/update-payment-method`,
        {
          paymentMethodId,
        },
        {
          headers: this.getAuthHeaders(),
        },
      )
      .pipe(
        map((response) => {
          // Refresh user data after successful payment method update
          this.refreshUserData().subscribe();
          return response;
        }),
      );
  }

  cancelSubscription(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/stripe/cancel-subscription`,
      {},
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  resumeSubscription(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/stripe/resume-subscription`,
      {},
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  verifyToken(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.apiUrl}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
  }

  setAuth(user: User, token: string): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);

    // Navigate to login with replace to prevent back navigation issues
    this.router.navigate(['/desk-login'], { replaceUrl: true });
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  hasActiveSubscription(): boolean {
    const user = this.currentUserSubject.value;
    return user?.subscriptionStatus === 'active';
  }

  requiresPayment(): boolean {
    const user = this.currentUserSubject.value;
    return (
      user?.subscriptionStatus === 'inactive' ||
      user?.subscriptionStatus === 'past_due' ||
      user?.subscriptionStatus === 'canceled'
    );
  }

  refreshUserData(): Observable<User> {
    return this.http
      .get<{ success: boolean; user: User }>(`${this.apiUrl}/auth/me`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((response) => {
          if (response.success && response.user) {
            // Update local storage and current user
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
            return response.user;
          }
          throw new Error('Failed to refresh user data');
        }),
      );
  }

  confirmSubscriptionPayment(): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/stripe/confirm-subscription-payment`,
      {},
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  private getAuthHeaders(): any {
    const token = localStorage.getItem('authToken');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
}
