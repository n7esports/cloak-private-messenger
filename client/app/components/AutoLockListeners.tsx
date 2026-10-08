"use client";

import { useEffect } from "react";
import { installAutoLockListeners } from "../../store/useVaultStore";

export default function AutoLockListeners() {
  useEffect(() => installAutoLockListeners(), []);
  return null;
}
