import { Capacitor } from '@capacitor/core';

const PASSCODE_STORAGE_KEY = 'cloak.security.passcodes.v1';
const FAILURE_STORAGE_KEY = 'cloak.security.failures.v1';
const PBKDF2_ITERATIONS = 600000;
const PASSCODE_PATTERN = /^\d{4,12}$/;
const MAX_FAILED_ATTEMPTS = 5;
const INITIAL_LOCKOUT_MS = 30000;
const MAX_LOCKOUT_MS = 5 * 60 * 1000;
const sensitiveStateCleanups = new Set();

async function getStorage(key = PASSCODE_STORAGE_KEY) {
  if (Capacitor.isNativePlatform()) {
    const { Preferences } = await import('@capacitor/preferences');
    return {
      get: async () =>
        (await Preferences.get({ key })).value,
      set: async (value) =>
        Preferences.set({ key, value }),
      remove: async () => Preferences.remove({ key }),
    };
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('Passcode storage is unavailable in this environment.');
  }

  return {
    get: async () => window.localStorage.getItem(key),
    set: async (value) =>
      window.localStorage.setItem(key, value),
    remove: async () => window.localStorage.removeItem(key),
  };
}

function toBase64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) =>
    character.charCodeAt(0)
  );
}

async function hashPasscode(passcode, salt) {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passcode),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    256
  );
  return new Uint8Array(bits);
}

async function createPasscodeVerifier(passcode) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPasscode(passcode, salt);
  const verifier = {
    salt: toBase64Url(salt),
    hash: toBase64Url(hash),
  };
  salt.fill(0);
  hash.fill(0);
  return verifier;
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function validatePasscodes(primaryPasscode, decoyPasscode) {
  if (
    typeof primaryPasscode !== 'string' ||
    typeof decoyPasscode !== 'string' ||
    !PASSCODE_PATTERN.test(primaryPasscode) ||
    !PASSCODE_PATTERN.test(decoyPasscode)
  ) {
    throw new Error('Passcodes must contain 4 to 12 digits.');
  }
  if (primaryPasscode === decoyPasscode) {
    throw new Error('The primary and decoy passcodes must be different.');
  }
}

export async function hasPasscodes() {
  const storage = await getStorage();
  return Boolean(await storage.get());
}

export async function setPasscodes(primaryPasscode, decoyPasscode) {
  validatePasscodes(primaryPasscode, decoyPasscode);
  const configuration = {
    version: 1,
    iterations: PBKDF2_ITERATIONS,
    primary: await createPasscodeVerifier(primaryPasscode),
    decoy: await createPasscodeVerifier(decoyPasscode),
  };
  const storage = await getStorage();
  await storage.set(JSON.stringify(configuration));
}

export async function verifyPasscode(passcode) {
  if (typeof passcode !== 'string' || !PASSCODE_PATTERN.test(passcode)) {
    return null;
  }

  const storage = await getStorage();
  const savedConfiguration = await storage.get();
  if (!savedConfiguration) return null;

  let configuration;
  try {
    configuration = JSON.parse(savedConfiguration);
  } catch {
    throw new Error('Stored passcode configuration is invalid.');
  }
  if (
    configuration?.version !== 1 ||
    configuration.iterations !== PBKDF2_ITERATIONS ||
    !configuration.primary?.salt ||
    !configuration.primary?.hash ||
    !configuration.decoy?.salt ||
    !configuration.decoy?.hash
  ) {
    throw new Error('Stored passcode configuration is invalid.');
  }

  const suppliedPrimaryHash = await hashPasscode(
    passcode,
    fromBase64Url(configuration.primary.salt)
  );
  const primaryHash = fromBase64Url(configuration.primary.hash);
  const suppliedDecoyHash = await hashPasscode(
    passcode,
    fromBase64Url(configuration.decoy.salt)
  );
  const decoyHash = fromBase64Url(configuration.decoy.hash);
  const primaryMatches = equalBytes(suppliedPrimaryHash, primaryHash);
  const decoyMatches = equalBytes(suppliedDecoyHash, decoyHash);
  suppliedPrimaryHash.fill(0);
  primaryHash.fill(0);
  suppliedDecoyHash.fill(0);
  decoyHash.fill(0);
  if (primaryMatches) return 'primary';
  return decoyMatches ? 'decoy' : null;
}

export async function getPasscodeFailureState() {
  const storage = await getStorage(FAILURE_STORAGE_KEY);
  const savedState = await storage.get();
  if (!savedState) return { attempts: 0, lockedUntil: 0 };

  try {
    const state = JSON.parse(savedState);
    if (
      !Number.isInteger(state.attempts) ||
      state.attempts < 0 ||
      !Number.isFinite(state.lockedUntil)
    ) {
      throw new Error('Stored passcode lockout state is invalid.');
    }
    return state;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Stored passcode lockout state is invalid.');
    }
    throw error;
  }
}

export async function recordFailedPasscodeAttempt() {
  const previousState = await getPasscodeFailureState();
  const attempts = previousState.attempts + 1;
  let lockedUntil = previousState.lockedUntil;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutCount = Math.floor(attempts / MAX_FAILED_ATTEMPTS);
    const lockoutMs = Math.min(
      INITIAL_LOCKOUT_MS * 2 ** (lockoutCount - 1),
      MAX_LOCKOUT_MS
    );
    lockedUntil = Date.now() + lockoutMs;
  }

  const state = { attempts, lockedUntil };
  const storage = await getStorage(FAILURE_STORAGE_KEY);
  await storage.set(JSON.stringify(state));
  return state;
}

export async function clearFailedPasscodeAttempts() {
  const storage = await getStorage(FAILURE_STORAGE_KEY);
  await storage.remove();
}

export function registerSensitiveStateCleanup(cleanup) {
  if (typeof cleanup !== 'function') {
    throw new TypeError('Sensitive state cleanup must be a function.');
  }
  sensitiveStateCleanups.add(cleanup);
  return () => sensitiveStateCleanups.delete(cleanup);
}

async function runSensitiveStateCleanups() {
  const errors = [];
  for (const cleanup of sensitiveStateCleanups) {
    try {
      await cleanup();
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

export async function clearSensitiveState() {
  const errors = await runSensitiveStateCleanups();
  if (errors.length) {
    throw new AggregateError(
      errors,
      'Could not completely clear in-memory sensitive state.'
    );
  }
}

async function clearWebSessionData(preservePasscodes) {
  if (typeof window === 'undefined') return [];
  const errors = [];

  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      if (!preservePasscodes || storage === window.sessionStorage) {
        storage.clear();
      } else {
        for (const key of Object.keys(storage)) {
          if (
            key !== PASSCODE_STORAGE_KEY &&
            key !== FAILURE_STORAGE_KEY
          ) {
            storage.removeItem(key);
          }
        }
      }
    } catch (error) {
      errors.push(error);
    }
  }

  if (window.indexedDB?.databases) {
    try {
      const databases = await window.indexedDB.databases();
      await Promise.all(
        databases
          .filter((database) => database.name)
          .map(
            (database) =>
              new Promise((resolve, reject) => {
                const request = window.indexedDB.deleteDatabase(database.name);
                request.onsuccess = () => resolve();
                request.onerror = () =>
                  reject(
                    request.error ||
                      new Error(`Could not delete database ${database.name}.`)
                  );
                request.onblocked = () =>
                  reject(
                    new Error(`Database deletion was blocked: ${database.name}.`)
                  );
              })
          )
      );
    } catch (error) {
      errors.push(error);
    }
  }

  return errors;
}

async function clearNativeSessionData(preservePasscodes) {
  if (!Capacitor.isNativePlatform()) return [];

  try {
    const { Preferences } = await import('@capacitor/preferences');
    if (!preservePasscodes) {
      await Preferences.clear();
      return [];
    }

    const { keys } = await Preferences.keys();
    await Promise.all(
      keys
        .filter(
          (key) =>
            key !== PASSCODE_STORAGE_KEY && key !== FAILURE_STORAGE_KEY
        )
        .map((key) => Preferences.remove({ key }))
    );
    return [];
  } catch (error) {
    return [error];
  }
}

async function clearSessionData({ preservePasscodes }) {
  const errors = [
    ...(await clearWebSessionData(preservePasscodes)),
    ...(await clearNativeSessionData(preservePasscodes)),
  ];
  if (errors.length) {
    throw new AggregateError(errors, 'Could not completely clear local session data.');
  }
}

export async function triggerDecoyWipe() {
  const cleanupErrors = await runSensitiveStateCleanups();
  let storageError;
  try {
    await clearSessionData({ preservePasscodes: true });
  } catch (error) {
    storageError = error;
  }
  if (cleanupErrors.length || storageError) {
    throw new AggregateError(
      [...cleanupErrors, ...(storageError ? [storageError] : [])],
      'Could not completely clear sensitive session state.'
    );
  }
}

export async function triggerPanicWipe() {
  const cleanupErrors = await runSensitiveStateCleanups();
  let storageError;
  try {
    await clearSessionData({ preservePasscodes: false });
  } catch (error) {
    storageError = error;
  }

  if (typeof window !== 'undefined' && window.caches) {
    try {
      await Promise.all(
        (await window.caches.keys()).map((cacheName) =>
          window.caches.delete(cacheName)
        )
      );
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  const storage = await getStorage();
  try {
    await storage.remove();
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (cleanupErrors.length || storageError) {
    throw new AggregateError(
      [...cleanupErrors, ...(storageError ? [storageError] : [])],
      'Panic wipe could not completely clear sensitive data.'
    );
  }
}
