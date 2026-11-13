import { UserSummary } from './users.types';

export interface SendOtpResponse {
  status: string;
  cooldownSeconds: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserSummary;
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
}
