import { supabase } from "@/lib/supabase";

/**
 * Handles Supabase Email OTP flows for Signup and Login.
 */
export const otpService = {
  /**
   * Triggers signup OTP by calling supabase.auth.signUp.
   * Supabase automatically sends an OTP to the email if confirmation is enabled.
   */
  async sendSignupOtp(email: string, password: string, metadata: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) throw error;
    return data;
  },

  /**
   * Verifies the 6-digit OTP code for a new signup.
   */
  async verifySignupOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    if (error) throw error;
    return data;
  },

  /**
   * Triggers login flow. Uses signInWithOtp to send a 6-digit code to the user's email.
   */
  async sendLoginOtp(email: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Verifies the 6-digit OTP code for login.
   */
  async verifyLoginOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) throw error;
    return data;
  },
};
