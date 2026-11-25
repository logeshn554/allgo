import { Card, CardContent, CardHeader, CardTitle } from '@allgo/ui';
import { Button } from '@allgo/ui';
import type React from 'react';

interface UserStatusCardProps {
  status: string;
  updating: boolean;
  onStatusChange: (status: string) => void;
}

export const UserStatusCard: React.FC<UserStatusCardProps> = ({
  status,
  updating,
  onStatusChange,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Account Status & Access Control</CardTitle>
        <p className="text-xs text-muted-foreground">
          Changing status will immediately invalidate active device JWT sessions in Redis and reject
          downstream requests.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant={status === 'ACTIVE' ? 'default' : 'outline'}
            onClick={() => onStatusChange('ACTIVE')}
            disabled={updating || status === 'ACTIVE'}
          >
            Mark ACTIVE
          </Button>

          <Button
            variant={status === 'SUSPENDED' ? 'secondary' : 'outline'}
            onClick={() => onStatusChange('SUSPENDED')}
            disabled={updating || status === 'SUSPENDED'}
          >
            SUSPEND (Temporary Lock)
          </Button>

          <Button
            variant={status === 'BLOCKED' ? 'destructive' : 'outline'}
            onClick={() => onStatusChange('BLOCKED')}
            disabled={updating || status === 'BLOCKED'}
          >
            BLOCK (Permanent Revocation)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
