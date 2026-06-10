export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  recoveryCodeHash: string;
  recoveryCodeUpdatedAt: number;
  bandaiTcgId?: string;
  createdAt: number;
}

export type PublicUser = Omit<User, 'passwordHash' | 'salt' | 'recoveryCodeHash'>;

export interface Session {
  userId: string;
  username: string;
}
