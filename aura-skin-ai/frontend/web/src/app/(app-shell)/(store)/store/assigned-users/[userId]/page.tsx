"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getAssignedUserDetail } from "@/services/apiPartner";
import { useAuth } from "@/providers/AuthProvider";
import type { AssignedUserDetail } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingBag, FileText } from "lucide-react";

export default function StoreAssignedUserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const [user, setUser] = useState<AssignedUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getAssignedUserDetail(partnerId, userId)
      .then(setUser)
      .catch(() => setError("Failed to load user."))
      .finally(() => setLoading(false));
  }, [partnerId, userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 rounded bg-muted/60 animate-pulse" />
        <div className="h-48 rounded-xl border border-border/60 bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/store/assigned-users">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to assigned users
          </Link>
        </Button>
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground">
              {error ?? "User not found."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" size="sm" asChild>
        <Link href="/store/assigned-users">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to assigned users
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">{user.name}</h1>
        <div className="flex items-center gap-2">
          {user.lifetimeValue != null && (
            <span className="text-sm font-label text-muted-foreground">
              Lifetime value: ${user.lifetimeValue.toFixed(2)}
            </span>
          )}
          <Badge variant="secondary">{user.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Purchase history
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.purchaseHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchases yet.</p>
            ) : (
              <ul className="space-y-2">
                {user.purchaseHistory.map((p) => (
                  <li key={p.orderId} className="flex justify-between text-sm">
                    <span>
                      {p.orderId} · {p.date}
                    </span>
                    <span>${p.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {user.notes || "No notes."}
            </p>
          </CardContent>
        </Card>
      </div>

      {user.activityTimeline && user.activityTimeline.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Activity timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {user.activityTimeline.map((a) => (
                <li
                  key={a.id}
                  className="flex justify-between text-sm"
                >
                  <span className="text-muted-foreground">{a.title}</span>
                  <span className="text-muted-foreground">{a.date}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

