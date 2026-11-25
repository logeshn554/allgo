import { Injectable, Logger } from '@nestjs/common';
import adminPkg from 'firebase-admin';
import { ConfigService } from '../config/config.service.js';

const admin = (adminPkg as any).default || adminPkg;

export interface DecodedIdToken {
  uid: string;
  phone_number?: string;
  [key: string]: any;
}

export interface AppCheckClaims {
  app_id: string;
  [key: string]: any;
}

export interface FirebaseAuthService {
  verifyIdToken(idToken: string): Promise<DecodedIdToken>;
  verifyAppCheckToken(token: string): Promise<AppCheckClaims>;
}

@Injectable()
export class FirebaseAdminAuthService implements FirebaseAuthService {
  private readonly logger = new Logger(FirebaseAdminAuthService.name);
  private initialized = false;

  constructor(private readonly config: ConfigService) {
    this.initFirebase();
  }

  private initFirebase() {
    const apps = admin.apps || (adminPkg as any).getApps?.() || [];
    if (apps.length > 0) {
      this.initialized = true;
      return;
    }

    const saKey = this.config.firebaseServiceAccountKey;
    if (saKey) {
      try {
        let creds: any;
        if (saKey.trim().startsWith('{')) {
          creds = JSON.parse(saKey);
        } else {
          const decoded = Buffer.from(saKey, 'base64').toString('utf-8');
          creds = JSON.parse(decoded);
        }
        const certFn = (admin as any).credential?.cert || (adminPkg as any).cert || (admin as any).cert;
        admin.initializeApp({
          credential: certFn ? certFn(creds) : undefined,
        });
        this.initialized = true;
        this.logger.log('Firebase Admin SDK initialized successfully');
      } catch (err: any) {
        this.logger.warn(`Firebase Admin SDK init failed: ${err.message}. Running in fallback mode.`);
      }
    } else {
      this.logger.log('No FIREBASE_SERVICE_ACCOUNT_KEY configured. Running in mock/development mode.');
    }
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Firebase ID token is required');
    }

    const isMockToken = idToken.startsWith('mock_') || idToken.startsWith('test_');
    if (isMockToken) {
      if (!this.config.isDevelopment) {
        throw new Error('Mock Firebase tokens are disabled outside development.');
      }
      return this.verifyMockToken(idToken);
    }
    if (!this.initialized) {
      if (this.config.isDevelopment) return this.verifyMockToken(idToken);
      throw new Error('Firebase Admin SDK is not initialized; refusing token verification.');
    }

    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      return decoded as DecodedIdToken;
    } catch (err: any) {
      if (this.config.isDevelopment) {
        return this.verifyMockToken(idToken);
      }
      throw new Error(`Firebase token verification failed: ${err.message}`);
    }
  }

  async verifyAppCheckToken(token: string): Promise<AppCheckClaims> {
    if (!token || typeof token !== 'string') {
      throw new Error('App Check token is required');
    }

    const isMockToken = token.startsWith('mock_') || token.startsWith('test_');
    if (isMockToken) {
      if (!this.config.isDevelopment) {
        throw new Error('Mock App Check tokens are disabled outside development.');
      }
      return { app_id: 'in.allgo.app.dev' };
    }
    if (!this.initialized) {
      if (this.config.isDevelopment) return { app_id: 'in.allgo.app.dev' };
      throw new Error('Firebase Admin SDK is not initialized; refusing App Check verification.');
    }

    try {
      const appCheckClaims = await admin.appCheck().verifyToken(token);
      return appCheckClaims as unknown as AppCheckClaims;
    } catch (err: any) {
      if (this.config.isDevelopment) {
        return { app_id: 'in.allgo.app.dev' };
      }
      throw new Error(`App Check token verification failed: ${err.message}`);
    }
  }

  private verifyMockToken(token: string): DecodedIdToken {
    // Supports formats like "mock_uid_phone_+919876543210" or "mock_firebase_usr_123"
    let uid = 'mock_firebase_user_123';
    let phone = '+919876543210';

    if (token.includes(':')) {
      const parts = token.split(':');
      uid = parts[0] || uid;
      phone = parts[1] || phone;
    } else if (token.includes('_phone_')) {
      const parts = token.split('_phone_');
      uid = parts[0] || uid;
      phone = parts[1] || phone;
    } else if (token.length > 5) {
      uid = `firebase_${token.slice(0, 20)}`;
    }

    return {
      uid,
      phone_number: phone,
    };
  }
}
