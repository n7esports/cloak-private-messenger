export class ClipboardPermissionError extends Error {
  constructor() {
    super("Clipboard permission was denied or blocked by the browser.");
    this.name = "ClipboardPermissionError";
  }
}

export class ClipboardOperationError extends Error {
  constructor() {
    super("The browser could not complete the clipboard operation.");
    this.name = "ClipboardOperationError";
  }
}

function isPermissionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ["NotAllowedError", "SecurityError"].includes(error.name)
  );
}

export async function copyTextToClipboard(text: string): Promise<void> {
  const value = text ?? "";
  let clipboardFailure = false;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch (error) {
      if (isPermissionError(error)) throw new ClipboardPermissionError();
      clipboardFailure = true;
    }
  }

  if (typeof document === "undefined") {
    if (clipboardFailure) throw new ClipboardOperationError();
    throw new Error("Clipboard support is unavailable in this environment.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  let succeeded = false;
  try {
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    succeeded = typeof document.execCommand === "function"
      ? document.execCommand("copy")
      : false;
  } catch (error) {
    if (isPermissionError(error)) throw new ClipboardPermissionError();
    throw new ClipboardOperationError();
  } finally {
    textarea.parentNode?.removeChild(textarea);
  }

  if (!succeeded) {
    throw new ClipboardOperationError();
  }
}
