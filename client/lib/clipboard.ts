export async function copyTextToClipboard(text: string): Promise<void> {
  const value = text ?? "";
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through to a document-based copy fallback below.
    }
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard support is unavailable in this environment.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let succeeded = false;
  try {
    succeeded = typeof document.execCommand === "function"
      ? document.execCommand("copy")
      : false;
  } finally {
    document.body.removeChild(textarea);
  }

  if (!succeeded) {
    throw new Error("Clipboard access is unavailable in this browser.");
  }
}
