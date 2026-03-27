const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? "http://localhost:3001";
const FRONTEND_BASE = process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";
const EXPECTED_STORE_ID =
  process.env.EXPECTED_STORE_ID ?? "9dff9b25-a7eb-44d7-ae12-42aca4dc77c3";
const EXPECTED_DERM_EMAIL =
  (process.env.EXPECTED_DERM_EMAIL ?? "doctor@auraskin.ai").toLowerCase();
const NEARBY_QUERY = process.env.NEARBY_QUERY ?? "lat=19.076&lng=72.8777";

function toArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

async function getJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertHealth() {
  const [backend, frontend] = await Promise.all([
    fetch(`${BACKEND_BASE}/api/stores`, { method: "GET" }),
    fetch(`${FRONTEND_BASE}/stores`, { method: "GET" }),
  ]);
  assert(backend.ok, `Backend not healthy: ${backend.status}`);
  assert(frontend.ok, `Frontend not healthy: ${frontend.status}`);
}

function idsOf(items) {
  return new Set(
    items
      .map((item) => (item && typeof item === "object" ? item.id : null))
      .filter((id) => typeof id === "string" && id.length > 0)
  );
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a.values()) {
    if (!b.has(x)) return false;
  }
  return true;
}

async function main() {
  await assertHealth();

  const [storesBasePayload, storesNearbyPayload, dermBasePayload, dermNearbyPayload] =
    await Promise.all([
      getJson(`${BACKEND_BASE}/api/stores`),
      getJson(`${BACKEND_BASE}/api/stores/nearby?${NEARBY_QUERY}`),
      getJson(`${BACKEND_BASE}/api/dermatologists`),
      getJson(`${BACKEND_BASE}/api/dermatologists/nearby?${NEARBY_QUERY}`),
    ]);

  const storesBase = toArrayPayload(storesBasePayload);
  const storesNearby = toArrayPayload(storesNearbyPayload);
  const dermBase = toArrayPayload(dermBasePayload);
  const dermNearby = toArrayPayload(dermNearbyPayload);

  const storesBaseIds = idsOf(storesBase);
  const storesNearbyIds = idsOf(storesNearby);
  const dermBaseIds = idsOf(dermBase);
  const dermNearbyIds = idsOf(dermNearby);

  assert(
    sameSet(storesBaseIds, storesNearbyIds),
    "Stores nearby endpoint returned a different entity set than stores base endpoint."
  );
  assert(
    sameSet(dermBaseIds, dermNearbyIds),
    "Dermatologists nearby endpoint returned a different entity set than dermatologists base endpoint."
  );

  for (const storeId of storesBaseIds) {
    assert(
      !dermBaseIds.has(storeId),
      `Cross-mixing detected: id ${storeId} present in both stores and dermatologists.`
    );
  }

  assert(
    storesBaseIds.has(EXPECTED_STORE_ID),
    `Expected store id not found on /api/stores: ${EXPECTED_STORE_ID}`
  );
  const hasExpectedDerm = dermBase.some((d) => {
    if (!d || typeof d !== "object") return false;
    const email = typeof d.email === "string" ? d.email.toLowerCase() : "";
    return email === EXPECTED_DERM_EMAIL;
  });
  assert(
    hasExpectedDerm,
    `Expected dermatologist email not found on /api/dermatologists: ${EXPECTED_DERM_EMAIL}`
  );

  console.log("Smoke role guards passed.");
  console.log(
    JSON.stringify(
      {
        storesCount: storesBase.length,
        dermatologistsCount: dermBase.length,
        expectedStoreId: EXPECTED_STORE_ID,
        expectedDermEmail: EXPECTED_DERM_EMAIL,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`Smoke role guards failed: ${error.message}`);
  process.exit(1);
});
