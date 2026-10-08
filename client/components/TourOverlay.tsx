"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { pulse, spotlightRing, tourTooltip } from "../lib/motion";
import { setFlag } from "../lib/flags";

const steps = [
  { target: "New chat", title: "New Chat" },
  { target: "Lock", title: "Vault Lock" },
  { target: "Welcome Guide", title: "Cloak Guide" },
] as const;

interface TargetRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

interface TourOverlayProps {
  onDone: () => void;
}

export function TourOverlay({ onDone }: TourOverlayProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const tooltipVariants = useMemo(
    () => tourTooltip(reduceMotion),
    [reduceMotion],
  );

  useEffect(() => {
    const updateTarget = () => {
      const currentStep = steps[stepIndex];
      const target = Array.from(
        document.querySelectorAll<HTMLElement>("button, a"),
      ).find(
        (element) =>
          element.textContent?.trim().toLowerCase().includes(
          currentStep.target.toLowerCase(),
          ),
      );
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      if (!target) {
        setError(`Could not find the "${currentStep.target}" tour target.`);
        setTargetRect(null);
        return;
      }
      setError("");
      const rect = target.getBoundingClientRect();
      setTargetRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      });
    };

    updateTarget();
    window.addEventListener("resize", updateTarget, { passive: true });
    window.addEventListener("scroll", updateTarget, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [stepIndex]);

  const tooltipStyle = useMemo(() => {
    if (!targetRect || viewport.width === 0 || viewport.height === 0) return {};
    const tooltipHeight = 180;
    const left = Math.max(
      16,
      Math.min(targetRect.left, viewport.width - 336),
    );
    const belowTop = targetRect.bottom + 16;
    const top =
      belowTop + tooltipHeight <= viewport.height
        ? belowTop
        : Math.max(16, targetRect.top - tooltipHeight - 16);
    return { left, top };
  }, [targetRect, viewport]);

  async function finishTour() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await setFlag("tour-completed", true);
      onDone();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `Could not save tour completion: ${cause.message}`
          : "Could not save tour completion.",
      );
      setSaving(false);
    }
  }

  function advance() {
    if (stepIndex === steps.length - 1) {
      void finishTour();
    } else {
      setStepIndex((current) => current + 1);
    }
  }

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  return (
    <div className="fixed inset-0 z-[100] font-sans text-cloak-text">
      {targetRect ? (
        <>
          <svg
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 h-full w-full"
            viewBox={`0 0 ${viewport.width} ${viewport.height}`}
            preserveAspectRatio="none"
          >
            <path
              d={`M0 0H${viewport.width}V${viewport.height}H0Z M${targetRect.left - 8} ${targetRect.top - 8}H${targetRect.right + 8}V${targetRect.bottom + 8}H${targetRect.left - 8}Z`}
              fill="rgba(9,9,11,0.85)"
              fillRule="evenodd"
            />
          </svg>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed rounded-xl border-2 border-cloak-accent shadow-glow"
            animate={spotlightRing(targetRect, reduceMotion)}
          />
        </>
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-cloak-bg/85" />
      )}

      <AnimatePresence mode="wait">
        <motion.section
          key={stepIndex}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-step-title"
          aria-describedby="tour-step-description"
          variants={tooltipVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          style={tooltipStyle}
          className={`fixed w-[min(20rem,calc(100vw-2rem))] rounded-card border border-cloak-border bg-cloak-surface1 p-5 shadow-2xl ${
            targetRect ? "" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          }`}
        >
          <div className="flex items-center gap-2" aria-label="Tour progress">
            {steps.map((step, index) => (
              index === stepIndex && !reduceMotion ? (
                <motion.span
                  key={step.title}
                  aria-current="step"
                  variants={pulse}
                  initial="initial"
                  animate="animate"
                  className="h-2 w-2 rounded-full bg-cloak-accent"
                />
              ) : (
                <span
                  key={step.title}
                  aria-current={index === stepIndex ? "step" : undefined}
                  className={`h-2 w-2 rounded-full ${
                    index === stepIndex
                      ? "bg-cloak-accent"
                      : "bg-cloak-surface2"
                  }`}
                />
              )
            ))}
          </div>
          <h2 id="tour-step-title" className="mt-4 text-base font-semibold">
            {steps[stepIndex].title}
          </h2>
          <p id="tour-step-description" className="sr-only">
            Tour step {stepIndex + 1} of {steps.length}
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-cloak-danger">
              {error}
            </p>
          )}
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => void finishTour()}
              disabled={saving}
              className="min-h-10 px-3 text-sm text-cloak-muted transition hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent disabled:opacity-50"
            >
              Skip
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={saving}
                  className="min-h-10 rounded-lg border border-cloak-border px-3 py-2 text-sm transition hover:bg-cloak-surface2 focus:outline-none focus:ring-2 focus:ring-cloak-accent disabled:opacity-50"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={advance}
                disabled={saving}
                className="min-h-10 rounded-lg bg-cloak-accent px-4 py-2 text-sm font-semibold text-cloak-bg transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent disabled:opacity-50"
              >
                {stepIndex === steps.length - 1 ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
