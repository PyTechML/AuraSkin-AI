import type { UserRole } from "@/types";

export type AssistantPanelType =
  | "user"
  | "admin"
  | "store"
  | "dermatologist";

export type AssistantMessageRole = "user" | "assistant";

export type AssistantNavAction =
  | {
      kind?: "navigate";
      label: string;
      href: string;
      /** Optional stable identifier (for UI keys / analytics). */
      key?: string;
    }
  | {
      kind: "menu";
      label: string;
      /** Menu identifier understood by the assistant backend. */
      key: string;
      href?: never;
    };

export type AssistantMessage = {
  id: string;
  role: AssistantMessageRole;
  content: string;
  createdAt: number;
  actions?: AssistantNavAction[];
};

export type AssistantRequestPayload = {
  sessionId: string;
  userId?: string;
  userEmail?: string;
  role: UserRole;
  panelType: AssistantPanelType;
  path: string;
  messages: Array<Pick<AssistantMessage, "role" | "content">>;
  selectedAction?: {
    key: string;
    label: string;
  };
};

export type AssistantResponsePayload =
  | {
      ok: true;
      message: string;
      actions?: AssistantNavAction[];
      tokensUsedApprox?: number;
    }
  | {
      ok: false;
      code:
        | "RATE_LIMITED"
        | "DISABLED"
        | "INVALID_ROLE"
        | "REFUSED"
        | "TEMP_UNAVAILABLE"
        | "BLOCKED";
      message: string;
    };

