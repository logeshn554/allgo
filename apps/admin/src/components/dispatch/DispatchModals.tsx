import React from 'react';

interface ManualAssignModalProps {
  assignJobId: string | null;
  assignPartnerId: string;
  setAssignPartnerId: (val: string) => void;
  assignReason: string;
  setAssignReason: (val: string) => void;
  onlinePartners: any[];
  actionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ManualAssignModal: React.FC<ManualAssignModalProps> = ({
  assignJobId,
  assignPartnerId,
  setAssignPartnerId,
  assignReason,
  setAssignReason,
  onlinePartners,
  actionLoading,
  onClose,
  onConfirm,
}) => {
  if (!assignJobId) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', width: '450px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Manual Dispatch Assignment</h3>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Select Partner</label>
          <select
            value={assignPartnerId}
            onChange={(e) => setAssignPartnerId(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
          >
            <option value="">-- Choose Partner --</option>
            {onlinePartners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName || 'Partner'} ({p.phone}) - {p.sessionStatus}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Reason for Override</label>
          <input
            type="text"
            placeholder="e.g. VIP express dispatch or nearest courier"
            value={assignReason}
            onChange={(e) => setAssignReason(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={actionLoading || !assignPartnerId}
            style={{ padding: '8px 16px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface CancelJobModalProps {
  cancelJobId: string | null;
  cancelReasonCode: string;
  setCancelReasonCode: (val: string) => void;
  cancelReasonDetails: string;
  setCancelReasonDetails: (val: string) => void;
  actionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelJobModal: React.FC<CancelJobModalProps> = ({
  cancelJobId,
  cancelReasonCode,
  setCancelReasonCode,
  cancelReasonDetails,
  setCancelReasonDetails,
  actionLoading,
  onClose,
  onConfirm,
}) => {
  if (!cancelJobId) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', width: '450px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#DC2626' }}>Cancel Delivery Job</h3>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Cancellation Reason Code</label>
          <select
            value={cancelReasonCode}
            onChange={(e) => setCancelReasonCode(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
          >
            <option value="ADMIN_OVERRIDE">Admin Manual Override</option>
            <option value="CUSTOMER_CANCELLED">Customer Requested Cancellation</option>
            <option value="MERCHANT_REJECTED">Merchant Out of Stock / Unresponsive</option>
            <option value="NO_PARTNERS_AVAILABLE">No Partner Available in Zone</option>
            <option value="FRAUD_SUSPECTED">Suspected Fraudulent Activity</option>
          </select>
        </div>
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Details / Audit Notes</label>
          <textarea
            rows={3}
            placeholder="Enter mandatory reason details for audit..."
            value={cancelReasonDetails}
            onChange={(e) => setCancelReasonDetails(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF', cursor: 'pointer' }}
          >
            Dismiss
          </button>
          <button
            onClick={onConfirm}
            disabled={actionLoading}
            style={{ padding: '8px 16px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface JobDetailsModalProps {
  selectedJob: any | null;
  onClose: () => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ selectedJob, onClose }) => {
  if (!selectedJob) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', width: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Job #{selectedJob.job_number}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div><strong>Status:</strong> {selectedJob.status}</div>
          <div><strong>Vertical:</strong> {selectedJob.vertical_type}</div>
          <div><strong>Outlet:</strong> {selectedJob.outlet_name}</div>
          <div><strong>Courier Fee:</strong> ₹{Number(selectedJob.courier_fee_inr || 0).toFixed(2)}</div>
          <div><strong>Handover OTP:</strong> {selectedJob.handover_otp || 'N/A'}</div>
          <div><strong>Delivery PIN:</strong> {selectedJob.delivery_pin || 'N/A'}</div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>PICKUP ADDRESS</div>
          <div style={{ fontSize: '13px', marginTop: '2px' }}>{selectedJob.pickup_address}</div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>DROPOFF ADDRESS</div>
          <div style={{ fontSize: '13px', marginTop: '2px' }}>{selectedJob.dropoff_address}</div>
        </div>

        <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}>Status Lifecycle Events</h4>
        <div style={{ fontSize: '12px' }}>
          {(selectedJob.events || []).map((ev: any) => (
            <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #F1F5F9' }}>
              <span>{ev.from_status || 'INIT'} ➔ <strong>{ev.to_status}</strong> ({ev.actor_role})</span>
              <span style={{ color: '#64748B' }}>{new Date(ev.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>

        <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}>Dispatch Attempts</h4>
        <div style={{ fontSize: '12px' }}>
          {(selectedJob.dispatch_attempts || []).length === 0 ? (
            <div style={{ color: '#94A3B8' }}>No dispatch attempts yet.</div>
          ) : (
            (selectedJob.dispatch_attempts || []).map((da: any) => (
              <div key={da.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>#{da.attempt_number} {da.partner_name} ({da.status})</span>
                <span style={{ color: '#64748B' }}>Dist: {da.distance_meters}m</span>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
