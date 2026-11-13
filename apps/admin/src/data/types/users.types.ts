export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'PENDING_VERIFICATION';

export interface UserSummary {
  id: string;
  phone: string;
  email?: string;
  fullName?: string;
  status: UserStatus;
  roles: string[];
  defaultLanguage: string;
  createdAt: string;
}

export interface ListUsersResponse {
  users: UserSummary[];
  total: number;
}

export interface UserOperationResponse {
  success: boolean;
  id?: string;
  userId?: string;
  status?: string;
  role?: string;
}
