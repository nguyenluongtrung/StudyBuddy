export type User = {
  id: number;
  username: string;
  email: string;
};

export type Subject = {
  id: number;
  name: string;
  color: string;
  created_at: string;
};

export type AuthTokens = { access: string; refresh: string };
