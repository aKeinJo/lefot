"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CheckProviderMain() {
  return (
    <div className="flex flex-col justify-center items-center gap-6 border-lefot-border border-l w-full h-screen">
      <h1 className="font-bold text-2xl">API Key Required</h1>
      <p className="text-foreground-subtle text-center">
        <span>This application uses language model.</span>
        <br />
        <span>Please set at least one provider's API key to use the app.</span>
        <br />
        <span>You can do this in settings</span>
      </p>
      <Link href="/settings">
        <Button variant="primary">Go to Settings</Button>
      </Link>
    </div>
  );
}

export function EmptyProjectMain() {
  return (
    <div className="flex flex-col justify-center items-center gap-6 w-full h-screen">
      <h1 className="font-bold text-2xl">No Projects</h1>
      <p className="text-muted-foreground">
        Please create a new project to get started.
      </p>
      <Link href="/new">
        <Button variant="primary">Create First Project</Button>
      </Link>
    </div>
  );
}
