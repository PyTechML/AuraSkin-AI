"use client";

import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPrimaryGrid } from "@/components/admin/AdminPrimaryGrid";
import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PanelTablePagination } from "@/components/panel/PanelTablePagination";
import { PanelEmptyState } from "@/components/panel/PanelEmptyState";
import { Download, FileText } from "lucide-react";
import { getAdminReports, type AdminReportRow } from "@/services/apiAdmin";

const PAGE_SIZE = 10;

interface ReportRow {
  id: string;
  type: string;
  period: string;
  status: string;
  userName: string;
  skinType: string;
  confidence: string;
  lifestyle: string;
  assessmentAt: string;
  createdAt: string;
}

function downloadTextFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function mapApiToReportRow(r: AdminReportRow): ReportRow {
  const created = (r.created_at ?? "").slice(0, 19).replace("T", " ");
  const assessmentRaw = typeof r.assessment_timestamp === "string" ? r.assessment_timestamp : "";
  const assessmentAt = assessmentRaw ? assessmentRaw.slice(0, 19).replace("T", " ") : "—";
  const lifestyle = typeof r.lifestyle_factors === "string" ? r.lifestyle_factors : "—";
  const confidenceRaw = typeof r.confidence_score === "number" ? r.confidence_score : Number(r.confidence_score);
  return {
    id: r.id,
    type: "Skin report",
    period: (r.created_at ?? "").slice(0, 7),
    status: "Ready",
    userName:
      typeof r.user_full_name === "string" && r.user_full_name.trim().length > 0
        ? r.user_full_name
        : "Unknown user",
    skinType: typeof r.skin_type === "string" && r.skin_type.trim().length > 0 ? r.skin_type : "—",
    confidence: Number.isFinite(confidenceRaw) ? `${Math.round(confidenceRaw)}%` : "—",
    lifestyle,
    assessmentAt,
    createdAt: created || "—",
  };
}

export default function AdminReportsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminReports()
      .then((data) => setReports(data.map(mapApiToReportRow)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = typeFilter === "all" ? reports : reports.filter((r) => r.type === typeFilter);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const exportJson = () => {
    downloadTextFile(
      `admin-reports-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json",
      JSON.stringify(filtered, null, 2)
    );
  };
  const exportCsv = () => {
    const header = ["id", "type", "period", "status", "userName", "skinType", "confidence", "lifestyle", "assessmentAt", "createdAt"];
    const escapeCsv = (value: string) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = filtered.map((r) =>
      [r.id, r.type, r.period, r.status, r.userName, r.skinType, r.confidence, r.lifestyle, r.assessmentAt, r.createdAt].map(escapeCsv).join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    downloadTextFile(
      `admin-reports-${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv;charset=utf-8",
      csv
    );
  };

  return (
    <>
      <AdminHeader
        title="Reports"
        subtitle="Generated reports and exports."
        breadcrumb={<Breadcrumb />}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={exportJson}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        }
      />

      <AdminPrimaryGrid>
        <Card className="border-border/60">
          <div className="p-4 border-b border-border/60">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="Skin report">Skin report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading reports…</div>
          ) : filtered.length === 0 ? (
            <PanelEmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No reports"
              description="Generated reports will appear here."
            />
          ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Skin type</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Lifestyle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.userName}</TableCell>
                  <TableCell className="font-medium">{r.type}</TableCell>
                  <TableCell className="text-muted-foreground">{r.assessmentAt}</TableCell>
                  <TableCell className="text-muted-foreground">{r.skinType}</TableCell>
                  <TableCell className="text-muted-foreground">{r.confidence}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[24rem] truncate">{r.lifestyle}</TableCell>
                  <TableCell className="text-muted-foreground">{r.status}</TableCell>
                  <TableCell className="text-muted-foreground">{r.createdAt}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        downloadTextFile(
                          `report-${r.id}.json`,
                          "application/json",
                          JSON.stringify(r, null, 2)
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
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
    </>
  );
}
