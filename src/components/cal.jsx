'use client';

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function CalEmbed() {
    useEffect(() => {
        (async function () {
            const cal = await getCalApi({ "namespace": "edubreezy-meet" });
            cal("ui", {
                "theme": "light",
                "cssVarsPerTheme": {
                    "light": { "cal-brand": "#0569ff" },
                    "dark": { "cal-brand": "#ffffff" }
                },
                "hideEventTypeDetails": false,
                "layout": "month_view"
            });
        })();
    }, []);

    return (
        <Cal
            namespace="edubreezy-meet"
            calLink="kinzix-infotech-01tumh/edubreezy-meet"
            style={{ width: "100%", height: "100%", overflow: "scroll" }}
            config={{ "layout": "month_view", "theme": "light" }}
        />
    );
}