import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, UserProfile } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenStorageKey = 'erp_pos_token';

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((response) => this.setToken(response.accessToken))
    );
  }

  me(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.apiUrl}/auth/me`);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenStorageKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.tokenStorageKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenStorageKey, token);
  }
}

