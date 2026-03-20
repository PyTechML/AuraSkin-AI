import { redirect } from "next/navigation";

/** Redirect legacy /partner/patients to assigned-users. */
export default function PartnerPatientsPage() {
  redirect("/partner/assigned-users");
}
