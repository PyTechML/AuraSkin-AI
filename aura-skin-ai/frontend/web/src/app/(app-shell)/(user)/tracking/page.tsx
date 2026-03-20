"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserCurrentRoutine, getAiRecommendedProducts } from "@/services/api";
import type { Product } from "@/types";

export default function RoutinePage() {
  const [routine, setRoutine] = useState<Awaited<ReturnType<typeof getUserCurrentRoutine>>>(null);
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState<Product[]>([]);

  const refetchRoutine = () => {
    getUserCurrentRoutine().then((data) => setRoutine(data ?? null));
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getUserCurrentRoutine()
      .then((data) => {
        if (alive) setRoutine(data ?? null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    window.addEventListener("focus", refetchRoutine);
    return () => window.removeEventListener("focus", refetchRoutine);
  }, []);

  useEffect(() => {
    let alive = true;
    getAiRecommendedProducts()
      .then((products) => {
        if (alive) setRecommended(Array.isArray(products) ? products : []);
      })
      .catch(() => {
        if (alive) setRecommended([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const plan = routine?.plan ?? null;
  const morningRoutine = Array.isArray(plan?.morningRoutine) ? plan.morningRoutine : [];
  const nightRoutine = Array.isArray(plan?.nightRoutine) ? plan.nightRoutine : [];
  const lifestyle = plan?.lifestyle ?? {};
  const foodAdvice = Array.isArray(lifestyle.foodAdvice) ? lifestyle.foodAdvice : [];
  const hydration = Array.isArray(lifestyle.hydration) ? lifestyle.hydration : [];
  const sleep = Array.isArray(lifestyle.sleep) ? lifestyle.sleep : [];
  const safeRecommended = Array.isArray(recommended) ? recommended : [];

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="font-heading text-2xl font-semibold">Routine</h1>
        <p className="text-muted-foreground">Loading your routine…</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-8">
        <h1 className="font-heading text-2xl font-semibold">Routine</h1>
        <p className="text-muted-foreground">
          Track your personalized skincare routine based on your latest assessment.
        </p>
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No assessment completed yet. Complete an assessment to get your personalized routine.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/start-assessment">Start assessment</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold">Your Skincare Routine</h1>
      <p className="text-muted-foreground">
        Your personalized routine based on your latest skin assessment.
      </p>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading">Morning routine</CardTitle>
              <CardDescription>Steps to follow each morning.</CardDescription>
            </CardHeader>
            <CardContent>
              {morningRoutine.length === 0 ? (
                <p className="text-sm text-muted-foreground">No morning steps defined.</p>
              ) : (
                <ul className="list-disc list-inside space-y-2 text-sm text-foreground">
                  {morningRoutine.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading">Night routine</CardTitle>
              <CardDescription>Steps to follow each evening.</CardDescription>
            </CardHeader>
            <CardContent>
              {nightRoutine.length === 0 ? (
                <p className="text-sm text-muted-foreground">No night steps defined.</p>
              ) : (
                <ul className="list-disc list-inside space-y-2 text-sm text-foreground">
                  {nightRoutine.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading">Lifestyle & habits</CardTitle>
            <CardDescription>Water, diet, and sleep recommendations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {hydration.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Water & hydration</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {hydration.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {foodAdvice.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Diet</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {foodAdvice.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {sleep.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Sleep & lifestyle</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {sleep.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {hydration.length === 0 && foodAdvice.length === 0 && sleep.length === 0 && (
              <p className="text-sm text-muted-foreground">No lifestyle recommendations yet.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading">Recommended products</CardTitle>
            <CardDescription>
              Products that pair well with your current routine and skin profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {safeRecommended.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products available.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-foreground">
                {safeRecommended.map((p) => (
                  <li key={p.id}>
                    <span className="font-medium">{p.name}</span>
                    {p.category && (
                      <span className="text-xs text-muted-foreground"> · {p.category}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <p className="text-sm text-muted-foreground">
        Run a new assessment to update your routine based on your latest skin analysis.
      </p>
      <Button variant="outline" size="sm" asChild>
        <Link href="/start-assessment">Start new assessment</Link>
      </Button>
    </div>
  );
}
