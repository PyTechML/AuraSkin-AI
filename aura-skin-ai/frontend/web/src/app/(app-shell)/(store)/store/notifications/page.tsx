"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthContext";
import {
  getPartnerNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  toggleNotificationStar,
  recycleNotification,
  restoreNotification,
  deleteNotification,
} from "@/services/apiPartner";
import type { PartnerNotification } from "@/types";
import { usePanelToast } from "@/components/panel/PanelToast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { PanelStagger, PanelStaggerItem } from "@/components/panel/PanelReveal";
import { Bell, Package, ShoppingBag, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { takeFreshList } from "@/lib/panelPolling";
import { usePanelLiveRefresh } from "@/lib/usePanelLiveRefresh";

type NotificationGroup = "orders" | "inventory" | "system";
type TabValue = "all" | "orders" | "inventory" | "system" | "recycle";

export default function StoreNotificationsPage() {
  const { session } = useAuth();
  const partnerId = session?.user?.id ?? "";
  const { addToast } = usePanelToast();
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [markAllFade, setMarkAllFade] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const load = useCallback(
    (silent = false) => {
      if (!partnerId) return;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      getPartnerNotifications(partnerId)
        .then((data) => {
          setNotifications((prev) => takeFreshList(prev, data));
          if (!silent) setError(null);
        })
        .catch(() => {
          if (!silent) setError("Failed to load notifications.");
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [partnerId]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  usePanelLiveRefresh(
    () => {
      load(true);
    },
    [load],
    { critical: true, scopes: ["notifications", "orders", "inventory"] }
  );

  const grouped = useMemo(() => {
    const byCategory: Record<NotificationGroup, PartnerNotification[]> = {
      orders: [],
      inventory: [],
      system: [],
    };
    notifications.forEach((n) => {
      if (n.category === "orders") byCategory.orders.push(n);
      else if (n.category === "inventory") byCategory.inventory.push(n);
      else byCategory.system.push(n);
    });
    return byCategory;
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const ordersUnread = grouped.orders.filter((n) => !n.read).length;
  const inventoryUnread = grouped.inventory.filter((n) => !n.read).length;

  const filterBySearch = (list: PartnerNotification[]) => {
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
    );
  };

  const filterByUnread = (list: PartnerNotification[]) => {
    if (filterUnreadOnly !== "unread") return list;
    return list.filter((n) => !n.read);
  };

  const forTab = (tab: TabValue): PartnerNotification[] => {
    let list: PartnerNotification[] =
      tab === "all"
        ? notifications
        : tab === "orders"
          ? grouped.orders
          : tab === "inventory"
            ? grouped.inventory
            : tab === "system"
              ? grouped.system
              : notifications.filter((n) => n.recycled);
    if (tab !== "recycle") {
      list = list.filter((n) => !n.recycled);
    }
    list = filterByUnread(list);
    return filterBySearch(list);
  };

  const handleMarkAll = async () => {
    if (!partnerId || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(partnerId);
      setLastAction("Marked all as read");
      setMarkAllFade(true);
      setTimeout(() => setMarkAllFade(false), 200);
      load();
      addToast("All notifications marked as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkSingle = async (id: string) => {
    await markNotificationRead(id, partnerId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setLastAction("Marked one as read");
  };

  const handleToggleStar = async (id: string) => {
    await toggleNotificationStar(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, starred: !n.starred } : n))
    );
  };

  const handleRecycle = async (id: string) => {
    await recycleNotification(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, recycled: true } : n))
    );
  };

  const handleRestore = async (id: string) => {
    await restoreNotification(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, recycled: false } : n))
    );
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const lastOrderNotification = grouped.orders[0] ?? null;
  const inventoryAlertCount = grouped.inventory.filter(
    (n) => n.message.toLowerCase().includes("low") || n.message.toLowerCase().includes("stock")
  ).length;

  if (loading && notifications.length === 0) {
    return (
      <div className="space-y-8">
        <Breadcrumb />
        <div className="space-y-2">
          <div className="h-8 w-40 rounded bg-muted/40 animate-pulse" />
          <div className="h-5 w-72 rounded bg-muted/30 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-border/60 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
        <div className="h-80 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumb />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold">Notifications</h1>
          <p className="text-muted-foreground">
            View system alerts, order updates, and inventory notifications in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0 || markingAll}
            onClick={handleMarkAll}
          >
            {markingAll ? "Marking…" : "Mark all as read"}
          </Button>
          {unreadCount > 0 && (
            <Badge variant="outline">{unreadCount} unread</Badge>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-border">
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      <PanelStagger className="grid gap-4 md:grid-cols-4">
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground flex items-center gap-2">
                <Bell className="h-4 w-4" /> Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{notifications.length}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Unread</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{unreadCount}</p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" /> Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{grouped.orders.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ordersUnread} unread
              </p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
        <PanelStaggerItem>
          <Card className="border-border partner-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" /> Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{grouped.inventory.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {inventoryUnread} unread
              </p>
            </CardContent>
          </Card>
        </PanelStaggerItem>
      </PanelStagger>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-base">Notifications</CardTitle>
            <CardDescription>Filter and search across all categories.</CardDescription>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Input
                placeholder="Search by title or message..."
                className="max-w-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={filterUnreadOnly} onValueChange={setFilterUnreadOnly}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Show" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="recycle">Recycle Bin</TabsTrigger>
              </TabsList>
              {(["all", "orders", "inventory", "system", "recycle"] as const).map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <div
                    className={cn(
                      "max-h-[360px] overflow-y-auto space-y-2 transition-opacity duration-200",
                      markAllFade && "opacity-60"
                    )}
                  >
                    {forTab(tab).length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        {tab === "all"
                          ? "No notifications."
                          : `No ${tab} notifications.`}
                      </p>
                    ) : (
                      forTab(tab).map((n) => (
                        <NotificationRow
                          key={n.id}
                          notification={n}
                          onMarkRead={handleMarkSingle}
                          onToggleStar={handleToggleStar}
                          onRecycle={handleRecycle}
                          onRestore={handleRestore}
                          onDelete={handleDelete}
                          recycleView={tab === "recycle"}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm">Activity summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastAction && (
                <p className="text-xs text-muted-foreground">
                  Last action: {lastAction}
                </p>
              )}
              {lastOrderNotification ? (
                <div className="rounded-lg border border-border/60 p-3 text-sm">
                  <p className="font-medium text-foreground">Last order notification</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {lastOrderNotification.title}
                  </p>
                  {lastOrderNotification.link && (
                    <Link
                      href={lastOrderNotification.link}
                      className="text-xs text-accent hover:underline mt-1 inline-block"
                    >
                      View order
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No order notifications yet.
                </p>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Inventory alerts
                </p>
                <p className="text-sm">
                  {inventoryAlertCount} low stock / review
                  {inventoryAlertCount !== 1 ? "s" : ""} in this list.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/store/orders">Go to Orders</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/store/inventory">Go to Inventory</Link>
                </Button>
                <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Notification settings (coming soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {notifications.length === 0 && !loading && (
        <Card className="border-border">
          <CardContent className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              There are currently no notifications for your store. New alerts for orders,
              inventory, and payouts will appear here automatically.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
  onToggleStar,
  onRecycle,
  onRestore,
  onDelete,
  recycleView,
}: {
  notification: PartnerNotification;
  onMarkRead: (id: string) => void;
  onToggleStar: (id: string) => void;
  onRecycle: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  recycleView: boolean;
}) {
  return (
    <li className="rounded-lg border border-border/60 px-3 py-2 text-sm flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{notification.title}</span>
        {!notification.read && (
          <Badge variant="outline" className="text-xs">
            New
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{notification.message}</p>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="text-[11px] text-muted-foreground">
          {new Date(notification.createdAt).toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleStar(notification.id)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {notification.starred ? "Unstar" : "Star"}
          </button>
          {notification.link && (
            <Link
              href={notification.link}
              className="text-xs text-accent hover:underline"
            >
              View
            </Link>
          )}
          {!notification.read && (
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Mark read
            </button>
          )}
          {recycleView ? (
            <>
              <button
                type="button"
                onClick={() => onRestore(notification.id)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={() => onDelete(notification.id)}
                className="text-xs text-destructive hover:opacity-80 transition-colors"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onRecycle(notification.id)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Recycle
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
