"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OtpVerificationFormProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isVerifyingValue?: boolean;
}

export function OtpVerificationForm({
  email,
  onVerify,
  onResend,
  isVerifyingValue = false,
}: OtpVerificationFormProps) {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [activeInput, setActiveInput] = useState(0);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(isVerifyingValue);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, canResend]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // Get last char
    setOtp(newOtp);

    // Focus next if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    
    // Focus last filled or next empty
    const lastIdx = Math.min(pastedData.length, 5);
    inputRefs.current[lastIdx]?.focus();
  };

  const handleResend = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    try {
      await onResend();
      setTimer(60);
      setCanResend(false);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length !== 6) return;

    setIsVerifying(true);
    try {
      await onVerify(otpValue);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent a 6-digit verification code to
        </p>
        <p className="text-sm font-medium text-foreground">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2 sm:gap-4 px-2">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={index === 0 ? handlePaste : undefined}
              className={cn(
                "w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-background/50 border-input transition-all duration-200",
                "focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2",
                digit ? "border-primary/50 bg-primary/5" : ""
              )}
              disabled={isVerifying}
            />
          ))}
        </div>

        <div className="space-y-4">
          <Button
            type="submit"
            className="w-full h-11"
            disabled={otp.join("").length !== 6 || isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>

          <div className="flex flex-col items-center justify-center gap-1 text-sm">
            <span className="text-muted-foreground">Didn&apos;t receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend || isResending}
              className={cn(
                "transition-colors duration-200 font-medium pb-1 border-b border-transparent",
                canResend && !isResending
                  ? "text-accent hover:text-accent/80 hover:border-accent"
                  : "text-muted-foreground cursor-not-allowed"
              )}
            >
              {isResending ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Sending...
                </span>
              ) : canResend ? (
                "Resend Code"
              ) : (
                `Resend in ${timer}s`
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
