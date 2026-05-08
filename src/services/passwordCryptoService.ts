import { getAuthPasswordCryptoPublicKey, isLiveReadingApiError } from './liveReadingApi';

interface PasswordCryptoCache {
  keyId: string;
  key: CryptoKey;
}

let cachedPublicKey: PasswordCryptoCache | null = null;
let forcePlainPasswordTransport = false;

const PEM_HEADER = '-----BEGIN PUBLIC KEY-----';
const PEM_FOOTER = '-----END PUBLIC KEY-----';

function pemToArrayBuffer(pem: string) {
  const normalized = pem
    .replace(PEM_HEADER, '')
    .replace(PEM_FOOTER, '')
    .replace(/\s+/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function toBase64(bytes: Uint8Array) {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function ensurePublicKey() {
  const payload = await getAuthPasswordCryptoPublicKey();

  if (cachedPublicKey?.keyId === payload.keyId) {
    return cachedPublicKey;
  }

  const imported = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(payload.publicKeyPem),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt'],
  );

  cachedPublicKey = {
    keyId: payload.keyId,
    key: imported,
  };

  return cachedPublicKey;
}

function shouldFallbackToPlainPassword(error: unknown) {
  if (!isLiveReadingApiError(error)) {
    return false;
  }

  if (error.code === 'NETWORK_ERROR') {
    return true;
  }

  return error.code === 'HTTP_ERROR' && (error.status === 404 || error.status === 405);
}

export async function encryptPassword(password: string) {
  if (forcePlainPasswordTransport) {
    return { password };
  }

  try {
    const context = await ensurePublicKey();
    const encoded = new TextEncoder().encode(password);
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      context.key,
      encoded,
    );
    const cipher = toBase64(new Uint8Array(encrypted));

    return {
      passwordCipher: cipher,
      passwordKeyId: context.keyId,
    };
  } catch (error) {
    if (shouldFallbackToPlainPassword(error)) {
      forcePlainPasswordTransport = true;
      return {
        password,
      };
    }

    throw error;
  }
}
