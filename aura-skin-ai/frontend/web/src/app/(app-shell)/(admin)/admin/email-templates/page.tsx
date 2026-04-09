"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPrimaryGrid } from "@/components/admin/AdminPrimaryGrid";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail } from "lucide-react";

const TEMPLATES = [
  { id: "welcome", label: "Welcome email", placeholder: "Hi {{name}},\n\nWelcome to AuraSkin AI. ..." },
  { id: "password_reset", label: "Password reset", placeholder: "Hi {{name}},\n\nReset your password: {{link}}" },
  { id: "order_confirmation", label: "Order confirmation", placeholder: "Order #{{orderId}} confirmed. ..." },
];

export default function AdminEmailTemplatesPage() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string>("");

  const handlePreview = (id: string) => {
    setPreview(content[id] || TEMPLATES.find((t) => t.id === id)?.placeholder || "");
  };

  const handleTestSend = () => {
    // Stub: would send test email
    alert("Test send not implemented (stub).");
  };

  return (
    <>
      <AdminHeader
        title="Email Templates"
        subtitle="Edit system emails and preview before sending."
        breadcrumb={<Breadcrumb />}
        actions={
          <Button variant="outline" size="sm" onClick={handleTestSend}>
            Test send
          </Button>
        }
      />

      <AdminPrimaryGrid>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Templates
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Use placeholders like {"{{name}}"}, {"{{link}}"} in the body.
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={TEMPLATES[0].id}>
              <TabsList className="flex flex-wrap h-auto gap-1 p-1">
                {TEMPLATES.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {TEMPLATES.map((t) => (
                <TabsContent key={t.id} value={t.id} className="mt-4 space-y-4">
                  <div>
                    <Label>{t.label}</Label>
                    <Textarea
                      className="mt-2 min-h-[200px] font-mono text-sm"
                      placeholder={t.placeholder}
                      value={content[t.id] ?? ""}
                      onChange={(e) =>
                        setContent((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePreview(t.id)}>
                      Preview
                    </Button>
                    <Button size="sm">Save</Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading text-sm">Preview</CardTitle>
            <p className="text-xs text-muted-foreground">
              Rendered preview of the selected template.
            </p>
          </CardHeader>
          <CardContent>
            <pre className="p-4 rounded-lg bg-muted/30 text-sm whitespace-pre-wrap font-sans">
              {preview || "Click Preview to see content."}
            </pre>
          </CardContent>
        </Card>
      </AdminPrimaryGrid>
    </>
  );
}
