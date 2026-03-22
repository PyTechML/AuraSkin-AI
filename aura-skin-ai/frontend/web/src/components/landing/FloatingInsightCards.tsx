"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { RefObject } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const PALETTE = ["#E5BEB5", "#EEE6CA", "#F5FAE1"] as const;
const TEXT_COLOR = "#896C6C";

const INSIGHTS = [
  "Personalized Analysis",
  "Dermatology-Based Logic",
  "Routine Built For You",
  "Tracks Skin Progress",
  "Adapts To Lifestyle",
  "Safe Ingredient Mapping",
] as const;

const CURSOR_FACTOR = 0.02;
const CURSOR_CLAMP = 15;

/**
 * Chip centers (top/left %) kept in the periphery so they never sit on the headline or CTA.
 * Pairs are upper corners, mid sides, lower corners — all outside the central content band.
 */
const POSITIONS: { top: string; left: string }[] = [
  { top: "16%", left: "11%" },
  { top: "16%", left: "89%" },
  { top: "50%", left: "6%" },
  { top: "50%", left: "94%" },
  { top: "84%", left: "12%" },
  { top: "84%", left: "88%" },
];

/** Slight tilt only — large angles read as a layout bug next to centered hero type */
const CARD_ANGLES = [-4, 3, -3, 4, -2, 3];

export type MouseState = { x: number; y: number } | null;

function useCursorOffset(
  mouse: MouseState,
  rect: DOMRect | null,
  position: { top: string; left: string }
) {
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const springX = useSpring(offsetX, { stiffness: 120, damping: 24 });
  const springY = useSpring(offsetY, { stiffness: 120, damping: 24 });

  useEffect(() => {
    if (!mouse || !rect || rect.width === 0 || rect.height === 0) {
      offsetX.set(0);
      offsetY.set(0);
      return;
    }
    const leftPct = parseFloat(position.left) / 100;
    const topPct = parseFloat(position.top) / 100;
    const cardCenterX = rect.left + rect.width * leftPct;
    const cardCenterY = rect.top + rect.height * topPct;
    let dx = (mouse.x - cardCenterX) * CURSOR_FACTOR;
    let dy = (mouse.y - cardCenterY) * CURSOR_FACTOR;
    dx = Math.max(-CURSOR_CLAMP, Math.min(CURSOR_CLAMP, dx));
    dy = Math.max(-CURSOR_CLAMP, Math.min(CURSOR_CLAMP, dy));
    offsetX.set(dx);
    offsetY.set(dy);
  }, [mouse, rect, position.left, position.top, offsetX, offsetY]);

  return { x: springX, y: springY };
}

function InsightCard({
  label,
  backgroundColor,
  position,
  index,
  mouse,
  rect,
  rotationDeg,
}: {
  label: string;
  backgroundColor: string;
  position: { top: string; left: string };
  index: number;
  mouse: MouseState;
  rect: DOMRect | null;
  rotationDeg: number;
}) {
  const { x, y } = useCursorOffset(mouse, rect, position);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        transform: "translate(-50%, -50%)",
      }}
    >
      <motion.div
        style={{ x, y, rotate: rotationDeg }}
        className="will-change-transform"
      >
        <motion.div
          className="px-4 py-2.5 max-w-[148px] min-h-[48px] flex items-center justify-center border border-white/30"
          style={{
            backgroundColor,
            color: TEXT_COLOR,
            borderRadius: 16,
          }}
          initial={false}
          animate={{
            opacity: 1,
            y: [0, -5, 0],
            x: [0, 2, 0],
            boxShadow: [
              "0 4px 20px rgba(137, 108, 108, 0.12)",
              "0 6px 24px rgba(137, 108, 108, 0.18)",
              "0 4px 20px rgba(137, 108, 108, 0.12)",
            ],
          }}
          transition={{
            opacity: { duration: 0.5, delay: index * 0.08, ease: "easeOut" },
            y: {
              duration: 5 + index * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            },
            x: {
              duration: 5 + index * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            },
            boxShadow: {
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        >
          <span className="text-sm font-medium leading-tight text-center">
            {label}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

type FloatingInsightCardsProps = {
  mouse?: MouseState;
  containerRef?: RefObject<HTMLElement | null>;
};

export function FloatingInsightCards({ mouse: propsMouse, containerRef }: FloatingInsightCardsProps = {}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const [internalMouse, setInternalMouse] = useState<MouseState>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const mouse = propsMouse ?? internalMouse;

  const updateRect = useCallback(() => {
    const el = containerRef?.current ?? internalRef.current;
    if (el) setRect(el.getBoundingClientRect());
  }, [containerRef]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setInternalMouse({ x: e.clientX, y: e.clientY });
      if (internalRef.current) setRect(internalRef.current.getBoundingClientRect());
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setInternalMouse(null);
  }, []);

  useEffect(() => {
    updateRect();
    const el = containerRef?.current ?? internalRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateRect);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateRect, containerRef]);

  useEffect(() => {
    if (propsMouse != null && (containerRef?.current ?? internalRef.current)) {
      setRect((containerRef?.current ?? internalRef.current)!.getBoundingClientRect());
    }
  }, [propsMouse, containerRef]);

  return (
    <div
      ref={internalRef}
      className="absolute inset-0 z-[1] overflow-hidden pointer-events-none"
      onMouseMove={containerRef == null ? handleMouseMove : undefined}
      onMouseLeave={containerRef == null ? handleMouseLeave : undefined}
      aria-hidden
    >
      {INSIGHTS.map((label, i) => (
        <InsightCard
          key={label}
          label={label}
          backgroundColor={PALETTE[i % PALETTE.length]}
          position={POSITIONS[i]}
          index={i}
          mouse={mouse}
          rect={rect}
          rotationDeg={CARD_ANGLES[i % CARD_ANGLES.length]}
        />
      ))}
    </div>
  );
}
