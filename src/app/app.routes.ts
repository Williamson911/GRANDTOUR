import { Routes } from '@angular/router';

import { authGuard, guestOnlyGuard } from './core/guards/auth-guard';
import { Profile } from './features/profile/profile'

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'map' },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile').then((m) => m.Profile),
    title: 'Profile — Grand Tour',
  },
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
    title: 'Connexion — Grand Tour',
  },
  {
    path: 'register',
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('./features/auth/register/register').then((m) => m.Register),
    title: 'Inscription — Grand Tour',
  },
  {
    path: 'forgot-password',
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then(
        (m) => m.ForgotPassword,
      ),
    title: 'Mot de passe oublié — Grand Tour',
  },
  {
    path: 'map',
    canActivate: [authGuard],
    loadComponent: () => import('./features/map/map').then((m) => m.Map),
    title: 'Carte — Grand Tour',
  },
  {
    path: 'calendar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/calendar/calendar').then((m) => m.Calendar),
    title: 'Calendrier — Grand Tour',
  },
  {
    path: 'season',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/my-season/my-season').then((m) => m.MySeason),
    title: 'Ma saison — Grand Tour',
  },
  {
    path: 'budget',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/budget/budget').then((m) => m.Budget),
    title: 'Budget — Grand Tour',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    title: 'Dashboard — Grand Tour',
  },
  {
    path: 'event/:eventId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/event-detail/event-detail').then(
        (m) => m.EventDetail,
      ),
    title: 'Event — Grand Tour',
  },
  { path: '**', redirectTo: 'map' },
];
