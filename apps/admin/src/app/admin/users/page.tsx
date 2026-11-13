'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, UserSummary } from '@/lib/api-client';
import { StatusBadge } from '@/components/StatusBadge';

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi.listUsers(1, 50, statusFilter || undefined);
        setUsers(res.users);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [statusFilter]);

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.phone.toLowerCase().includes(q) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      u.roles.some((r: string) => r.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>User & Identity Registry</h1>
          <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
            Manage platform accounts, role assignments, and suspension status.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          backgroundColor: '#FFFFFF',
          padding: '14px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
        }}
      >
        <input
          type="text"
          placeholder="Search by phone, name, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BLOCKED">Blocked</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Users Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>User / Phone</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Assigned Roles</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Registered Date</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                  Loading user records...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                  No users found matching current filters.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '600', color: '#0F172A' }}>{u.fullName || 'Registered User'}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{u.phone}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {u.roles.map((r: string) => (
                        <span
                          key={r}
                          style={{
                            fontSize: '11px',
                            backgroundColor: '#F1F5F9',
                            color: '#334155',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '500',
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={u.status} />
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <a
                      href={`/admin/users/${u.id}`}
                      style={{
                        color: '#00C853',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '12px',
                      }}
                    >
                      Manage →
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

