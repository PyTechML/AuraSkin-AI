"use client";

import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface UseClientTableSortingOptions<T> {
  data: T[];
  initialSortKey?: keyof T | null;
  initialDirection?: SortDirection;
  stringKeys?: (keyof T)[];
}

export function useClientTableSorting<T extends object>({
  data,
  initialSortKey = null,
  initialDirection = "asc",
  stringKeys = [],
}: UseClientTableSortingOptions<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(initialSortKey);
  const [direction, setDirection] = useState<SortDirection>(initialDirection);

  const sortedData = useMemo(() => {
    if (!sortKey || !direction) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const isString = stringKeys.includes(sortKey);
      if (isString) {
        const aStr = String(aVal ?? "").toLowerCase();
        const bStr = String(bVal ?? "").toLowerCase();
        const cmp = aStr.localeCompare(bStr);
        return direction === "asc" ? cmp : -cmp;
      }
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (Number.isNaN(aNum) && Number.isNaN(bNum)) return 0;
      if (Number.isNaN(aNum)) return direction === "asc" ? 1 : -1;
      if (Number.isNaN(bNum)) return direction === "asc" ? -1 : 1;
      return direction === "asc" ? aNum - bNum : bNum - aNum;
    });
  }, [data, sortKey, direction, stringKeys]);

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  };

  return { sortedData, sortKey, direction, toggleSort };
}
