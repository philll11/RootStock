export interface AuthStorage {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

let storage: AuthStorage | null = null;
let cachedToken: string | null = null;
let currentPlatform: 'web' | 'mobile' = 'web';

export const AUTH_TOKEN_KEY = 'rootstock_auth_token';

type AuthListener = (token: string | null) => void;
const listeners: AuthListener[] = [];

export const subscribeToAuth = (listener: AuthListener) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

const notifyListeners = (token: string | null) => {
  listeners.forEach((listener) => listener(token));
};

export const configureAuth = (
  storageImpl: AuthStorage,
  platform: 'web' | 'mobile' = 'web'
) => {
  storage = storageImpl;
  currentPlatform = platform;
};

export const getPlatform = () => currentPlatform;

export const setToken = async (token: string) => {
  cachedToken = token;
  if (storage) {
    await storage.setItem(AUTH_TOKEN_KEY, token);
  }
  notifyListeners(token);
};

export const getToken = async (): Promise<string | null> => {
  if (currentPlatform === 'web') {
    // Web uses HttpOnly cookies, so we don't have access to the token.
    return null;
  }
  if (cachedToken) return cachedToken;
  if (storage) {
    const token = await storage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      cachedToken = token;
      return token;
    }
  }
  return null;
};

export const clearToken = async () => {
  cachedToken = null;
  if (storage) {
    await storage.removeItem(AUTH_TOKEN_KEY);
  }
  notifyListeners(null);
};
