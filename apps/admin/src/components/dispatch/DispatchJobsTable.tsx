import React from 'react';

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
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
        >
          <option value="">All Statuses</option>
          <option value="DISPATCH_PENDING">Dispatch Pending</option>
          <option value="READY_FOR_PICKUP">Ready For Pickup</option>
          <option value="ASSIGNMENT_PENDING">Assignment Pending</option>
          <option value="PARTNER_ASSIGNED">Partner Assigned</option>
          <option value="PARTNER_ARRIVED_PICKUP">Courier Arrived Store</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="ARRIVED_AT_DESTINATION">Arrived Customer</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
            <th style={{ padding: '12px 16px' }}>Job #</th>
            <th style={{ padding: '12px 16px' }}>Vertical</th>
            <th style={{ padding: '12px 16px' }}>Outlet</th>
            <th style={{ padding: '12px 16px' }}>Status</th>
            <th style={{ padding: '12px 16px' }}>Assigned Partner</th>
            <th style={{ padding: '12px 16px' }}>Courier Fee</th>
            <th style={{ padding: '12px 16px' }}>PIN / OTP</th>
            <th style={{ padding: '12px 16px' }}>Created</th>
            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                No delivery jobs matching current filter.
              </td>
            </tr>
          ) : (
            jobs.map((job) => (
              <tr key={job.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{job.job_number}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                    {job.vertical_type}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>{job.outlet_name || 'Outlet'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor:
                        job.status === 'DELIVERED'
                          ? '#DCFCE7'
                          : job.status === 'CANCELLED'
                          ? '#FEE2E2'
                          : job.status === 'IN_TRANSIT'
                          ? '#F3E8FF'
                          : '#FEF3C7',
                      color:
                        job.status === 'DELIVERED'
                          ? '#15803D'
                          : job.status === 'CANCELLED'
                          ? '#B91C1C'
                          : job.status === 'IN_TRANSIT'
                          ? '#6B21A8'
                          : '#92400E',
                    }}
                  >
                    {job.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {job.partner_name ? (
                    <div>
                      <div style={{ fontWeight: 500 }}>{job.partner_name}</div>
                      <div style={{ color: '#64748B', fontSize: '11px' }}>{job.partner_phone}</div>
                    </div>
                  ) : (
                    <span style={{ color: '#94A3B8' }}>Unassigned</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#16A34A' }}>
                  ₹{Number(job.courier_fee_inr || 0).toFixed(0)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '11px' }}>
                  {job.delivery_pin && <div>PIN: <strong>{job.delivery_pin}</strong></div>}
                  {job.handover_otp && <div style={{ color: '#B45309' }}>OTP: <strong>{job.handover_otp}</strong></div>}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                  {new Date(job.created_at).toLocaleTimeString()}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => onViewDetails(job.id)}
                    style={{ padding: '4px 8px', marginRight: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', background: '#FFFFFF', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Details
                  </button>
                  {job.status !== 'DELIVERED' && job.status !== 'CANCELLED' && (
                    <>
                      <button
                        onClick={() => {
                          onOpenAssign(job.id, onlinePartners.length > 0 ? onlinePartners[0].id : undefined);
                        }}
                        style={{ padding: '4px 8px', marginRight: '6px', border: '1px solid #93C5FD', borderRadius: '4px', background: '#EFF6FF', color: '#1D4ED8', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => onTriggerDispatch(job.id)}
                        style={{ padding: '4px 8px', marginRight: '6px', border: '1px solid #FCD34D', borderRadius: '4px', background: '#FFFBEB', color: '#B45309', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Dispatch
                      </button>
                      <button
                        onClick={() => onOpenCancel(job.id)}
                        style={{ padding: '4px 8px', border: '1px solid #FCA5A5', borderRadius: '4px', background: '#FEF2F2', color: '#B91C1C', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
