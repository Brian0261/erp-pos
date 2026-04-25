export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  roles: string[];
}

export interface LoginResponse {
  tokenType: string;
  accessToken: string;
  expiresAt: string;
  user: UserProfile;
}

