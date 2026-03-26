import { Suspense } from "react";
import BridgeClient from "./BridgeClient";

export default function OAuthBridgePage() {
  return (
    <Suspense fallback={null}>
      <BridgeClient />
    </Suspense>
  );
}

