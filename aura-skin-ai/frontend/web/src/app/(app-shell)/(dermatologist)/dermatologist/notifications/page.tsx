"use client";

import { useEffect, useMemo, useState } from "react";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDermatologistNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/apiPartner";
import type { DermatologistNotification } from "@/types/notification";

const FALLBACK_MESSAGE = "New update available";
const formatSafeDate = (value: string | null | undefined) => {
  const timestamp = new Date(value ?? "").getTime();
  if (!Number.isFinite(timestamp)) return "-";
  return new Date(timestamp).toLocaleString();
};

export default function DermatologistNotificationsPage() {
  const [notifications, setNotifications] = useState<DermatologistNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    setError(null);
    try {
      const data = await getDermatologistNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const sortedNotifications = useMemo(
    () =>
      safeNotifications
        .slice()
        .sort(
          (a, b) =>
            (Number(new Date(b.createdAt).getTime()) || 0) -
            (Number(new Date(a.createdAt).getTime()) || 0)
        ),
    [safeNotifications]
  );

  const unreadCount = useMemo(
    () => sortedNotifications.filter((item) => !item.isRead).length,
    [sortedNotifications]
  );

  const markOneAsRead = async (id: string) => {
    const previous = safeNotifications;
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    try {
      await markNotificationRead(id);
    } catch {
      setNotifications(previous);
      setError("Failed to update read status.");
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    const previous = safeNotifications;
    setMarkingAll(true);
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      setNotifications(previous);
      setError("Failed to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumb />

      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold">Notifications</h1>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && <Badge variant="outline">{unreadCount} unread</Badge>}
          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0 || markingAll}
            onClick={markAllAsRead}
          >
            {markingAll ? "Marking..." : "Mark all as read"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-border">
          <CardContent className="py-3 text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-base">Recent updates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-12 rounded border border-border/60 bg-muted/30 animate-pulse" />
              <div className="h-12 rounded border border-border/60 bg-muted/30 animate-pulse" />
              <div className="h-12 rounded border border-border/60 bg-muted/30 animate-pulse" />
            </div>
          ) : sortedNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications</p>
          ) : (
            <ul className="space-y-2">
              {sortedNotifications.map((notification) => {
                const safeMessage = (notification.message ?? "").trim() || FALLBACK_MESSAGE;
                const safeId = (notification.id ?? "").trim();
                const safeType = (notification.type ?? "").trim() || "system";
                return (
                  <li
                    key={safeId || `${safeType}-${notification.createdAt ?? ""}`}
                    className="rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{safeType}</span>
                        {!notification.isRead && (
                          <Badge variant="outline" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {formatSafeDate(notification.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{safeMessage}</p>
                    {!notification.isRead && safeId && (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            void markOneAsRead(safeId);
                          }}
                        >
                          Mark read
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
