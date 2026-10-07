import { useEffect, useRef, useState } from 'react';
import {
  clearFailedPasscodeAttempts,
  getPasscodeFailureState,
  recordFailedPasscodeAttempt,
} from '../lib/security';

const PASSCODE_PATTERN = /^\d{4,12}$/;

export default function PasscodeModal({
  configured,
  error: initialError = '',
  onSetup,
  onVerify,
}) {
  const [primaryPasscode, setPrimaryPasscode] = useState('');
  const [confirmPrimaryPasscode, setConfirmPrimaryPasscode] = useState('');
  const [decoyPasscode, setDecoyPasscode] = useState('');
  const [confirmDecoyPasscode, setConfirmDecoyPasscode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(initialError);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lockoutReady, setLockoutReady] = useState(!configured);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    setLockoutReady(!configured);
    if (!configured) return undefined;
    let active = true;
    getPasscodeFailureState()
      .then((state) => {
        if (!active) return;
        setAttempts(state.attempts);
        setLockedUntil(state.lockedUntil);
        setLockoutReady(true);
      })
      .catch((stateError) => {
        if (!active) return;
        setError(stateError.message || 'Could not read passcode lockout state.');
        setLockoutReady(true);
      });
    return () => {
      active = false;
    };
  }, [configured]);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  useEffect(() => {
    if (!lockedUntil) return undefined;
    const updateRemaining = () => {
      const remaining = Math.max(0, lockedUntil - Date.now());
      setRemainingMs(remaining);
      if (!remaining) setLockedUntil(0);
    };
    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(intervalId);
  }, [lockedUntil]);

  async function handleSetup(event) {
    event.preventDefault();
    setError('');
    if (
      !PASSCODE_PATTERN.test(primaryPasscode) ||
      !PASSCODE_PATTERN.test(decoyPasscode)
    ) {
      setError('Each passcode must contain 4 to 12 digits.');
      return;
    }
    if (primaryPasscode !== confirmPrimaryPasscode) {
      setError('The primary passcodes do not match.');
      return;
    }
    if (decoyPasscode !== confirmDecoyPasscode) {
      setError('The decoy passcodes do not match.');
      return;
    }
    if (primaryPasscode === decoyPasscode) {
      setError('Choose different primary and decoy passcodes.');
      return;
    }

    setBusy(true);
    try {
      await onSetup(primaryPasscode, decoyPasscode);
    } catch (setupError) {
      setError(setupError.message || 'Could not save your passcodes.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock(event) {
    event.preventDefault();
    if (busy || !lockoutReady || lockedUntil > Date.now()) return;
    setError('');
    if (!PASSCODE_PATTERN.test(passcode)) {
      setError('Enter your 4 to 12 digit passcode.');
      return;
    }

    setBusy(true);
    try {
      const result = await onVerify(passcode);
      if (result === 'primary' || result === 'decoy') {
        await clearFailedPasscodeAttempts();
        return;
      }

      const failureState = await recordFailedPasscodeAttempt();
      setAttempts(failureState.attempts);
      setPasscode('');
      if (failureState.lockedUntil > Date.now()) {
        setLockedUntil(failureState.lockedUntil);
        setError(
          `Too many attempts. Try again in ${Math.ceil((failureState.lockedUntil - Date.now()) / 1000)} seconds.`
        );
      } else {
        setError('Incorrect passcode.');
      }
    } catch (verifyError) {
      setError(verifyError.message || 'Passcode verification failed.');
    } finally {
      setBusy(false);
    }
  }

  const isLockedOut = remainingMs > 0;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#09090b] px-5 py-8 text-zinc-100">
      <section
        aria-labelledby="passcode-title"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#141416] p-6 shadow-2xl"
        role="dialog"
      >
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-emerald-900 bg-emerald-950/50 text-emerald-300">
            <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M7 10V7a5 5 0 0 1 10 0v3m-12 0h14v11H5V10Zm7 4v3" />
            </svg>
          </span>
          <h1 className="text-xl font-semibold" id="passcode-title">
            {configured ? 'Unlock Cloak' : 'Secure your vault'}
          </h1>
          <p className="mt-2 text-sm leading-5 text-zinc-400">
            {configured
              ? 'Enter your passcode to continue.'
              : 'Create a primary passcode and a separate decoy passcode.'}
          </p>
        </div>

        {configured ? (
          <form className="space-y-4" onSubmit={handleUnlock}>
            <label className="block">
              <span className="sr-only">Passcode</span>
              <input
                autoComplete="off"
                className="h-14 w-full rounded-xl border border-zinc-700 bg-zinc-950 text-center font-mono text-2xl tracking-[0.5em] text-zinc-100 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                disabled={busy || isLockedOut || !lockoutReady}
                inputMode="numeric"
                maxLength={12}
                onChange={(event) =>
                  setPasscode(event.target.value.replace(/\D/g, ''))
                }
                pattern="[0-9]*"
                ref={inputRef}
                type="password"
                value={passcode}
              />
            </label>
            {isLockedOut && (
              <p aria-live="polite" className="text-center text-sm text-amber-300">
                Locked for {Math.ceil(remainingMs / 1000)} seconds.
              </p>
            )}
            <button
              className="h-12 w-full rounded-xl bg-emerald-500 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
              disabled={busy || isLockedOut || !lockoutReady}
              type="submit"
            >
              {busy ? 'Checking…' : 'Unlock'}
            </button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleSetup}>
            <label className="block text-sm text-zinc-300">
              Primary passcode
              <input
                autoComplete="new-password"
                className="mt-1.5 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 font-mono tracking-widest outline-none focus:border-emerald-600"
                inputMode="numeric"
                maxLength={12}
                onChange={(event) => setPrimaryPasscode(event.target.value.replace(/\D/g, ''))}
                pattern="[0-9]*"
                ref={inputRef}
                type="password"
                value={primaryPasscode}
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Confirm primary passcode
              <input
                autoComplete="new-password"
                className="mt-1.5 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 font-mono tracking-widest outline-none focus:border-emerald-600"
                inputMode="numeric"
                maxLength={12}
                onChange={(event) => setConfirmPrimaryPasscode(event.target.value.replace(/\D/g, ''))}
                pattern="[0-9]*"
                type="password"
                value={confirmPrimaryPasscode}
              />
            </label>
            <label className="block pt-2 text-sm text-zinc-300">
              Decoy passcode
              <input
                autoComplete="new-password"
                className="mt-1.5 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 font-mono tracking-widest outline-none focus:border-emerald-600"
                inputMode="numeric"
                maxLength={12}
                onChange={(event) => setDecoyPasscode(event.target.value.replace(/\D/g, ''))}
                pattern="[0-9]*"
                type="password"
                value={decoyPasscode}
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Confirm decoy passcode
              <input
                autoComplete="new-password"
                className="mt-1.5 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 font-mono tracking-widest outline-none focus:border-emerald-600"
                inputMode="numeric"
                maxLength={12}
                onChange={(event) => setConfirmDecoyPasscode(event.target.value.replace(/\D/g, ''))}
                pattern="[0-9]*"
                type="password"
                value={confirmDecoyPasscode}
              />
            </label>
            <button
              className="mt-2 h-12 w-full rounded-xl bg-emerald-500 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy ? 'Securing…' : 'Create passcodes'}
            </button>
          </form>
        )}

        {error && (
          <p aria-live="polite" className="mt-4 text-center text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}
        <p className="mt-5 text-center text-xs leading-5 text-zinc-500">
          Remember both passcodes. They cannot be recovered.
        </p>
      </section>
    </div>
  );
}
