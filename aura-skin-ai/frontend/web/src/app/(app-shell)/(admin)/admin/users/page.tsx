"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminHeader,
  AdminPrimaryGrid,
  AdminDrawer,
} from "@/components/admin";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { PanelTablePagination } from "@/components/panel/PanelTablePagination";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import { useClientTableSorting } from "@/hooks/useClientTableSorting";
import { useAdminPermission } from "@/hooks/useAdminPermission";
import { Users, Search, UserPlus, Download } from "lucide-react";
import type { UserRole } from "@/types";
import {
  getAdminUsers,
  blockUser as apiBlockUser,
  unblockUser as apiUnblockUser,
  deleteUser as apiDeleteUser,
  resetUserPassword as apiResetUserPassword,
  updateUserRole as apiUpdateUserRole,
  type AdminUser,
} from "@/services/apiAdmin";

const PAGE_SIZE = 10;

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "suspended";
  created: string;
  lastActivity: string;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editingRoleFor, setEditingRoleFor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("USER");

  const canCreate = useAdminPermission("users.create");
  const canSuspend = useAdminPermission("users.suspend");
  const canAssignRole = useAdminPermission("users.assign_role");
  const canExport = useAdminPermission("users.export");
  const canEdit = useAdminPermission("users.edit");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getAdminUsers()
      .then((users) => {
        if (!alive) return;
        const mapped: AdminUserRow[] = users.map((u: AdminUser) => ({
          id: u.id,
          name: u.full_name ?? u.email ?? "Unknown",
          email: u.email ?? "—",
          role: (u.role?.toUpperCase() as UserRole) ?? "USER",
          status: u.blocked ? "suspended" : "active",
          created: u.created_at ?? "",
          lastActivity: "",
        }));
        setRows(mapped);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (statusFilter !== "all") list = list.filter((u) => u.status === statusFilter);
    return list;
  }, [rows, search, roleFilter, statusFilter]);

  const { sortedData, sortKey, direction, toggleSort } = useClientTableSorting({
    data: filtered,
    initialSortKey: null,
    initialDirection: null,
    stringKeys: ["name", "email", "role", "status", "created", "lastActivity"],
  });

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedData.slice(start, start + PAGE_SIZE);
  }, [sortedData, page]);

  const selectedUser = useMemo(
    () => (drawerUserId ? rows.find((u) => u.id === drawerUserId) : null),
    [drawerUserId, rows]
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((u) => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCsv = () => {
    const headers = ["Name", "Email", "Role", "Status", "Created", "Last activity"];
    const rows = sortedData.map((u) =>
      [u.name, u.email, u.role, u.status, u.created, u.lastActivity].map((c) =>
        typeof c === "string" && (c.includes(",") || c.includes('"') || c.includes("\n"))
          ? `"${c.replace(/"/g, '""')}"`
          : c
      ).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const refreshUsers = () => {
    getAdminUsers().then((users) => {
      const mapped: AdminUserRow[] = users.map((u: AdminUser) => ({
        id: u.id,
        name: u.full_name ?? u.email ?? "Unknown",
        email: u.email ?? "—",
        role: (u.role?.toUpperCase() as UserRole) ?? "USER",
        status: u.blocked ? "suspended" : "active",
        created: u.created_at ?? "",
        lastActivity: "",
      }));
      setRows(mapped);
    });
  };

  const handleBulkSuspend = async () => {
    if (selectedIds.size === 0) return;
    setActionError(null);
    try {
      for (const id of Array.from(selectedIds)) {
        await apiBlockUser(id);
      }
      setSelectedIds(new Set());
      refreshUsers();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to suspend");
    }
  };

  const handleBulkRoleAssign = () => {
    if (selectedIds.size === 0) return;
    setSelectedIds(new Set());
  };

  const isMasterAdmin = (email: string) =>
    (email ?? "").trim().toLowerCase() === "admin@auraskin.ai";

  const handleDrawerBlock = async (id: string) => {
    setActionError(null);
    try {
      await apiBlockUser(id);
      refreshUsers();
      setDrawerUserId(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to suspend");
    }
  };

  const handleDrawerUnblock = async (id: string) => {
    setActionError(null);
    try {
      await apiUnblockUser(id);
      refreshUsers();
      setDrawerUserId(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to unlock");
    }
  };

  const handleDrawerDelete = async (id: string) => {
    if (!confirm("Permanently delete this user? This cannot be undone.")) return;
    setActionError(null);
    try {
      await apiDeleteUser(id);
      refreshUsers();
      setDrawerUserId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleDrawerResetPassword = async (id: string) => {
    const pwd = newPassword.trim();
    if (pwd.length < 8) {
      setActionError("Password must be at least 8 characters");
      return;
    }
    setActionError(null);
    try {
      await apiResetUserPassword(id, pwd);
      setNewPassword("");
      setResettingPasswordFor(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to reset password");
    }
  };

  const handleSaveRole = async (id: string) => {
    const role = selectedRole?.toLowerCase();
    if (!role) return;
    setActionError(null);
    try {
      await apiUpdateUserRole(id, role);
      setEditingRoleFor(null);
      refreshUsers();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update role");
    }
  };

  return (
    <>
      <AdminHeader
        title="Users"
        subtitle="Manage platform users, roles, and access control."
        breadcrumb={<Breadcrumb />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!canExport || filtered.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              size="sm"
              className="shadow-md hover:shadow-lg transition-shadow"
              disabled={!canCreate}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        }
      />

      <AdminPrimaryGrid>
        <div className="flex flex-wrap gap-4 mb-4">
          <Card className="border-border/60 px-4 py-2">
            <p className="text-xs text-muted-foreground uppercase">Total users</p>
            <p className="text-2xl font-semibold">{rows.length}</p>
          </Card>
          <Card className="border-border/60 px-4 py-2">
            <p className="text-xs text-muted-foreground uppercase">Active</p>
            <p className="text-2xl font-semibold">{rows.filter((r) => r.status === "active").length}</p>
          </Card>
          <Card className="border-border/60 px-4 py-2">
            <p className="text-xs text-muted-foreground uppercase">Suspended</p>
            <p className="text-2xl font-semibold">{rows.filter((r) => r.status === "suspended").length}</p>
          </Card>
        </div>
        <Card className="border-border/60">
          <div className="p-4 border-b border-border/60 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="STORE">Store</SelectItem>
                <SelectItem value="DERMATOLOGIST">Dermatologist</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionError && !drawerUserId && (
            <div className="px-4 py-2 border-b border-border/60 text-sm text-destructive bg-destructive/10">
              {actionError}
            </div>
          )}
          {selectedIds.size > 0 && (
            <div className="px-4 py-2 border-b border-border/60 flex items-center gap-2 bg-muted/30">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkSuspend}
                disabled={!canSuspend}
              >
                Bulk suspend
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRoleAssign}
                disabled={!canAssignRole}
              >
                Bulk role assignment
              </Button>
            </div>
          )}

          {loading && rows.length === 0 ? (
            <div className="p-6 space-y-4">
              <div className="h-6 w-48 rounded bg-muted/40 animate-pulse" />
              <div className="h-4 w-64 rounded bg-muted/30 animate-pulse" />
              <div className="h-10 w-full rounded bg-muted/30 animate-pulse" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 w-full rounded bg-muted/30 animate-pulse" />
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <PanelEmptyState
              icon={<Users className="h-12 w-12" />}
              title="No users match your filters"
              description="Try adjusting search or filters, or add a new user."
              action={
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={paginated.length > 0 && selectedIds.size === paginated.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="font-label hover:text-foreground"
                        onClick={() => toggleSort("name")}
                      >
                        Name
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="font-label hover:text-foreground"
                        onClick={() => toggleSort("email")}
                      >
                        Email
                      </button>
                    </TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="font-label hover:text-foreground"
                        onClick={() => toggleSort("created")}
                      >
                        Created
                      </button>
                    </TableHead>
                    <TableHead>Last activity</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setDrawerUserId(user.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(user.id)}
                          onCheckedChange={() => toggleSelect(user.id)}
                          aria-label={`Select ${user.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "warning"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.created}</TableCell>
                      <TableCell className="text-muted-foreground">{user.lastActivity}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDrawerUserId(user.id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PanelTablePagination
                page={page}
                setPage={setPage}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
        </Card>
      </AdminPrimaryGrid>

      <AdminDrawer
        open={!!drawerUserId}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerUserId(null);
            setResettingPasswordFor(null);
            setNewPassword("");
            setEditingRoleFor(null);
            setActionError(null);
          }
        }}
        title="User details"
      >
        {selectedUser ? (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Basic info</p>
              <p className="font-medium mt-1">{selectedUser.name}</p>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{selectedUser.role}</Badge>
                <Badge variant={selectedUser.status === "active" ? "default" : "warning"}>
                  {selectedUser.status}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Change role</p>
              {editingRoleFor === selectedUser.id ? (
                <div className="flex gap-2 mt-2 items-center">
                  <Select
                    value={selectedRole}
                    onValueChange={setSelectedRole}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="STORE">Store</SelectItem>
                      <SelectItem value="DERMATOLOGIST">Dermatologist</SelectItem>
                      {isMasterAdmin(selectedUser.email) && (
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => handleSaveRole(selectedUser.id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingRoleFor(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{selectedUser.role}</Badge>
                  {canAssignRole && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingRoleFor(selectedUser.id);
                        setSelectedRole(selectedUser.role);
                      }}
                    >
                      Change role
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned panel</p>
              <p className="text-sm mt-1 text-muted-foreground">
                {selectedUser.role === "STORE" || selectedUser.role === "DERMATOLOGIST"
                  ? "Partner panel"
                  : selectedUser.role === "ADMIN"
                    ? "Admin panel"
                    : "User app"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Activity log</p>
              <p className="text-sm mt-1 text-muted-foreground">Last activity: {selectedUser.lastActivity}. Created: {selectedUser.created}.</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role permissions</p>
              <p className="text-sm mt-1 text-muted-foreground">
                {selectedUser.role}: full access to {selectedUser.role === "ADMIN" ? "admin" : selectedUser.role === "USER" ? "user" : "partner"} scope.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Security logs</p>
              <p className="text-sm mt-1 text-muted-foreground">Login history and device list available in audit. No recent alerts.</p>
            </div>
            {actionError && (
              <p className="text-sm text-destructive">{actionError}</p>
            )}
            <div className="flex flex-col gap-2">
              {selectedUser.status === "active" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!canSuspend || isMasterAdmin(selectedUser.email)}
                  onClick={() => handleDrawerBlock(selectedUser.id)}
                >
                  Suspend user
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!canSuspend}
                  onClick={() => handleDrawerUnblock(selectedUser.id)}
                >
                  Unlock account
                </Button>
              )}
              {resettingPasswordFor === selectedUser.id ? (
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="New password (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleDrawerResetPassword(selectedUser.id)}
                      disabled={newPassword.trim().length < 8}
                    >
                      Set password
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setResettingPasswordFor(null);
                        setNewPassword("");
                        setActionError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isMasterAdmin(selectedUser.email)}
                  onClick={() => setResettingPasswordFor(selectedUser.id)}
                  title={isMasterAdmin(selectedUser.email) ? "Master admin password cannot be reset here" : undefined}
                >
                  Reset password
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                disabled={isMasterAdmin(selectedUser.email)}
                onClick={() => handleDrawerDelete(selectedUser.id)}
                title={isMasterAdmin(selectedUser.email) ? "Master admin cannot be deleted" : undefined}
              >
                Delete user
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </AdminDrawer>
    </>
  );
}
