export interface PublicUser {
  id: string;
  username: string;
  email: string;
  bandaiTcgId?: string;
  createdAt?: string;
}

export interface Session {
  userId: string;
  username: string;
  email: string;
  roles: string[];
}
