import { VerticalType } from '@allgo/common';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@allgo/ui';

const HIGHLIGHTS = [
  {
    title: 'KYC & Approval Status',
    desc: 'Upload driving license, RC, and track verification progress.',
  },
  {
    title: 'Earnings & COD Ledger',
    desc: 'Review trip payouts, incentives, and cash-on-delivery settlements.',
  },
  {
    title: 'Active Shift Summary',
    desc: 'Inspect completed deliveries, rides, and performance ratings.',
  },
] as const;

export default function HomePage() {
  const verticals = Object.values(VerticalType);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">Partner Portal</Badge>
          <span className="text-muted-foreground text-xs">{verticals.length} Verticals Active</span>
        </div>
        <h1 className="font-semibold text-3xl tracking-tight">AllGo Partner Delivery Web</h1>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Fleet onboarding, KYC verification status, earnings ledger, and shift history.
        </p>
      </header>

      <Separator />

      <section className="grid gap-4 md:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>{item.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Open Workspace
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
