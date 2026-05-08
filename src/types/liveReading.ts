export type UserRole = 'USER' | 'READER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  birthday: string | null;
  displayName: string | null;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthUser;
}

export interface RegisterWithEmailPayload {
  email: string;
  password?: string;
  passwordCipher?: string;
  passwordKeyId?: string;
  birthday: string;
  verificationCode: string;
}

export interface LoginWithEmailPayload {
  email: string;
  password?: string;
  passwordCipher?: string;
  passwordKeyId?: string;
}

export interface AuthPasswordCryptoPublicKeyResponse {
  alg: 'RSA-OAEP-256';
  keyId: string;
  publicKeyPem: string;
}

export interface SendRegisterCodeResponse {
  sent: true;
  email: string;
  expiresInSeconds: number;
  resendIntervalSeconds: number;
}

export interface ReaderSummary {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  specialties: string[];
  isOnline: boolean;
  lastSeenAt: string;
}

export interface TarotCardSummary {
  id: string;
  name: string;
  archetype: string;
  effectPreset: EffectPreset;
  meaningShort: string | null;
}

export interface TarotDeckSummary {
  id: string;
  name: string;
  description: string | null;
  cards: Array<Pick<TarotCardSummary, 'id' | 'name' | 'archetype' | 'effectPreset'>>;
}

export interface CallSession {
  id: string;
  roomName: string;
  status: 'PENDING' | 'ACTIVE' | 'ENDED';
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  user: {
    id: string;
    email: string;
  };
  reader: {
    userId: string;
    profileId: string | null;
    displayName: string;
    avatarUrl: string | null;
  };
  deck: {
    id: string;
    name: string;
  };
  drawnCard: TarotCardSummary | null;
}

export type EffectPreset =
  | 'misty-dawn'
  | 'arcane-spark'
  | 'bloom-aura'
  | 'regal-gold'
  | 'cosmic-star'
  | 'cosmic-moon'
  | 'echo-rise'
  | 'halo-world';

export interface CardRevealPayload {
  type: 'card_reveal';
  sessionId: string;
  cardId: string;
  archetype: string;
  effectPreset: EffectPreset;
  triggeredBy: string;
  ts: number;
}

export interface JoinTokenResponse {
  session: CallSession;
  participantRole: 'USER' | 'READER';
  livekit: {
    url: string;
    token: string;
  };
}
