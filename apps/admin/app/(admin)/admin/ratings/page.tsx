'use client';

import { adminApi } from '@/lib/api-client';
import { Button } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@allgo/ui';
import { StarIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';

export default function RatingsAdminPage() {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [moderationReason, setModerationReason] = useState('');

  const fetchRatings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.listRatings(100, 0);
      setRatings(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  const handleModerate = async (id: string, isHidden: boolean) => {
    try {
      await adminApi.moderateRating(id, isHidden, moderationReason || undefined);
      setActionSuccess(
        `Rating #${id.slice(0, 8)} ${isHidden ? 'hidden from public view' : 'restored to public view'}.`,
      );
      setModerationReason('');
      fetchRatings();
    } catch (err: any) {
      setError(err.message || 'Failed to moderate rating');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Ratings & Reviews Moderation Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review customer feedback across food, grocery, parcel, mobility, and designated drivers.
          </p>
        </div>
        <Button onClick={fetchRatings}>Refresh Ratings</Button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm">
          Success: {actionSuccess}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
          Error: {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="text-lg font-semibold tracking-tight">
          Customer Reviews ({ratings.length})
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading ratings...</div>
          ) : ratings.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No customer reviews recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-end">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ratings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-foreground">
                      {r.reviewer_name || r.reviewer_phone}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">{r.target_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <HugeiconsIcon
                            key={i}
                            icon={StarIcon}
                            className={`size-3.5 ${i < r.score ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs text-foreground truncate">
                      {r.feedback || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.is_hidden ? 'destructive' : 'default'}>
                        {r.is_hidden ? 'HIDDEN' : 'PUBLIC'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-end">
                      {r.is_hidden ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModerate(r.id, false)}
                        >
                          Restore
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleModerate(r.id, true)}
                        >
                          Hide Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
