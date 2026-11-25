import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@allgo/ui';
import { Badge } from '@allgo/ui';

interface ParcelRestrictionsTableProps {
  restrictions: any[];
  onRefresh?: () => void;
}

export const ParcelRestrictionsTable: React.FC<ParcelRestrictionsTableProps> = ({ restrictions }) => {
  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold tracking-tight">
        Configurable Goods Restrictions & Transport Policy
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CATEGORY</TableHead>
              <TableHead>DISPLAY NAME</TableHead>
              <TableHead>PERMITTED?</TableHead>
              <TableHead>REQUIRES REVIEW?</TableHead>
              <TableHead>MAX WEIGHT (KG)</TableHead>
              <TableHead>MAX VALUE (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restrictions.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold text-foreground">{r.category_name}</TableCell>
                <TableCell className="text-foreground">{r.display_name}</TableCell>
                <TableCell>
                  <Badge variant={r.is_permitted ? 'default' : 'destructive'}>
                    {r.is_permitted ? 'PERMITTED' : 'PROHIBITED'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.requires_review ? (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                      Mandatory Inspection
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">No</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.max_weight_kg} kg</TableCell>
                <TableCell className="font-semibold text-foreground">₹{r.max_declared_value_inr}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
