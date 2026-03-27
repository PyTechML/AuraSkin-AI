"use client";

type Listener = () => void;

const reportLabelMap = new Map<string, string>();
const listeners = new Set<Listener>();
let version = 0;

function notify(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function setReportBreadcrumbLabel(reportId: string, label: string): void {
  const id = reportId.trim();
  const normalizedLabel = label.trim();
  if (!id || !normalizedLabel) return;
  reportLabelMap.set(id, normalizedLabel);
  notify();
}

export function getReportBreadcrumbLabel(reportId: string): string | undefined {
  const id = reportId.trim();
  if (!id) return undefined;
  return reportLabelMap.get(id);
}

export function subscribeReportBreadcrumbLabels(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getReportBreadcrumbLabelVersion(): number {
  return version;
}
