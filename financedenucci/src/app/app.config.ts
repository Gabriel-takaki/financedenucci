import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp({
      apiKey: "AIzaSyBSBE_zp258EFj8qI9JdrJBJV_mN6j8YA8",
  authDomain: "denuccifinance.firebaseapp.com",
  projectId: "denuccifinance",
  storageBucket: "denuccifinance.firebasestorage.app",
  messagingSenderId: "1061428686674",
  appId: "1:1061428686674:web:2881b43acd909e33e1948b",
  measurementId: "G-2CTQPVP0HH"
    })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ]
};