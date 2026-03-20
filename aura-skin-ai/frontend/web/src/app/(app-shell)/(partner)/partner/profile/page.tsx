import { redirect } from "next/navigation";

/** Redirect legacy /partner/profile to store-profile. */
export default function PartnerProfilePage() {
  redirect("/partner/store-profile");
}
