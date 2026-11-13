'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api-client';

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
      setActionSuccess(`Rating #${id.slice(0, 8)} ${isHidden ? 'hidden from public view' : 'restored to public view'}.`);
      setModerationReason('');
      fetchRatings();
    } catch (err: any) {
      setError(err.message || 'Failed to moderate rating');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#0F172A' }}>
            Ratings & Reviews Moderation Console
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
            Review customer feedback across food, grocery, parcel, mobility, and designated drivers.
          </p>
        </div>
        <button
          onClick={fetchRatings}
          style={{ padding: '8px 16px', backgroundColor: '#00C853', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          Refresh Ratings
        </button>
      </div>

      {actionSuccess && (
        <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #16A34A', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', color: '#166534' }}>
          ✓ {actionSuccess}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #EF4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', color: '#991B1B' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Customer Reviews ({ratings.length})</h2>
        {loading ? (
          <p style={{ color: '#64748B' }}>Loading ratings...</p>
        ) : ratings.length === 0 ? (
          <p style={{ color: '#94A3B8' }}>No customer reviews recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Reviewer</th>
                  <th style={{ padding: '10px' }}>Target Type</th>
                  <th style={{ padding: '10px' }}>Score</th>
                  <th style={{ padding: '10px' }}>Feedback</th>
                  <th style={{ padding: '10px' }}>Visibility</th>
                  <th style={{ padding: '10px' }}>Timestamp</th>
                  <th style={{ padding: '10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px' }}>{r.reviewer_name || r.reviewer_phone}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{r.target_type}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>{'★'.repeat(r.score)}</span>
                      <span style={{ color: '#E2E8F0' }}>{'★'.repeat(5 - r.score)}</span>
                    </td>
                    <td style={{ padding: '10px', color: '#334155', maxWidth: '300px' }}>{r.feedback || '—'}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: r.is_hidden ? '#FEE2E2' : '#DCFCE7',
                        color: r.is_hidden ? '#991B1B' : '#166534',
                      }}>
                        {r.is_hidden ? 'HIDDEN' : 'PUBLIC'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#64748B' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px' }}>
                      {r.is_hidden ? (
                        <button
                          onClick={() => handleModerate(r.id, false)}
                          style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#00C853', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => handleModerate(r.id, true)}
                          style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Hide Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
