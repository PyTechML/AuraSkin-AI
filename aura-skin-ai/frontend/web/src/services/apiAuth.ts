import { apiPost } from "./apiInternal";

export interface SignupPayload {
  email: string;
  password: string;
  name?: string;
}

export async function signup(payload: SignupPayload): Promise<void> {
  await apiPost("/auth/signup", payload);
}

