'use client';

import { useAuth } from '@/context/AuthContext';
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEffect } from 'react';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { DataTable } from '@/components/data-table';
import data from "@/data/data";
import { SectionCards } from '@/components/section-cards';
import LoaderPage from '@/components/loader-page';

export default function Dashboard() {
  const { fullUser, loading } = useAuth()

  if (loading) return (
    <LoaderPage />
  );


  // Log fullUser in console when it's available
  useEffect(() => {
    if (!loading && fullUser) {
      console.log("✅ Logged in user:", fullUser)
    }
  }, [loading, fullUser])

  if (loading) return <LoaderPage />
  // if (!fullUser) return <p>Not authenticated</p>

  return (
    <div>
      {/* <h1 className="text-2xl">Welcome, {user.email}!</h1>
      <p>Your role: {role ?? 'Loading...'}</p> */}

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards />
            <div className="px-4 lg:px-6">
              <ChartAreaInteractive />
            </div>
            <DataTable data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
