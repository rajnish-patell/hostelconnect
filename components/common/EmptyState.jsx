import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "No data found",
  description = "Get started by adding your first record.",
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50">
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="rounded-xl shadow-md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
