import { Badge } from './badge';

export function StatusBadge({ status }: { status: string }) {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  let customClass = 'border-border bg-muted text-foreground';

  switch (status) {
    case 'ACTIVE':
    case 'VERIFIED':
    case 'RESOLVED':
    case 'SUCCESS':
    case 'COMPLETED':
    case 'ONLINE':
      customClass = 'border-primary/30 bg-primary/10 text-primary';
      break;
    case 'SUSPENDED':
    case 'PENDING':
    case 'PENDING_VERIFICATION':
    case 'IN_PROGRESS':
    case 'ASSIGNED':
      customClass = 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400';
      break;
    case 'BLOCKED':
    case 'REJECTED':
    case 'FAILED':
    case 'CANCELLED':
    case 'OFFLINE':
      variant = 'destructive';
      customClass = '';
      break;
  }

  return (
    <Badge variant={variant} className={`text-[11px] font-semibold tracking-wider ${customClass}`}>
      {status}
    </Badge>
  );
}
