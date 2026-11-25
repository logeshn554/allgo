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
    title: 'Live Order Queue',
    desc: 'Accept incoming orders, mark preparing, and handoff to couriers.',
  },
  {
    title: 'Catalog & Inventory',
    desc: 'Update menu items, option groups, and out-of-stock overrides.',
  },
  {
    title: 'Settlements & GST',
    desc: 'Track daily payouts, ledger entries, and FSSAI compliance.',
  },
] as const;

export default function HomePage() {
  const verticals = Object.values(VerticalType);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">Merchant Console</Badge>
          <span className="text-muted-foreground text-xs">{verticals.length} Verticals Active</span>
        </div>
        <h1 className="font-semibold text-3xl tracking-tight">AllGo Merchant Web</h1>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Manage store catalog, live order queue, operating hours, and settlements.
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
