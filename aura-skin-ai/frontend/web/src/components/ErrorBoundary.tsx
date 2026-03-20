"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    console.error("ErrorBoundary caught an error:", error);
  }

  handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 bg-background text-foreground">
          <Card className="max-w-md w-full border-border">
            <CardContent className="pt-6 pb-6 text-center space-y-6">
              <h1 className="font-heading text-xl font-semibold text-foreground">
                Something went wrong. Please refresh.
              </h1>
              <p className="text-sm text-muted-foreground font-body">
                We encountered an unexpected error. Try refreshing the page.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleReload}>Reload</Button>
                <Button variant="outline" asChild>
                  <Link href="/">Go home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
