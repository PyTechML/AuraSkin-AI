import { apiPost } from "./apiInternal";

export interface SignupPayload {
  email: string;
  password: string;
  name?: string;
  requested_role?: "USER" | "STORE" | "DERMATOLOGIST";
}

export async function signup(payload: SignupPayload): Promise<void> {
  await apiPost("/auth/signup", payload);
}

