import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountInPaise = 0, currency = "INR") {
  const num = Math.floor(amountInPaise / 100);
  return `₹${num.toLocaleString("en-IN")}`;
}

export function formatDuration(seconds = 0) {
  if (!seconds || seconds <= 0) return "0m 0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function formatTimeSafe(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    const h12 = d.getHours() % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  } catch {
    return "—";
  }
}

export function formatDateSafe(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "—";
  }
}

export function formatTime(timeString) {
  if (!timeString) return "";
  try {
    const [hours, minutes] = timeString.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedH = h % 12 || 12;
    return `${formattedH}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
}
