"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardLoading: React.FC = () => {
  return (
    <div 
      className="p-6 space-y-8"
      role="status"
      aria-label="Dashboard content is loading"
    >
      {/* Header Section */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[180px]" />
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((index) => (
          <div 
            key={index}
            className="p-6 rounded-lg border border-border"
          >
            <Skeleton className="h-7 w-[120px] mb-4" />
            <Skeleton className="h-10 w-[180px] mb-2" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        ))}
      </div>

      {/* Chart Area */}
      <div className="rounded-lg border border-border p-6">
        <Skeleton className="h-6 w-[150px] mb-6" />
        <Skeleton className="aspect-[2/1] w-full rounded-lg" />
      </div>

      {/* Recent Scenarios List */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-[200px] mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div 
              key={index}
              className="p-4 rounded-lg border border-border"
            >
              <div className="space-y-3">
                <Skeleton className="h-5 w-[180px]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[120px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reduced Motion Support */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardLoading;