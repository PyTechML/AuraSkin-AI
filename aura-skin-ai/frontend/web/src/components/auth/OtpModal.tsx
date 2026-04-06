"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Loader2 } from "lucide-react";

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
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, timer]);

  useEffect(() => {
    if (isOpen) {
      // Auto-focus first input when opened
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      setTimer(60);
      setOtp(["", "", "", "", "", ""]);
      setError(null);
    }
  }, [isOpen]);

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

  const handleVerify = async (code: string) => {
    setIsVerifying(true);
    setError(null);
    try {
      await onVerify(code);
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResendStatus("sending");
    try {
      await onResend();
      setResendStatus("sent");
      setTimer(60);
      setTimeout(() => setResendStatus("idle"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
      setResendStatus("idle");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl"
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
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <ShieldCheck size={36} />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Trust, but verify</h2>
                  <p className="text-slate-400 text-sm">
                    We've sent a 6-digit code to <span className="text-blue-400 font-medium">{email}</span>.
                    Please enter it below.
                  </p>
                </div>

                <div className="flex gap-2 py-4">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      disabled={isVerifying}
                      className="w-12 h-14 text-center text-2xl font-bold rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                    />
                  ))}
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-rose-500 text-sm font-medium"
                  >
                    {error}
                  </motion.p>
                )}

                <div className="pt-2 w-full space-y-4">
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

                  <div className="flex items-center justify-center gap-4 text-sm">
                    <button
                      onClick={handleResend}
                      disabled={timer > 0 || resendStatus === "sending"}
                      className={`font-medium transition-colors ${
                        timer > 0 
                          ? "text-slate-500 cursor-not-allowed" 
                          : "text-blue-400 hover:text-blue-300"
                      }`}
                    >
                      {resendStatus === "sending" ? "Sending..." : resendStatus === "sent" ? "Sent!" : "Resend code"}
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
