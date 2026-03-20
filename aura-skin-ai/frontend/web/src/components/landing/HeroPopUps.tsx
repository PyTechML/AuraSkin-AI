"use client";

import { useRef, useState, useEffect } from "react";
import type { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PALETTE = ["#896C6C", "#E5BEB5", "#EEE6CA", "#F5FAE1"] as const;
const TEXT_COLOR = "#896C6C";

const MESSAGES = [
  "Personalized Analysis",
  "Dermatology-Based Logic",
  "Routine Built For You",
  "Tracks Skin Progress",
  "Adapts To Lifestyle",
  "Safe Ingredient Mapping",
] as const;

type ShapeType = "pill" | "blob" | "glass" | "rounded" | "polygon" | "diamond" | "cutCorner";

interface PopUpItem {
  id: string;
  message: string;
  shape: ShapeType;
  left: number;
  top: number;
  rotation: number;
  color: string;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SHAPE_TYPES: ShapeType[] = ["pill", "blob", "glass", "rounded", "polygon", "diamond", "cutCorner"];

function generateSet(sessionId: number): PopUpItem[] {
  const count = pickRandomInt(6, 9);
  const items: PopUpItem[] = [];

  for (let i = 0; i < count; i++) {
    items.push({
      id: `pop-${sessionId}-${i}`,
      message: pickRandom(MESSAGES),
      shape: pickRandom(SHAPE_TYPES),
      left: 10 + Math.random() * 75,
      top: 10 + Math.random() * 75,
      rotation: -30 + Math.random() * 60,
      color: pickRandom(PALETTE),
    });
  }
  return items;
}

const ENTER_DURATION = 0.3;
const EXIT_DURATION = 0.3;
const STAY_MS = 7000;

/** clip-path: soft hex-like polygon (no sharp points) */
const POLYGON_CLIP = "polygon(12% 0%, 88% 0%, 100% 25%, 100% 75%, 88% 100%, 12% 100%, 0% 75%, 0% 25%)";
/** clip-path: cut corner box */
const CUT_CORNER_CLIP = "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))";

function PopUpShape({ item, isExiting }: { item: PopUpItem; isExiting: boolean }) {
  const baseClass = "absolute flex items-center justify-center px-4 py-2.5 text-sm font-medium text-center leading-tight border border-white/20 shadow-lg";
  const textColor = item.shape === "glass" || item.color === "#F5FAE1" ? TEXT_COLOR : "#F5FAE1";
  const style: React.CSSProperties = {
    left: `${item.left}%`,
    top: `${item.top}%`,
    transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
    backgroundColor: item.color,
    color: textColor,
  };

  const shapeClass = {
    pill: "rounded-[9999px] min-w-[120px] min-h-[44px]",
    blob: "rounded-full min-w-[100px] min-h-[100px]",
    glass: "rounded-2xl min-w-[130px] min-h-[48px] backdrop-blur-md border-white/30",
    rounded: "rounded-3xl min-w-[120px] min-h-[48px]",
    polygon: "min-w-[110px] min-h-[48px]",
    diamond: "min-w-[100px] min-h-[100px] rounded-xl",
    cutCorner: "min-w-[120px] min-h-[48px]",
  }[item.shape];

  if (item.shape === "polygon") {
    style.clipPath = POLYGON_CLIP;
    style.WebkitClipPath = POLYGON_CLIP;
  }
  if (item.shape === "cutCorner") {
    style.clipPath = CUT_CORNER_CLIP;
    style.WebkitClipPath = CUT_CORNER_CLIP;
  }
  if (item.shape === "diamond") {
    style.transform = `translate(-50%, -50%) rotate(${item.rotation + 45}deg)`;
  }

  return (
    <motion.div
      className={`${baseClass} ${shapeClass}`}
      style={style}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{
        opacity: isExiting ? 0 : 1,
        scale: isExiting ? 0.9 : 1,
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        duration: isExiting ? EXIT_DURATION : ENTER_DURATION,
        ease: "easeOut",
      }}
    >
      {item.shape === "diamond" ? (
        <span className="rotate-[-45deg] block px-2 py-1">{item.message || MESSAGES[0]}</span>
      ) : (
        <span className="block overflow-visible px-1 py-0.5 text-center">{item.message || MESSAGES[0]}</span>
      )}
    </motion.div>
  );
}

export function HeroPopUps({
  active,
  containerRef,
}: {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
}) {
  const [items, setItems] = useState<PopUpItem[]>([]);
  const [isExiting, setIsExiting] = useState(false);
  const sessionIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActiveRef = useRef(false);

  useEffect(() => {
    if (active && !prevActiveRef.current) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      sessionIdRef.current += 1;
      setItems(generateSet(sessionIdRef.current));
      setIsExiting(false);

      timerRef.current = setTimeout(() => {
        setIsExiting(true);
        timerRef.current = setTimeout(() => {
          setItems([]);
          timerRef.current = null;
        }, EXIT_DURATION * 1000);
      }, STAY_MS);
    }
    prevActiveRef.current = active;
  }, [active]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      <AnimatePresence mode="sync">
        {items.map((item) => (
          <PopUpShape key={item.id} item={item} isExiting={isExiting} />
        ))}
      </AnimatePresence>
    </div>
  );
}
