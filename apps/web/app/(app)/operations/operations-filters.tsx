"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OperationsFilters({
  month,
  q,
  categoryId,
  categories,
}: {
  month: string;
  q: string;
  categoryId: string;
  categories: { id: string; label: string }[];
}) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(next: { q?: string; category?: string }) {
    const params = new URLSearchParams({ month });
    const nextQ = next.q ?? q;
    const nextCategory = next.category ?? categoryId;
    if (nextQ) params.set("q", nextQ);
    if (nextCategory) params.set("category", nextCategory);
    router.replace(`/operations?${params.toString()}`);
  }

  function onSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: value }), 300);
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <Input
        type="search"
        placeholder="Rechercher un lieu, une description…"
        defaultValue={q}
        onChange={(event) => onSearchChange(event.target.value)}
        className="max-w-xs"
      />
      <Select
        value={categoryId || "all"}
        onValueChange={(value) => navigate({ category: value === "all" ? "" : String(value) })}
      >
        <SelectTrigger className="w-auto min-w-[180px]">
          <SelectValue placeholder="Toutes les catégories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les catégories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
