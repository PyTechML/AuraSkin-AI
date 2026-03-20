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

const CARD_WIDTH = 140;
const CARD_HEIGHT = 48;
const CURSOR_FACTOR = 0.02;
const CURSOR_CLAMP = 15;

/** Scattered positions (top/left %) avoiding center ~35–65% x, ~40–60% y */
const POSITIONS: { top: string; left: string }[] = [
  { top: "12%", left: "8%" },
  { top: "18%", left: "82%" },
  { top: "42%", left: "5%" },
  { top: "48%", left: "88%" },
  { top: "72%", left: "10%" },
  { top: "78%", left: "85%" },
];

/** Per-card rotation (degrees) so they are not all at the same angle */
const CARD_ANGLES = [-12, 5, -8, 3, -5, 10];

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
    const cardCenterX = rect.left + rect.width * leftPct + CARD_WIDTH / 2;
    const cardCenterY = rect.top + rect.height * topPct + CARD_HEIGHT / 2;
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
    <motion.div
      className="absolute pointer-events-auto"
      style={{
        top: position.top,
        left: position.left,
        x,
        y,
        rotate: rotationDeg,
      }}
    >
      <motion.div
        className="px-4 py-2.5 w-[140px] min-h-[48px] flex items-center justify-center border border-white/30"
        style={{
          backgroundColor,
          color: TEXT_COLOR,
          borderRadius: 16,
        }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          y: [0, -8, 0],
          x: [0, 3, 0],
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
        whileHover={{ scale: 1.05 }}
      >
        <span className="text-sm font-medium leading-tight text-center">
          {label}
        </span>
      </motion.div>
    </motion.div>
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
      className="absolute inset-0 overflow-hidden pointer-events-none"
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
