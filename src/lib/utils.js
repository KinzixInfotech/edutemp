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
// Convert number to words in Indian numbering system (Rupees & Paise)
export function numberToWordsIndian(num) {
  if (num === 0) return "Zero Rupees Only"

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ]
  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ]

  function inWords(n) {
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "")
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + inWords(n % 100) : "")
      )
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + inWords(n % 1000) : "")
      )
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + inWords(n % 100000) : "")
      )
    return (
      inWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + inWords(n % 10000000) : "")
    )
  }

  const [rupees, paise] = num.toFixed(2).split(".")

  let words = ""
  if (parseInt(rupees, 10) > 0) {
    words += inWords(parseInt(rupees, 10)) + " Rupees"
  }
  if (parseInt(paise, 10) > 0) {
    words += " and " + inWords(parseInt(paise, 10)) + " Paise"
  }

  return words + " Only"
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


export function capitalizeFirstLetter(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}