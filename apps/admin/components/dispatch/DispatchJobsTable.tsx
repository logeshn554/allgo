import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@allgo/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { FilterIcon } from '@hugeicons/core-free-icons';

const DISPATCH_STATUS_ITEMS = {
  ALL: 'All Statuses',
  DISPATCH_PENDING: 'Dispatch Pending',
  READY_FOR_PICKUP: 'Ready For Pickup',
  ASSIGNMENT_PENDING: 'Assignment Pending',
  PARTNER_ASSIGNED: 'Partner Assigned',
  PARTNER_ARRIVED_PICKUP: 'Courier Arrived Store',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_DESTINATION: 'Arrived Customer',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

interface DispatchJobsTableProps {
  jobs: any[];
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  onlinePartners: any[];
  onViewDetails: (id: string) => void;
  onOpenAssign: (jobId: string, firstPartnerId?: string) => void;
  onTriggerDispatch: (jobId: string) => void;
  onOpenCancel: (jobId: string) => void;
}

export const DispatchJobsTable: React.FC<DispatchJobsTableProps> = ({
  jobs,
  statusFilter,
  setStatusFilter,
  onlinePartners,
  onViewDetails,
  onOpenAssign,
  onTriggerDispatch,
  onOpenCancel,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={FilterIcon} strokeWidth={2} className="size-4 text-muted-foreground" />
        <Select
          value={statusFilter || 'ALL'}
          items={DISPATCH_STATUS_ITEMS}
          onValueChange={(val) => setStatusFilter(val === 'ALL' ? '' : (val ?? ''))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DISPATCH_PENDING">Dispatch Pending</SelectItem>
              <SelectItem value="READY_FOR_PICKUP">Ready For Pickup</SelectItem>
              <SelectItem value="ASSIGNMENT_PENDING">Assignment Pending</SelectItem>
              <SelectItem value="PARTNER_ASSIGNED">Partner Assigned</SelectItem>
              <SelectItem value="PARTNER_ARRIVED_PICKUP">Courier Arrived Store</SelectItem>
              <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
              <SelectItem value="ARRIVED_AT_DESTINATION">Arrived Customer</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job #</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Outlet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Partner</TableHead>
              <TableHead>Courier Fee</TableHead>
              <TableHead>PIN / OTP</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  No delivery jobs matching current filter.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-semibold text-foreground">{job.job_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {job.vertical_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground">{job.outlet_name || 'Outlet'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        job.status === 'DELIVERED'
                          ? 'default'
                          : job.status === 'CANCELLED'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {job.partner_name ? (
                      <div>
                        <div className="font-medium text-foreground">{job.partner_name}</div>
                        <div className="text-xs text-muted-foreground">{job.partner_phone}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    ₹{Number(job.courier_fee_inr || 0).toFixed(0)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {job.delivery_pin && <div>PIN: <strong>{job.delivery_pin}</strong></div>}
                    {job.handover_otp && <div className="text-amber-500">OTP: <strong>{job.handover_otp}</strong></div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(job.created_at).toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(job.id)}
                      >
                        Details
                      </Button>
                      {job.status !== 'DELIVERED' && job.status !== 'CANCELLED' && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              onOpenAssign(job.id, onlinePartners.length > 0 ? onlinePartners[0].id : undefined);
                            }}
                          >
                            Assign
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                            onClick={() => onTriggerDispatch(job.id)}
                          >
                            Dispatch
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onOpenCancel(job.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
