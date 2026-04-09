"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPrimaryGrid } from "@/components/admin/AdminPrimaryGrid";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Store, Stethoscope, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";

const STAGGER_DELAY = 0.06;
const SECTION_DURATION = 0.25;

const SECTIONS = [
  {
    id: "overview",
    title: "Platform Overview",
    content:
      "This page provides platform documentation for administrators and partners. AuraSkin AI is a clinical-grade AI skincare ecosystem: user app for assessments and recommendations, store and dermatologist panels for commerce and consultations, and admin panel for governance, moderation, and rule configuration.",
  },
  {
    id: "diagram",
    title: "System Architecture Diagram",
    diagram: true,
  },
  {
    id: "security",
    title: "Security & Compliance",
    items: [
      "Data encryption at rest and in transit",
      "Role-based access control (RBAC) across all panels",
      "Audit logging for admin and sensitive actions",
      "HIPAA-ready structure for health-related data handling",
    ],
  },
  {
    id: "ecosystem",
    title: "Multi-Panel Ecosystem",
    panels: [
      { name: "User Panel", desc: "Skin assessment, reports, product discovery, and store/dermatologist access.", icon: Users },
      { name: "Store Panel", desc: "Inventory, orders, assigned users, payouts, and analytics.", icon: Store },
      { name: "Dermatologist Panel", desc: "Consultations, bookings, patient context, and verification.", icon: Stethoscope },
      { name: "Admin Panel", desc: "Governance, user/store/dermatologist moderation, rule engine, and system health.", icon: LayoutDashboard },
    ],
  },
  {
    id: "ai",
    title: "AI Recommendation Engine",
    content:
      "Assessment logic captures skin type, concerns, and preferences. Rule matching applies configurable conditions (skin type, category, contraindications, severity). The personalization engine ranks and surfaces products and content based on user profile and platform rules.",
  },
  {
    id: "roadmap",
    title: "Roadmap",
    items: [
      "Granular admin roles (Super Admin, Moderator, Support Admin)",
      "Advanced rule builder with visual logic blocks",
      "HIPAA compliance certification path",
      "Cross-panel analytics and reporting",
    ],
  },
];

export default function AdminPlatformPage() {
  return (
    <>
      <AdminHeader
        title="About / Platform"
        subtitle="Clinical-grade AI skincare ecosystem for dermatologists and commerce partners."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid className="gap-y-7">
        {SECTIONS.map((section, i) => (
          <motion.section
            key={section.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: SECTION_DURATION,
              delay: i * STAGGER_DELAY,
              ease: "easeOut",
            }}
            className="rounded-lg border border-border/60 bg-card/80 p-6"
          >
            <h2 className="font-heading text-lg font-semibold mb-4">{section.title}</h2>
            {"content" in section && section.content && (
              <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            )}
            {"diagram" in section && section.diagram && (
              <div className="mt-4 aspect-video max-w-2xl rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
                System Architecture Diagram
              </div>
            )}
            {"items" in section && section.items && (
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2 mt-2">
                {section.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
            {"panels" in section && section.panels && (
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                {section.panels.map((panel) => {
                  const Icon = panel.icon;
                  return (
                    <Card key={panel.name} className="border-border/60">
                      <CardHeader className="pb-2">
                        <CardTitle className="font-heading text-sm flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {panel.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{panel.desc}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.section>
        ))}
      </AdminPrimaryGrid>
    </>
  );
}
