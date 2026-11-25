import React from 'react';
import Link from 'next/link';
import { Button } from '@allgo/ui';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
      <h1 className="text-5xl font-bold tracking-tight text-foreground">404</h1>
      <h2 className="text-xl font-semibold text-foreground">
        Administrative Resource Not Found
      </h2>
      <p className="text-sm text-muted-foreground max-w-md">
        The requested admin resource, console view, or identity record does not exist or has been moved.
      </p>
      <Button nativeButton={false} render={<Link href="/admin/dashboard" />}>
        Return to Dashboard
      </Button>
    </div>
  );
}
