"use client";

import { useEffect, useState } from "react";
import { apiLoader } from "@/lib/api-loader";
import { cn } from "@/lib/utils";

export function ApiProgressBar() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return apiLoader.subscribe((loading) => {
      setIsLoading(loading);
    });
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none">
      <div className="h-1 bg-black dark:bg-white! animate-expand-center w-0 rounded-full shadow-[0_0_10px_q]" />
      <style jsx global>{`
        @keyframes expand-center {
          0% {
            width: 0;
            opacity: 1;
          }
          50% {
            width: 50%;
            opacity: 1;
          }
          90% {
            width: 90%;
            opacity: 1;
          }
          100% {
            width: 100%;
            opacity: 0;
          }
        }
        .animate-expand-center {
          animation: expand-center 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
