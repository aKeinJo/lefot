"use client";

import { Suspense } from "react";
import { ProjectMain } from "./_components/main-project";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 justify-center items-center min-w-200 h-screen">
          Loading project...
        </div>
      }
    >
      <ProjectMain />
    </Suspense>
  );
}
