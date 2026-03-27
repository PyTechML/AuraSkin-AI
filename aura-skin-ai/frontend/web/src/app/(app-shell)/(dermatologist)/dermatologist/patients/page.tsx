"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import {
  createDermatologistPatient,
  deleteDermatologistPatient,
  getDermatologistPatients,
  updateDermatologistPatient,
} from "@/services/apiPartner";
import type { NormalizedPatient } from "@/types/patient";
import {
  Card,
  CardContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, UserCircle } from "lucide-react";
import { TableRowSkeleton } from "@/components/ui/skeleton-primitives";
import { PanelPageHeader } from "@/components/layouts/PanelPageHeader";
import { PanelSectionReveal } from "@/components/panel/PanelReveal";
import { usePanelToast } from "@/components/panel/PanelToast";

export default function DermatologistPatientsPage() {
  const { session } = useAuth();
  const { addToast } = usePanelToast();
  const partnerId = session?.user?.id ?? "";
  const [patients, setPatients] = useState<NormalizedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!partnerId) {
      setPatients([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDermatologistPatients()
      .then((data) => {
        if (cancelled) return;
        setPatients(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load patients.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  const reloadPatients = () => {
    setLoading(true);
    setError(null);
    return getDermatologistPatients()
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load patients."))
      .finally(() => setLoading(false));
  };

  const handleAddPatient = async () => {
    const name = window.prompt("Patient name");
    if (!name || !name.trim()) return;
    const ageRaw = window.prompt("Patient age (optional)");
    const notes = window.prompt("Clinical notes (optional)") ?? "";
    const ageNum =
      ageRaw && ageRaw.trim() !== "" && Number.isFinite(Number(ageRaw))
        ? Number(ageRaw)
        : undefined;
    const created = await createDermatologistPatient({
      name: name.trim(),
      age: ageNum,
      notes: notes.trim() || undefined,
    });
    if (!created) {
      addToast("Failed to add patient.", "error");
      return;
    }
    addToast("Patient added.");
    await reloadPatients();
  };

  const handleEditPatient = async (patient: NormalizedPatient) => {
    const name = window.prompt("Patient name", patient.name);
    if (!name || !name.trim()) return;
    const updated = await updateDermatologistPatient(patient.id, { name: name.trim() });
    if (!updated) {
      addToast("Failed to update patient.", "error");
      return;
    }
    addToast("Patient updated.");
    await reloadPatients();
  };

  const handleDeletePatient = async (patient: NormalizedPatient) => {
    if (!window.confirm(`Delete patient "${patient.name}"?`)) return;
    const ok = await deleteDermatologistPatient(patient.id);
    if (!ok) {
      addToast("Failed to delete patient.", "error");
      return;
    }
    addToast("Patient deleted.");
    await reloadPatients();
  };

  const filtered = useMemo(() => {
    const safePatients = Array.isArray(patients) ? patients : [];
    let list = safePatients;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name ?? "Unknown").toLowerCase().includes(q) ||
          (p.email?.toLowerCase().includes(q) ?? false)
      );
    }
    if (statusFilter === "active") list = list.filter((p) => p.status === "active");
    if (statusFilter === "inactive")
      list = list.filter((p) => p.status !== "active");
    return list.slice().sort((a, b) => {
      const dateA = new Date(a.lastConsultationDate ?? "").getTime();
      const dateB = new Date(b.lastConsultationDate ?? "").getTime();
      return (Number(dateB) || 0) - (Number(dateA) || 0);
    });
  }, [patients, search, statusFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Patients"
          subtitle="Manage patients assigned to your clinical practice."
        />
        <div className="h-10 max-w-md rounded bg-muted/40 animate-pulse" aria-hidden />
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="h-12 bg-muted/40 animate-pulse" aria-hidden />
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PanelPageHeader
          title="Patients"
          subtitle="Manage patients assigned to your clinical practice."
        />
        <Card className="border-border max-w-md">
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true);
                setError(null);
                getDermatologistPatients()
                  .then((data) => setPatients(Array.isArray(data) ? data : []))
                  .catch(() => setError("Failed to load patients."))
                  .finally(() => setLoading(false));
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Patients"
        subtitle="Manage patients assigned to your clinical practice."
      />

      <p className="text-sm text-muted-foreground">
        Search and filter patients assigned to your practice.
      </p>
      <PanelSectionReveal>
      <Card className="border-border">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-4">
            <Input
              placeholder="Search by name or email..."
              className="max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            </div>
            <Button size="sm" onClick={handleAddPatient}>
              Add patient
            </Button>
          </div>
        </CardContent>
      </Card>
      </PanelSectionReveal>

      <PanelSectionReveal>
      {filtered.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
            <p className="font-medium text-muted-foreground mb-1">
              {patients.length === 0
                ? "No patients yet"
                : "No patients match your filters."}
            </p>
            <p className="text-sm text-muted-foreground">
              {patients.length === 0
                ? "Once patients are matched to your practice, they will appear here."
                : "Try adjusting your search or filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <p className="text-xs text-muted-foreground mb-3 px-1">
            Click a patient to view assessment history and treatment notes.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last consultation</TableHead>
                <TableHead>Skin condition summary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="panel-table-row">
                  <TableCell className="font-medium">{p.name || "Unknown"}</TableCell>
                  <TableCell>{p.email ?? "—"}</TableCell>
                  <TableCell>{p.lastConsultationDate ?? "—"}</TableCell>
                  <TableCell className="max-w-xs">
                    <span className="text-sm text-muted-foreground line-clamp-2">
                      {p.lastConsultationDate
                        ? `Last consultation on ${p.lastConsultationDate}. Total consultations: ${Number(p.totalConsultations) || 0}.`
                        : "No consultation summary available yet."}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {p.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dermatologist/patients/${p.id}`}>
                          <UserCircle className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void handleEditPatient(p)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void handleDeletePatient(p)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      </PanelSectionReveal>
    </div>
  );
}

