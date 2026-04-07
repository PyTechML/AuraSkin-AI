"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  OTP Error Code Constants (mirror backend OTP_ERROR_CODES)          */
/* ------------------------------------------------------------------ */

const EXPIRY_ERROR_CODES = ["OTP_EXPIRED", "CHALLENGE_EXPIRED"];
const RATE_LIMIT_CODES = ["TOO_MANY_REQUESTS", "TOO_MANY_ATTEMPTS"];

/** Extract errorCode from an error thrown by the API layer. */
function extractErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object") {
    if ("errorCode" in err) return (err as { errorCode?: string }).errorCode;
    if ("code" in err) return (err as { code?: string }).code;
  }
  return undefined;
}

function extractMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return (err as { message: string }).message;
  }
  return "Invalid verification code";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface OtpModalProps {
  isOpen: boolean;
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onClose: () => void;
}

export function OtpModal({ isOpen, email, onVerify, onResend, onClose }: OtpModalProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ---------- Timer ---------- */

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, timer]);

  /* ---------- Reset on open ---------- */

  useEffect(() => {
    if (isOpen) {
      // Auto-focus first input when opened
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      setTimer(60);
      setOtp(["", "", "", "", "", ""]);
      setError(null);
      setErrorCode(null);
    }
  }, [isOpen]);

  /* ---------- Input handling ---------- */

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit if complete
    if (newOtp.every(v => v !== "")) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);
    // Focus the next empty input or the last filled one
    const nextEmpty = newOtp.findIndex(v => v === "");
    inputRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();
    // Auto-submit if all 6 digits pasted
    if (newOtp.every(v => v !== "")) {
      handleVerify(newOtp.join(""));
    }
  };

  /* ---------- Verify ---------- */

  const handleVerify = useCallback(async (code: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError(null);
    setErrorCode(null);
    try {
      await onVerify(code);
    } catch (err: unknown) {
      const code = extractErrorCode(err);
      const msg = extractMessage(err);
      setErrorCode(code ?? null);
      setError(msg);

      // TASK 2 & 4: On expiry errors, immediately enable resend
      if (code && EXPIRY_ERROR_CODES.includes(code)) {
        setTimer(0);
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }

      // TASK 10: On too-many-attempts (auto-regenerated), clear inputs
      if (code && RATE_LIMIT_CODES.includes(code)) {
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }

      setIsVerifying(false);
    }
  }, [isVerifying, onVerify]);

  /* ---------- Resend ---------- */

  const handleResend = async () => {
    if (timer > 0) return;
    setResendStatus("sending");
    setError(null);
    setErrorCode(null);
    try {
      await onResend();
      setResendStatus("sent");
      setTimer(60);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => {
        setResendStatus("idle");
        inputRefs.current[0]?.focus();
      }, 2000);
    } catch (err: unknown) {
      const code = extractErrorCode(err);
      setErrorCode(code ?? null);
      setError(extractMessage(err));
      setResendStatus("idle");
    }
  };

  /* ---------- Computed state ---------- */

  const isExpired = errorCode != null && EXPIRY_ERROR_CODES.includes(errorCode);
  const isRateLimited = errorCode != null && RATE_LIMIT_CODES.includes(errorCode);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ maxHeight: "100dvh" }}
        >
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content — Task 5: mobile-safe scroll + dvh */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl"
            style={{ maxHeight: "calc(100dvh - 2rem)" }}
          >
            {/* Header Gradient */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            
            <div className="p-8">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  isExpired ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                }`}>
                  {isExpired ? <AlertTriangle size={36} /> : <ShieldCheck size={36} />}
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">
                    {isExpired ? "Code expired" : "Verify your email"}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {isExpired ? (
                      <>Request a new code for <span className="text-blue-400 font-medium">{email}</span>.</>
                    ) : (
                      <>Enter the 6-digit code we sent to <span className="text-blue-400 font-medium">{email}</span>.</>
                    )}
                  </p>
                </div>

                {/* OTP Inputs — Task 5: autoComplete for mobile autofill */}
                {!isExpired && (
                  <div className="flex gap-2 py-4">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={digit}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onPaste={handlePaste}
                        disabled={isVerifying}
                        className="w-12 h-14 text-center text-2xl font-bold rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                      />
                    ))}
                  </div>
                )}

                {/* Error display */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm font-medium ${
                      isExpired ? "text-amber-500" : isRateLimited ? "text-orange-500" : "text-rose-500"
                    }`}
                  >
                    {error}
                  </motion.p>
                )}

                <div className="pt-2 w-full space-y-4">
                  {/* Verify button — hide when expired */}
                  {!isExpired && (
                    <button
                      onClick={() => handleVerify(otp.join(""))}
                      disabled={isVerifying || otp.some(v => v === "")}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-blue-600"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Verifying...
                        </>
                      ) : (
                        "Verify Account"
                      )}
                    </button>
                  )}

                  {/* Resend / Timer */}
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <button
                      onClick={handleResend}
                      disabled={timer > 0 || resendStatus === "sending"}
                      className={`font-medium transition-colors ${
                        timer > 0 
                          ? "text-slate-500 cursor-not-allowed" 
                          : isExpired
                            ? "text-amber-400 hover:text-amber-300"
                            : "text-blue-400 hover:text-blue-300"
                      }`}
                    >
                      {resendStatus === "sending"
                        ? "Sending..."
                        : resendStatus === "sent"
                          ? "Sent!"
                          : isExpired
                            ? "Send new code"
                            : "Resend code"}
                    </button>
                    {timer > 0 && (
                      <span className="text-slate-500">
                        {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
