import React from "react";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/lib/constants/brand";

export default function StatusBadge({ status }) {
  const meta = BRAND.callStatus[status] || { label: status, variant: "secondary" };

  return (
    <Badge variant={meta.variant}>
      {meta.label}
    </Badge>
  );
}
