import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
// utils.ts
export function adjustScheduleToCurrentWeek(events) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday

  return events.map((event) => {
    const weekday = event.start.getDay();

    const adjustedStart = new Date(startOfWeek);
    adjustedStart.setDate(adjustedStart.getDate() + weekday);
    adjustedStart.setHours(event.start.getHours(), event.start.getMinutes(), 0);

    const adjustedEnd = new Date(startOfWeek);
    adjustedEnd.setDate(adjustedEnd.getDate() + weekday);
    adjustedEnd.setHours(event.end.getHours(), event.end.getMinutes(), 0);

    return {
      ...event,
      start: adjustedStart,
      end: adjustedEnd,
    };
  });
}


export function formatDate(dateString) {
  const date = new Date(dateString)
  const today = new Date()
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isToday) return "Today"
  if (isYesterday) return "Yesterday"

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}


export  function capitalizeFirstLetter(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}