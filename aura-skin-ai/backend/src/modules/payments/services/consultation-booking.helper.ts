import { getSupabaseClient } from "../../../database/supabase.client";

/**
 * `consultations.slot_id` FK often still references `consultation_slots` (legacy).
 * Public booking lists prefer `availability_slots`; a slot may exist only there.
 * Mirror the hybrid row into `consultation_slots` (same id) so the FK is satisfied.
 */
async function ensureLegacyConsultationSlotRow(
  dermatologistId: string,
  slotId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = getSupabaseClient();
  const { data: hybrid, error: hybridErr } = await supabase
    .from("availability_slots")
    .select("id, date, start_time, end_time, status")
    .eq("id", slotId)
    .eq("doctor_id", dermatologistId)
    .maybeSingle();

  if (hybridErr || !hybrid) {
    const { data: legacy, error: legacyErr } = await supabase
      .from("consultation_slots")
      .select("id")
      .eq("id", slotId)
      .eq("dermatologist_id", dermatologistId)
      .maybeSingle();
    if (legacyErr || !legacy) {
      return { error: "Slot not found" };
    }
    return { ok: true };
  }

  const row = hybrid as {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
  };
  const { error: upsertErr } = await supabase.from("consultation_slots").upsert(
    {
      id: row.id,
      dermatologist_id: dermatologistId,
      slot_date: row.date,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status,
    },
    { onConflict: "id" }
  );
  if (upsertErr) {
    return { error: upsertErr.message };
  }
  return { ok: true };
}

/**
 * Inserts a pending consultation and marks the slot booked (hybrid or legacy table).
 * Shared by Stripe webhook completion and zero-fee instant checkout — keep in sync with webhook expectations.
 */
export async function persistConsultationAndBookSlot(
  userId: string,
  dermatologistId: string,
  slotId: string
): Promise<{ consultationId: string } | { error: string }> {
  const supabase = getSupabaseClient();
  const ensured = await ensureLegacyConsultationSlotRow(dermatologistId, slotId);
  if ("error" in ensured) {
    return { error: ensured.error };
  }

  const { data: consultation, error: consultError } = await supabase
    .from("consultations")
    .insert({
      user_id: userId,
      dermatologist_id: dermatologistId,
      slot_id: slotId,
      consultation_status: "pending",
    })
    .select()
    .single();

  if (consultError || !consultation) {
    return { error: consultError?.message ?? "Failed to create consultation" };
  }

  const consultationId = (consultation as { id: string }).id;

  const { error: slotUpdateError } = await supabase
    .from("availability_slots")
    .update({ status: "booked" })
    .eq("id", slotId)
    .eq("doctor_id", dermatologistId);
  if (slotUpdateError) {
    await supabase
      .from("consultation_slots")
      .update({ status: "booked" })
      .eq("id", slotId)
      .eq("dermatologist_id", dermatologistId);
  }

  return { consultationId };
}
