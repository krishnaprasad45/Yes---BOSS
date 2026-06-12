export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}
