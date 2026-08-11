'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MotionFadeUp } from '@/components/motion';

export function DashboardGettingStarted() {
  return (
    <MotionFadeUp>
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            This is Suman Dey&apos;s Fastify 5 + Next.js 16 fullstack boilerplate. Use the sidebar
            to explore available sections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Backend:</span> runs on port 44300 —
            Swagger UI at <code className="rounded bg-muted px-1 py-0.5">/api-docs</code>
          </p>
          <p>
            <span className="font-medium text-foreground">Frontend:</span> Next.js App Router,
            shadcn/ui components, TanStack Query
          </p>
          <p>
            <span className="font-medium text-foreground">Auth:</span> better-auth integrated —
            sign-in / sign-up / reset password flows ready
          </p>
        </CardContent>
      </Card>
    </MotionFadeUp>
  );
}
