-- =============================================================================
-- AuraSkin AI — Safe location seed: dermatologists (+ documented store guidance)
-- Run in Supabase SQL Editor (service role). Idempotent: re-run does not duplicate.
-- Does NOT alter schema, DELETE rows, or bulk-update unrelated data.
-- =============================================================================
--
-- PUBLIC /stores API NOTE:
-- Partner stores: store_profiles + approved inventory + LIVE products.
-- Legacy `stores` rows (this seed) are merged in the API for map/list display when lat/lng present.
--
-- =============================================================================
-- 1) DERMATOLOGISTS — 5 cities × 5 doctors (25 rows)
-- =============================================================================

INSERT INTO dermatologists (
  name,
  clinic_name,
  city,
  specialization,
  latitude,
  longitude,
  contact_number,
  profile_image,
  email,
  years_experience,
  consultation_fee,
  rating
)
SELECT
  v.name,
  v.clinic_name,
  v.city,
  v.specialization,
  v.latitude::numeric,
  v.longitude::numeric,
  v.contact_number,
  NULL::text,
  v.email,
  v.years_experience::integer,
  v.consultation_fee::numeric,
  v.rating::numeric
FROM (
  VALUES
    -- Surat
    ('Dr. Anjali Patel', 'Adajan Skin Institute', 'Surat', 'Acne & Pigmentation', 21.189, 72.795, '+91 261 200 0101', 'seed.derm.surat.01@auraskin.local', 12, 1200, 4.8),
    ('Dr. Rohan Shah', 'Vesu DermaCare', 'Surat', 'Psoriasis & Eczema', 21.205, 72.825, '+91 261 200 0102', 'seed.derm.surat.02@auraskin.local', 10, 1100, 4.7),
    ('Dr. Priya Mehta', 'Varachha Clinical Dermatology', 'Surat', 'Hair & Scalp Disorders', 21.16, 72.88, '+91 261 200 0103', 'seed.derm.surat.03@auraskin.local', 14, 1300, 4.9),
    ('Dr. Vikram Kapoor', 'Katargam Laser Skin Centre', 'Surat', 'Laser & Cosmetic', 21.22, 72.84, '+91 261 200 0104', 'seed.derm.surat.04@auraskin.local', 11, 1500, 4.6),
    ('Dr. Kavita Desai', 'Athwa Skin & Wellness', 'Surat', 'Pediatric Dermatology', 21.17, 72.79, '+91 261 200 0105', 'seed.derm.surat.05@auraskin.local', 9, 1000, 4.8),
    -- Ahmedabad
    ('Dr. Meera Iyer', 'CG Road Skin Clinic', 'Ahmedabad', 'Medical Dermatology', 23.03, 72.56, '+91 79 200 0201', 'seed.derm.ahm.01@auraskin.local', 13, 1250, 4.7),
    ('Dr. Kunal Desai', 'Satellite Derma Institute', 'Ahmedabad', 'Vitiligo & Pigment', 23.015, 72.518, '+91 79 200 0202', 'seed.derm.ahm.02@auraskin.local', 15, 1400, 4.8),
    ('Dr. Sneha Rawal', 'Navrangpura Skin Centre', 'Ahmedabad', 'Acne & Rosacea', 23.036, 72.562, '+91 79 200 0203', 'seed.derm.ahm.03@auraskin.local', 8, 950, 4.5),
    ('Dr. Harsh Trivedi', 'Vastrapur Laser Clinic', 'Ahmedabad', 'Cosmetic Dermatology', 23.039, 72.528, '+91 79 200 0204', 'seed.derm.ahm.04@auraskin.local', 12, 1600, 4.9),
    ('Dr. Pooja Bhatt', 'Maninagar Derma Care', 'Ahmedabad', 'Allergic Skin Disorders', 22.995, 72.618, '+91 79 200 0205', 'seed.derm.ahm.05@auraskin.local', 10, 1050, 4.6),
    -- Mumbai
    ('Dr. Aditya Malhotra', 'Bandra West Skin Institute', 'Mumbai', 'Acne & Scarring', 19.06, 72.835, '+91 22 200 0301', 'seed.derm.mum.01@auraskin.local', 16, 2000, 4.9),
    ('Dr. Ritu Nair', 'Andheri Derma Centre', 'Mumbai', 'Hair Restoration', 19.113, 72.87, '+91 22 200 0302', 'seed.derm.mum.02@auraskin.local', 11, 1750, 4.7),
    ('Dr. Sameer Kulkarni', 'Powai Clinical Dermatology', 'Mumbai', 'Eczema & Urticaria', 19.119, 72.91, '+91 22 200 0303', 'seed.derm.mum.03@auraskin.local', 14, 1650, 4.8),
    ('Dr. Nisha Fernandes', 'Colaba Skin & Laser', 'Mumbai', 'Anti-ageing', 18.922, 72.832, '+91 22 200 0304', 'seed.derm.mum.04@auraskin.local', 13, 2200, 4.8),
    ('Dr. Varun Saxena', 'Thane Derma Clinic', 'Mumbai', 'Pediatric Skin', 19.218, 72.978, '+91 22 200 0305', 'seed.derm.mum.05@auraskin.local', 9, 1200, 4.5),
    -- Delhi
    ('Dr. Ananya Gupta', 'Saket Skin Institute', 'Delhi', 'Laser Treatments', 28.524, 77.219, '+91 11 200 0401', 'seed.derm.del.01@auraskin.local', 17, 1800, 4.9),
    ('Dr. Karan Oberoi', 'Connaught Place Derma', 'Delhi', 'Psoriasis', 28.631, 77.216, '+91 11 200 0402', 'seed.derm.del.02@auraskin.local', 12, 1500, 4.7),
    ('Dr. Shruti Kapoor', 'Dwarka Skin Centre', 'Delhi', 'Melasma & Pigmentation', 28.592, 77.046, '+91 11 200 0403', 'seed.derm.del.03@auraskin.local', 10, 1300, 4.6),
    ('Dr. Manish Verma', 'Rohini Clinical Derma', 'Delhi', 'Fungal & Infections', 28.749, 77.067, '+91 11 200 0404', 'seed.derm.del.04@auraskin.local', 15, 1150, 4.8),
    ('Dr. Tanvi Reddy', 'Vasant Kunj Skin Clinic', 'Delhi', 'Contact Dermatitis', 28.52, 77.152, '+91 11 200 0405', 'seed.derm.del.05@auraskin.local', 8, 1000, 4.4),
    -- Bangalore
    ('Dr. Sanjay Krishnan', 'Koramangala Derma Institute', 'Bangalore', 'Acne Surgery', 12.935, 77.622, '+91 80 200 0501', 'seed.derm.blr.01@auraskin.local', 14, 1550, 4.8),
    ('Dr. Lakshmi Rao', 'Indiranagar Skin Centre', 'Bangalore', 'Autoimmune Skin', 12.978, 77.641, '+91 80 200 0502', 'seed.derm.blr.02@auraskin.local', 18, 1700, 4.9),
    ('Dr. Imran Syed', 'Whitefield Laser Clinic', 'Bangalore', 'Scar Revision', 12.969, 77.749, '+91 80 200 0503', 'seed.derm.blr.03@auraskin.local', 11, 1900, 4.7),
    ('Dr. Divya Menon', 'Jayanagar Dermatology', 'Bangalore', 'Moles & Lesions', 12.925, 77.593, '+91 80 200 0504', 'seed.derm.blr.04@auraskin.local', 13, 1350, 4.6),
    ('Dr. Arvind Nambiar', 'HSR Layout Skin Care', 'Bangalore', 'General Dermatology', 12.912, 77.647, '+91 80 200 0505', 'seed.derm.blr.05@auraskin.local', 9, 1100, 4.5)
) AS v(
  name,
  clinic_name,
  city,
  specialization,
  latitude,
  longitude,
  contact_number,
  email,
  years_experience,
  consultation_fee,
  rating
)
WHERE NOT EXISTS (
  SELECT 1
  FROM dermatologists d
  WHERE lower(trim(d.name)) = lower(trim(v.name))
    AND lower(trim(coalesce(d.city, ''))) = lower(trim(coalesce(v.city, '')))
    AND lower(trim(coalesce(d.clinic_name, ''))) = lower(trim(coalesce(v.clinic_name, '')))
);

-- =============================================================================
-- 2) LEGACY stores — public map / catalog seed (no store_profiles FK)
-- =============================================================================

INSERT INTO stores (
  name,
  address,
  city,
  latitude,
  longitude,
  contact_number,
  status,
  description,
  opening_hours
)
SELECT
  v.name,
  v.address,
  v.city,
  v.latitude::numeric,
  v.longitude::numeric,
  v.contact_number,
  'Active',
  v.description,
  v.opening_hours
FROM (
  VALUES
    -- Surat (12 areas)
    ('AuraSkin Pharmacy Adajan', 'Adajan Main Rd, near Gangeshwar Mahadev', 'Surat', 21.192, 72.792, '+91 261 310 1001', 'Partner pharmacy and skincare counter in Adajan.', 'Mon–Sat 9AM–9PM, Sun 10AM–2PM'),
    ('AuraSkin Studio Vesu', 'VIP Rd, Vesu', 'Surat', 21.208, 72.828, '+91 261 310 1002', 'AuraSkin retail studio Vesu.', 'Mon–Sun 10AM–8PM'),
    ('AuraSkin Varachha Clinic', 'Varachha Main Rd', 'Surat', 21.158, 72.885, '+91 261 310 1003', 'Clinical skincare partner Varachha.', 'Mon–Sat 9AM–8PM'),
    ('AuraSkin Katargam Store', 'Katargam Char Rasta', 'Surat', 21.218, 72.838, '+91 261 310 1004', 'Dermatologist-affiliated retail Katargam.', 'Mon–Sat 10AM–8PM'),
    ('AuraSkin Athwa Wellness', 'Athwalines, Athwa', 'Surat', 21.168, 72.798, '+91 261 310 1005', 'Wellness and skincare Athwa.', 'Mon–Sun 10AM–7PM'),
    ('AuraSkin Udhna Pharmacy', 'Udhna Magdalla Rd', 'Surat', 21.148, 72.818, '+91 261 310 1006', 'Pharmacy partner Udhna.', 'Mon–Sat 9AM–9PM'),
    ('AuraSkin Rander Branch', 'Rander Rd', 'Surat', 21.182, 72.768, '+91 261 310 1007', 'Regional partner store Rander.', 'Mon–Sat 9:30AM–8:30PM'),
    ('AuraSkin Piplod Outlet', 'Piplod area', 'Surat', 21.198, 72.758, '+91 261 310 1008', 'Skincare outlet Piplod.', 'Mon–Sun 10AM–8PM'),
    ('AuraSkin Dindoli Hub', 'Dindoli', 'Surat', 21.152, 72.912, '+91 261 310 1009', 'Community pharmacy hub Dindoli.', 'Mon–Sat 9AM–8PM'),
    ('AuraSkin Pandesar Mart', 'Pandesara GIDC vicinity', 'Surat', 21.235, 72.898, '+91 261 310 1010', 'Industrial area skincare counter.', 'Mon–Sat 8AM–8PM'),
    ('AuraSkin Pal Corner', 'Pal, Surat', 'Surat', 21.142, 72.772, '+91 261 310 1011', 'Neighbourhood partner Pal.', 'Mon–Sat 10AM–7PM'),
    ('AuraSkin Bhatar Express', 'Bhatar Rd', 'Surat', 21.224, 72.922, '+91 261 310 1012', 'Express pickup skincare Bhatar.', 'Mon–Sun 9AM–9PM'),
    -- Ahmedabad (5)
    ('AuraSkin Ahmedabad CG', 'CG Rd, Navrangpura', 'Ahmedabad', 23.032, 72.558, '+91 79 310 2001', 'Flagship skincare Ahmedabad.', 'Mon–Sun 10AM–8PM'),
    ('AuraSkin Satellite', 'Satellite', 'Ahmedabad', 23.016, 72.518, '+91 79 310 2002', 'Satellite partner store.', 'Mon–Sat 10AM–8PM'),
    ('AuraSkin Vastrapur', 'Vastrapur', 'Ahmedabad', 23.038, 72.532, '+91 79 310 2003', 'Lake-side retail partner.', 'Mon–Sun 10AM–7PM'),
    ('AuraSkin Maninagar', 'Maninagar', 'Ahmedabad', 22.998, 72.612, '+91 79 310 2004', 'East Ahmedabad pharmacy partner.', 'Mon–Sat 9AM–9PM'),
    ('AuraSkin SG Highway', 'SG Hwy, Bodakdev', 'Ahmedabad', 23.052, 72.502, '+91 79 310 2005', 'Highway-access skincare.', 'Mon–Sun 10AM–9PM'),
    -- Mumbai (5)
    ('AuraSkin Bandra West', 'Linking Rd, Bandra West', 'Mumbai', 19.058, 72.834, '+91 22 310 3001', 'Bandra flagship.', 'Mon–Sun 10AM–9PM'),
    ('AuraSkin Andheri', 'Andheri West', 'Mumbai', 19.112, 72.868, '+91 22 310 3002', 'Western suburbs partner.', 'Mon–Sat 10AM–8PM'),
    ('AuraSkin Powai', 'Hiranandani, Powai', 'Mumbai', 19.118, 72.908, '+91 22 310 3003', 'Powai clinic retail.', 'Mon–Sun 10AM–8PM'),
    ('AuraSkin Thane', 'Thane West', 'Mumbai', 19.216, 72.976, '+91 22 310 3004', 'Thane neighbourhood store.', 'Mon–Sat 9AM–9PM'),
    ('AuraSkin Colaba', 'Colaba Causeway area', 'Mumbai', 18.920, 72.830, '+91 22 310 3005', 'South Mumbai partner.', 'Mon–Sun 11AM–9PM'),
    -- Delhi (5)
    ('AuraSkin Saket', 'Saket Select Citywalk vicinity', 'Delhi', 28.526, 77.218, '+91 11 310 4001', 'South Delhi skincare.', 'Mon–Sun 10AM–8PM'),
    ('AuraSkin Connaught', 'Connaught Place', 'Delhi', 28.630, 77.216, '+91 11 310 4002', 'CP retail partner.', 'Mon–Sat 10AM–8PM'),
    ('AuraSkin Dwarka', 'Sector 10, Dwarka', 'Delhi', 28.590, 77.048, '+91 11 310 4003', 'West Delhi outlet.', 'Mon–Sun 10AM–7PM'),
    ('AuraSkin Rohini', 'Rohini Sector 9', 'Delhi', 28.748, 77.065, '+91 11 310 4004', 'North West Delhi.', 'Mon–Sat 9AM–8PM'),
    ('AuraSkin Vasant Kunj', 'Vasant Kunj', 'Delhi', 28.518, 77.155, '+91 11 310 4005', 'Premium mall-area partner.', 'Mon–Sun 10AM–8PM'),
    -- Pune (5)
    ('AuraSkin Koregaon Park', 'North Main Rd, Pune', 'Pune', 18.536, 73.894, '+91 20 310 5001', 'Koregaon Park studio.', 'Mon–Sun 10AM–8PM'),
    ('AuraSkin Baner', 'Baner Rd', 'Pune', 18.558, 73.782, '+91 20 310 5002', 'Baner IT corridor store.', 'Mon–Sat 10AM–8PM'),
    ('AuraSkin Viman Nagar', 'Viman Nagar', 'Pune', 18.568, 73.918, '+91 20 310 5003', 'Airport road partner.', 'Mon–Sun 10AM–7PM'),
    ('AuraSkin Kothrud', 'Kothrud', 'Pune', 18.505, 73.808, '+91 20 310 5004', 'Western Pune pharmacy.', 'Mon–Sat 9AM–9PM'),
    ('AuraSkin Hinjewadi', 'Hinjewadi Phase 1', 'Pune', 18.592, 73.738, '+91 20 310 5005', 'Tech park skincare counter.', 'Mon–Sat 9AM–8PM'),
    -- Bangalore (5)
    ('AuraSkin Koramangala', 'Koramangala 5th Block', 'Bangalore', 12.934, 77.622, '+91 80 310 6001', 'Koramangala flagship.', 'Mon–Sun 10AM–8PM'),
    ('AuraSkin Indiranagar', '100 Ft Rd, Indiranagar', 'Bangalore', 12.978, 77.641, '+91 80 310 6002', 'Indiranagar partner.', 'Mon–Sat 10AM–8PM'),
    ('AuraSkin Whitefield', 'Whitefield Main Rd', 'Bangalore', 12.968, 77.752, '+91 80 310 6003', 'East Bangalore outlet.', 'Mon–Sun 10AM–7PM'),
    ('AuraSkin Jayanagar', 'Jayanagar 4th Block', 'Bangalore', 12.926, 77.593, '+91 80 310 6004', 'South Bangalore store.', 'Mon–Sat 9AM–8PM'),
    ('AuraSkin HSR', 'HSR Layout Sector 2', 'Bangalore', 12.912, 77.647, '+91 80 310 6005', 'HSR neighbourhood partner.', 'Mon–Sun 10AM–8PM'),
    -- Hyderabad (5)
    ('AuraSkin Banjara Hills', 'Rd No 12, Banjara Hills', 'Hyderabad', 17.415, 78.438, '+91 40 310 7001', 'Hyderabad premium skincare.', 'Mon–Sun 10AM–8PM'),
    ('AuraSkin Hitech City', 'Madhapur', 'Hyderabad', 17.448, 78.382, '+91 40 310 7002', 'IT corridor partner.', 'Mon–Sat 10AM–8PM'),
    ('AuraSkin Jubilee Hills', 'Jubilee Hills Check Post', 'Hyderabad', 17.432, 78.408, '+91 40 310 7003', 'Jubilee Hills retail.', 'Mon–Sun 10AM–7PM'),
    ('AuraSkin Secunderabad', 'MG Rd, Secunderabad', 'Hyderabad', 17.440, 78.498, '+91 40 310 7004', 'Twin cities partner.', 'Mon–Sat 9AM–9PM'),
    ('AuraSkin Gachibowli', 'Gachibowli', 'Hyderabad', 17.440, 78.348, '+91 40 310 7005', 'Financial district counter.', 'Mon–Sat 9AM–8PM'),
    -- Kochi (5)
    ('AuraSkin Marine Drive', 'Marine Drive, Kochi', 'Kochi', 9.967, 76.242, '+91 484 310 8001', 'Waterfront skincare Kochi.', 'Mon–Sun 10AM–7PM'),
    ('AuraSkin Edappally', 'Lulu Mall vicinity, Edappally', 'Kochi', 10.025, 76.308, '+91 484 310 8002', 'North Kochi partner.', 'Mon–Sun 10AM–9PM'),
    ('AuraSkin Kakkanad', 'Kakkanad', 'Kochi', 10.012, 76.342, '+91 484 310 8003', 'Infopark area store.', 'Mon–Sat 9AM–8PM'),
    ('AuraSkin Vyttila', 'Vyttila Hub', 'Kochi', 9.967, 76.318, '+91 484 310 8004', 'Transit hub partner.', 'Mon–Sat 9AM–9PM'),
    ('AuraSkin Fort Kochi', 'Fort Kochi', 'Kochi', 9.965, 76.242, '+91 484 310 8005', 'Heritage quarter outlet.', 'Mon–Sun 10AM–6PM'),
    -- New York (3)
    ('AuraSkin Soho NYC', '120 Prince St, New York', 'New York', 40.724, -74.001, '+1 212 310 9001', 'Soho skincare studio.', 'Mon–Sun 10AM–8PM'),
    ('AuraSkin Upper East', 'Madison Ave, New York', 'New York', 40.772, -73.962, '+1 212 310 9002', 'UES dermatology retail.', 'Mon–Sat 9AM–7PM'),
    ('AuraSkin Brooklyn Heights', 'Montague St, Brooklyn', 'New York', 40.696, -73.995, '+1 718 310 9003', 'Brooklyn neighbourhood partner.', 'Mon–Sun 11AM–7PM'),
    -- Los Angeles (3)
    ('AuraSkin Santa Monica', 'Third St Promenade area', 'Los Angeles', 34.016, -118.498, '+1 310 310 9011', 'West LA skincare.', 'Mon–Sun 10AM–8PM'),
    ('AuraSkin Pasadena', 'Colorado Blvd, Pasadena', 'Los Angeles', 34.146, -118.142, '+1 626 310 9012', 'Pasadena partner store.', 'Mon–Sat 10AM–7PM'),
    ('AuraSkin WeHo', 'West Hollywood', 'Los Angeles', 34.090, -118.372, '+1 323 310 9013', 'WeHo boutique.', 'Mon–Sun 10AM–9PM'),
    -- Toronto (3)
    ('AuraSkin Yorkville', 'Yorkville Ave, Toronto', 'Toronto', 43.671, -79.392, '+1 416 310 9021', 'Toronto premium skincare.', 'Mon–Sun 10AM–7PM'),
    ('AuraSkin Queen West', 'Queen St W, Toronto', 'Toronto', 43.648, -79.420, '+1 416 310 9022', 'Queen West partner.', 'Mon–Sat 10AM–8PM'),
    ('AuraSkin North York', 'Yonge & Sheppard, Toronto', 'Toronto', 43.762, -79.412, '+1 416 310 9023', 'North York outlet.', 'Mon–Sun 10AM–6PM'),
    -- Vancouver (3)
    ('AuraSkin Gastown', 'Water St, Vancouver', 'Vancouver', 49.284, -123.108, '+1 604 310 9031', 'Gastown flagship.', 'Mon–Sun 10AM–7PM'),
    ('AuraSkin Kitsilano', 'W 4th Ave, Vancouver', 'Vancouver', 49.268, -123.168, '+1 604 310 9032', 'Kits beach area.', 'Mon–Sat 10AM–6PM'),
    ('AuraSkin Richmond', 'Aberdeen Centre area', 'Vancouver', 49.182, -123.132, '+1 604 310 9033', 'Richmond partner.', 'Mon–Sun 10AM–8PM'),
    -- Tokyo (3)
    ('AuraSkin Shibuya', 'Shibuya, Tokyo', 'Tokyo', 35.660, 139.700, '+81 3 3100 9041', 'Shibuya skincare lab.', 'Mon–Sun 11AM–9PM'),
    ('AuraSkin Ginza', 'Ginza, Tokyo', 'Tokyo', 35.672, 139.764, '+81 3 3100 9042', 'Ginza luxury counter.', 'Mon–Sat 10AM–8PM'),
    ('AuraSkin Ikebukuro', 'Ikebukuro, Tokyo', 'Tokyo', 35.729, 139.718, '+81 3 3100 9043', 'Ikebukuro partner.', 'Mon–Sun 10AM–8PM'),
    -- Osaka (3)
    ('AuraSkin Shinsaibashi', 'Shinsaibashi, Osaka', 'Osaka', 34.672, 135.502, '+81 6 3100 9051', 'Osaka shopping district.', 'Mon–Sun 10AM–8PM'),
    ('AuraSkin Umeda', 'Umeda, Osaka', 'Osaka', 34.702, 135.498, '+81 6 3100 9052', 'Umeda station area.', 'Mon–Sat 10AM–7PM'),
    ('AuraSkin Namba', 'Namba, Osaka', 'Osaka', 34.663, 135.502, '+81 6 3100 9053', 'Namba nightlife district.', 'Mon–Sun 11AM–9PM'),
    -- London (3)
    ('AuraSkin Covent Garden', 'Long Acre, London', 'London', 51.512, -0.124, '+44 20 3100 9061', 'Central London skincare.', 'Mon–Sat 9AM–7PM'),
    ('AuraSkin Shoreditch', 'Brick Lane area, London', 'London', 51.522, -0.075, '+44 20 3100 9062', 'East London partner.', 'Mon–Sun 11AM–6PM'),
    ('AuraSkin Kensington', 'High St Kensington', 'London', 51.501, -0.192, '+44 20 3100 9063', 'West London boutique.', 'Mon–Sat 10AM–6PM'),
    -- Paris (3)
    ('AuraSkin Marais', 'Le Marais, Paris', 'Paris', 48.856, 2.362, '+33 1 3100 9071', 'Paris skincare studio.', 'Tue–Sat 10AM–7PM'),
    ('AuraSkin Saint-Germain', 'Bd Saint-Germain', 'Paris', 48.853, 2.338, '+33 1 3100 9072', 'Left Bank partner.', 'Mon–Sat 10AM–6PM'),
    ('AuraSkin Batignolles', 'Batignolles, Paris', 'Paris', 48.888, 2.318, '+33 1 3100 9073', '17th arr. outlet.', 'Tue–Sun 10AM–6PM'),
    -- Berlin (3)
    ('AuraSkin Mitte', 'Mitte, Berlin', 'Berlin', 52.524, 13.410, '+49 30 3100 9081', 'Berlin flagship.', 'Mon–Sat 10AM–7PM'),
    ('AuraSkin Kreuzberg', 'Oranienstr, Berlin', 'Berlin', 52.499, 13.422, '+49 30 3100 9082', 'Kreuzberg partner.', 'Mon–Sun 11AM–8PM'),
    ('AuraSkin Charlottenburg', 'Kurfürstendamm, Berlin', 'Berlin', 52.505, 13.308, '+49 30 3100 9083', 'West Berlin retail.', 'Mon–Sat 10AM–6PM'),
    -- Sydney (3)
    ('AuraSkin Bondi', 'Campbell Pde, Bondi Beach', 'Sydney', -33.891, 151.277, '+61 2 3100 9091', 'Bondi beach skincare.', 'Mon–Sun 9AM–6PM'),
    ('AuraSkin Surry Hills', 'Crown St, Surry Hills', 'Sydney', -33.884, 151.212, '+61 2 3100 9092', 'Inner east Sydney.', 'Mon–Sat 10AM–6PM'),
    ('AuraSkin Barangaroo', 'Barangaroo, Sydney', 'Sydney', -33.858, 151.202, '+61 2 3100 9093', 'Harbour precinct partner.', 'Mon–Sun 10AM–7PM'),
    -- Melbourne (3)
    ('AuraSkin Fitzroy', 'Brunswick St, Fitzroy', 'Melbourne', -37.798, 144.978, '+61 3 3100 9101', 'Melbourne creative quarter.', 'Mon–Sun 10AM–6PM'),
    ('AuraSkin South Yarra', 'Chapel St, South Yarra', 'Melbourne', -37.838, 144.992, '+61 3 3100 9102', 'South Yarra partner.', 'Mon–Sat 9AM–7PM'),
    ('AuraSkin CBD Melbourne', 'Collins St, Melbourne', 'Melbourne', -37.818, 144.956, '+61 3 3100 9103', 'CBD flagship.', 'Mon–Fri 8AM–7PM')
) AS v(
  name,
  address,
  city,
  latitude,
  longitude,
  contact_number,
  description,
  opening_hours
)
WHERE NOT EXISTS (
  SELECT 1
  FROM stores s
  WHERE lower(trim(s.name)) = lower(trim(v.name))
    AND lower(trim(coalesce(s.city, ''))) = lower(trim(coalesce(v.city, '')))
);

-- Optional: partner-only rows still require store_profiles + inventory (see store-panel-schema.sql).
