import type { User } from '@/core/domain/types';
import { api } from './api';

// Autenticação: e-mail, senha e nick, com sessão guardada em cookie pelo
// servidor. A interface AuthService é o ponto de troca (login social, etc.).

export interface AuthService {
  me(): Promise<User | null>;
  register(input: { email: string; password: string; nick: string }): Promise<User>;
  login(input: { email: string; password: string }): Promise<User>;
  updateProfile(patch: Partial<Pick<User, 'name' | 'avatarColor'>>): Promise<User>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  logout(): Promise<void>;
}

export const AVATAR_COLORS = ['#81a44c', '#2f8f9d', '#d2572f', '#5a4b8c', '#c9952b', '#595c4e'];

class ApiAuthService implements AuthService {
  async me() {
    return (await api<{ user: User | null }>('/api/auth/me')).user;
  }
  async register(input: { email: string; password: string; nick: string }) {
    return (await api<{ user: User }>('/api/auth/register', { body: input })).user;
  }
  async login(input: { email: string; password: string }) {
    return (await api<{ user: User }>('/api/auth/login', { body: input })).user;
  }
  async updateProfile(patch: Partial<Pick<User, 'name' | 'avatarColor'>>) {
    return (await api<{ user: User }>('/api/auth/me', { method: 'PATCH', body: patch })).user;
  }
  async changePassword(currentPassword: string, newPassword: string) {
    await api('/api/auth/me', { method: 'PATCH', body: { currentPassword, newPassword } });
  }
  async logout() {
    await api('/api/auth/logout', { method: 'POST' });
  }
}

export const authService: AuthService = new ApiAuthService();
