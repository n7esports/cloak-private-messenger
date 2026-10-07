import { useEffect, useState } from 'react';

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      <path d="m18 6-12 12M6 6l12 12" />
    </svg>
  );
}

export default function InviteModal({
  open,
  roomCode,
  onClose,
}) {
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const qrValue = roomCode;

  useEffect(() => {
    if (!open || !qrValue) return undefined;

    let cancelled = false;
    setQrCode('');
    setError('');

    import('qrcode')
      .then((QRCode) =>
        QRCode.toDataURL(qrValue, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 256,
          color: { dark: '#09090b', light: '#ffffff' },
        })
      )
      .then((dataUrl) => {
        if (!cancelled) setQrCode(dataUrl);
      })
      .catch((qrError) => {
        if (!cancelled) {
          setError(
            qrError instanceof Error
              ? qrError.message
              : 'Unable to generate the access QR code.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, qrValue]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function copyAccessCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
    } catch (copyError) {
      console.error('Unable to copy the room access code:', copyError);
      setError('Clipboard access failed. Select and copy the code manually.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-labelledby="access-qr-title"
        aria-modal="true"
        className="my-auto w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-left shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-emerald-400">
              Out-of-band access
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-100" id="access-qr-title">
              Scan to connect
            </h2>
          </div>
          <button
            aria-label="Close QR access"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <p className="mt-2 text-sm leading-5 text-zinc-400">
          This 256-bit key is the only room credential. Share it through a trusted, private channel.
        </p>

        <div className="mx-auto my-5 grid aspect-square w-full max-w-[256px] place-items-center rounded-2xl bg-white p-3">
          {qrCode ? (
            <img
              alt="QR code for Cloak room access"
              className="h-full w-full rounded-lg"
              height="232"
              src={qrCode}
              width="232"
            />
          ) : (
            <div
              aria-live="polite"
              className="grid h-full w-full place-items-center rounded-lg bg-zinc-100 px-5 text-center text-sm text-zinc-600"
            >
              {error ? 'QR code unavailable' : 'Generating QR code…'}
            </div>
          )}
        </div>

        <label
          className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500"
          htmlFor="access-code"
        >
          256-bit room key
        </label>
        <textarea
          className="max-h-28 min-h-16 w-full resize-y break-all rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-[11px] leading-5 text-zinc-300 outline-none focus:border-emerald-700"
          id="access-code"
          onFocus={(event) => event.currentTarget.select()}
          readOnly
          value={roomCode}
        />

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            className="min-h-11 flex-1 rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
          <button
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
            onClick={copyAccessCode}
            type="button"
          >
            <CopyIcon />
            {copied ? 'Copied' : 'Copy access code'}
          </button>
        </div>
        {error && (
          <p aria-live="polite" className="mt-3 text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
