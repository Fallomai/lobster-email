const STORAGE_KEYS = {
  API_KEY: 'lobster_api_key',
  EMAIL: 'lobster_email',
} as const;

export const storage = {
  getApiKey: () => localStorage.getItem(STORAGE_KEYS.API_KEY),

  setApiKey: (key: string) => localStorage.setItem(STORAGE_KEYS.API_KEY, key),

  getEmail: () => localStorage.getItem(STORAGE_KEYS.EMAIL),

  setEmail: (email: string) => localStorage.setItem(STORAGE_KEYS.EMAIL, email),

  clear: () => {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    localStorage.removeItem(STORAGE_KEYS.EMAIL);
  },
};
