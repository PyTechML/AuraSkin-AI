/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/dashboard/assessment/start", destination: "/start-assessment", permanent: true },
      { source: "/dashboard/reports", destination: "/reports", permanent: true },
      { source: "/dashboard/reports/:id", destination: "/reports/:id", permanent: true },
      { source: "/dashboard/tracking", destination: "/tracking", permanent: true },
      { source: "/dashboard/dermatologists/:id", destination: "/dermatologists/:id", permanent: true },
      { source: "/partner/profile", destination: "/partner/store-profile", permanent: true },
      { source: "/partner/patients", destination: "/partner/assigned-users", permanent: true },
    ];
  },
};

module.exports = nextConfig;
