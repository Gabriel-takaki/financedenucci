import { Routes } from '@angular/router';
import { AuthGuard } from '@angular/fire/auth-guard';
export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'presentation',
    loadComponent: () => import('./components/presentation/presentation').then(m => m.Presentation),
    canActivate: [AuthGuard]
  },
  {
    path: 'calculator',
    loadComponent: () => import('./components/calculator/calculator').then(m => m.Calculator),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];