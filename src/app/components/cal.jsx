"use client";
import { usePathname } from "next/navigation";
import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function CalBtn() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/dashboard" || pathname === "/login") return; // don't render or init Cal on dashboard and login
    (async function () {
      const cal = await getCalApi({ namespace: "30min" });
      cal("floatingButton", {
        calLink: "kinzix-infotech-01tumh/30min",
        config: { layout: "month_view" },
        buttonText: "Book A Meet",
        buttonColor: "#0469ff",
        buttonTextColor: "#fff",
        buttonPosition: "bottom-right",
      });

      cal("ui", {
        cssVarsPerTheme: {
          light: {
            "cal-brand": "#0469ff",
            "--cal-floating-button-border": "2px solid #fff",
            "--cal-floating-button-border-radius": "12px",
            "--cal-floating-button-font-size": "14px", // smaller text
            "--cal-floating-button-padding": "8px 14px", // smaller padding
          },
          dark: {
            "cal-brand": "#0469ff",
            "--cal-floating-button-border": "2px solid #0469ff",
            "--cal-floating-button-border-radius": "12px",
            "--cal-floating-button-font-size": "14px",
            "--cal-floating-button-padding": "8px 14px",
          },
        },
      });
    })();
  }, [pathname]);

  if (pathname === "/dashboard" || pathname === "/login") return null;

  return null;
}
