"use client";

import { Button } from "@/components/ui/button";
export default function AssessmentStartPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Skin Assessment</h1>
      <p className="text-muted-foreground text-sm">
        Start your assessment using the live capture flow.
      </p>
      <Button asChild>
        <a href="/start-assessment">Start assessment</a>
      </Button>
    </div>
  );
}
