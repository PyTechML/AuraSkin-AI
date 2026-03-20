import { getSupabaseClient } from "../database/supabase.client";

async function upsertStores() {
  const supabase = getSupabaseClient();
  const rows = [
    {
      name: "AuraSkin Studio San Francisco",
      address: "1 Market St, San Francisco, CA",
      city: "San Francisco",
      latitude: 37.7936,
      longitude: -122.3958,
      contact_number: "+1 415-000-0001",
      status: "active",
      description: "Flagship AuraSkin partner studio in downtown San Francisco.",
      opening_hours: "Mon–Sat 9AM–7PM, Sun 10AM–5PM",
    },
    {
      name: "AuraSkin Soho New York",
      address: "120 Prince St, New York, NY",
      city: "New York",
      latitude: 40.7243,
      longitude: -74.0007,
      contact_number: "+1 212-000-0002",
      status: "active",
      description: "Boutique skincare and pharmacy partner in Soho.",
      opening_hours: "Mon–Sun 10AM–8PM",
    },
    {
      name: "AuraSkin London Clinic",
      address: "221B Baker St, London",
      city: "London",
      latitude: 51.5238,
      longitude: -0.1586,
      contact_number: "+44 20 0000 0003",
      status: "active",
      description: "Central London dermatology-led skincare store.",
      opening_hours: "Mon–Sat 9AM–6PM",
    },
    {
      name: "AuraSkin Dubai Mall",
      address: "Financial Center Rd, Dubai",
      city: "Dubai",
      latitude: 25.1985,
      longitude: 55.2796,
      contact_number: "+971 4 000 0004",
      status: "active",
      description: "Premium AuraSkin partner in The Dubai Mall.",
      opening_hours: "Mon–Sun 10AM–11PM",
    },
    {
      name: "AuraSkin Mumbai Bandra",
      address: "Linking Rd, Bandra West, Mumbai",
      city: "Mumbai",
      latitude: 19.0600,
      longitude: 72.8365,
      contact_number: "+91 22 0000 0005",
      status: "active",
      description: "High-traffic skincare pharmacy in Bandra.",
      opening_hours: "Mon–Sun 10AM–9PM",
    },
    {
      name: "AuraSkin Delhi Saket",
      address: "Saket District Centre, New Delhi",
      city: "Delhi",
      latitude: 28.5286,
      longitude: 77.2193,
      contact_number: "+91 11 0000 0006",
      status: "active",
      description: "Dermatologist-affiliated clinic and retail in South Delhi.",
      opening_hours: "Mon–Sat 10AM–8PM",
    },
    {
      name: "AuraSkin Surat Ghod Dod",
      address: "Ghod Dod Rd, Surat",
      city: "Surat",
      latitude: 21.1735,
      longitude: 72.8083,
      contact_number: "+91 261 000 0007",
      status: "active",
      description: "Regional AuraSkin partner in Surat.",
      opening_hours: "Mon–Sat 10AM–8PM",
    },
    {
      name: "AuraSkin Tokyo Shibuya",
      address: "Shibuya Crossing, Tokyo",
      city: "Tokyo",
      latitude: 35.6595,
      longitude: 139.7005,
      contact_number: "+81 3-0000-0008",
      status: "active",
      description: "Skincare concept store near Shibuya Crossing.",
      opening_hours: "Mon–Sun 10AM–9PM",
    },
  ];

  await supabase
    .from("stores")
    .upsert(rows, { onConflict: "name,city" })
    .select();
}

async function upsertDermatologists() {
  const supabase = getSupabaseClient();
  const rows = [
    {
      name: "Dr. Maya Chen",
      clinic_name: "AuraSkin San Francisco Clinic",
      city: "San Francisco",
      specialization: "Medical Dermatology",
      latitude: 37.7939,
      longitude: -122.3964,
      contact_number: "+1 415-000-1001",
      rating: 4.9,
    },
    {
      name: "Dr. Rahul Singh",
      clinic_name: "Glow Dermatology Mumbai",
      city: "Mumbai",
      specialization: "Acne & Pigmentation",
      latitude: 19.0615,
      longitude: 72.8369,
      contact_number: "+91 22 0000 1002",
      rating: 4.8,
    },
    {
      name: "Dr. Aisha Khan",
      clinic_name: "DermaCare Dubai",
      city: "Dubai",
      specialization: "Cosmetic Dermatology",
      latitude: 25.1990,
      longitude: 55.2788,
      contact_number: "+971 4 000 1003",
      rating: 4.7,
    },
    {
      name: "Dr. Emily Smith",
      clinic_name: "London Skin Studio",
      city: "London",
      specialization: "Rosacea & Sensitive Skin",
      latitude: 51.5145,
      longitude: -0.1420,
      contact_number: "+44 20 0000 1004",
      rating: 4.8,
    },
    {
      name: "Dr. Hiro Tanaka",
      clinic_name: "Tokyo Clear Skin Clinic",
      city: "Tokyo",
      specialization: "Anti-ageing & Texture",
      latitude: 35.6610,
      longitude: 139.6990,
      contact_number: "+81 3-0000-1005",
      rating: 4.9,
    },
    {
      name: "Dr. Sara Mehta",
      clinic_name: "Delhi Skin & Laser Centre",
      city: "Delhi",
      specialization: "Laser & Pigmentation",
      latitude: 28.5292,
      longitude: 77.2180,
      contact_number: "+91 11 0000 1006",
      rating: 4.6,
    },
  ];

  await supabase
    .from("dermatologists")
    .upsert(rows, { onConflict: "name,city" })
    .select();
}

async function main() {
  await upsertStores();
  await upsertDermatologists();
}

main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Seed completed.");
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed", err);
    process.exit(1);
  });

