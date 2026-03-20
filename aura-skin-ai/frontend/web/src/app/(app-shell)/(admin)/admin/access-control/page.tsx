"use client";

import { AdminHeader, AdminPrimaryGrid } from "@/components/admin";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Shield, ChevronRight } from "lucide-react";

const ROLES = [
  { id: "super_admin", label: "Super Admin", desc: "Full platform access, role management, and system config." },
  { id: "platform_admin", label: "Platform Admin", desc: "User, store, and product moderation; analytics and reports." },
  { id: "moderator", label: "Moderator", desc: "Content moderation, pending approvals, and audit view." },
  { id: "support_admin", label: "Support Admin", desc: "View users and audit logs; limited write access." },
];

export default function AdminAccessControlPage() {
  return (
    <>
      <AdminHeader
        title="Access Control"
        subtitle="Manage roles and permissions for admin users."
        breadcrumb={<Breadcrumb />}
      />

      <AdminPrimaryGrid>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Assign users to roles. Configure granular permissions in the Role Matrix.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {ROLES.map((role) => (
                <li key={role.id}>
                  <Link
                    href="/admin/role-matrix"
                    className="flex items-center justify-between p-4 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{role.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{role.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-sm">Role Matrix</CardTitle>
            <p className="text-xs text-muted-foreground">
              Edit role vs action permissions in the Role Matrix page.
            </p>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/role-matrix"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
            >
              Open Role Matrix <ChevronRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </AdminPrimaryGrid>
    </>
  );
}
