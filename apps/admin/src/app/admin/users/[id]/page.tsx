'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi, UserSummary } from '@/lib/api-client';
import { StatusBadge } from '@/components/StatusBadge';
import { UserRolesCard } from '@/components/users/UserRolesCard';
import { UserStatusCard } from '@/components/users/UserStatusCard';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [roleToAssign, setRoleToAssign] = useState('ADMIN');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await adminApi.getUser(userId);
        setUser(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch user');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [userId]);

  const handleStatusChange = async (newStatus: string) => {
    // Allows admin to SUSPEND (SUSPENDED) or BLOCK (BLOCKED) user account
    if (!user) return;
    setUpdating(true);
    setMessage(null);
    setError(null);

    try {
      await adminApi.updateUserStatus(user.id, newStatus);
      setUser({ ...user, status: newStatus as any });
      setMessage(`Account status successfully updated to ${newStatus}. Immediate Redis revocation enforced.`);
    } catch (err: any) {
      setError(err.message || 'Status update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignRole = async () => {
    if (!user || !roleToAssign) return;
    if (user.roles.includes(roleToAssign)) {
      setMessage(`User already has the '${roleToAssign}' role.`);
      return;
    }
    setUpdating(true);
    setMessage(null);
    setError(null);

    try {
      await adminApi.assignRole(user.id, roleToAssign);
      setUser({ ...user, roles: [...user.roles, roleToAssign] });
      setMessage(`Role '${roleToAssign}' assigned successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to assign role');
    } finally {
      setUpdating(false);
    }
  };

  const handleRevokeRole = async (roleToRevoke: string) => {
    if (!user) return;
    setUpdating(true);
    setMessage(null);
    setError(null);

    try {
      await adminApi.revokeRole(user.id, roleToRevoke);
      setUser({ ...user, roles: user.roles.filter((r: string) => r !== roleToRevoke) });
      setMessage(`Role '${roleToRevoke}' revoked successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke role');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
        Loading user profile...
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ padding: '16px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '8px' }}>
          {error || 'User not found'}
        </div>
        <button
          onClick={() => router.push('/admin/users')}
          style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}
        >
          ← Back to User Directory
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <button
        onClick={() => router.push('/admin/users')}
        style={{
          border: 'none',
          background: 'transparent',
          color: '#64748B',
          cursor: 'pointer',
          padding: 0,
          marginBottom: '16px',
          fontSize: '13px',
          fontWeight: '600',
        }}
      >
        ← Back to Users
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{user.fullName || 'User Profile'}</h1>
          <p style={{ color: '#64748B', margin: 0, fontSize: '13px' }}>ID: {user.id}</p>
        </div>
        <StatusBadge status={user.status} />
      </div>

      {message && (
        <div style={{ padding: '12px', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '8px', marginBottom: '16px' }}>
          {message}
        </div>
      )}

      {/* Account Info Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 16px 0' }}>Primary Identity Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
          <div>
            <span style={{ color: '#64748B' }}>Registered Phone:</span>
            <div style={{ fontWeight: '600', marginTop: '2px' }}>{user.phone}</div>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Email:</span>
            <div style={{ fontWeight: '600', marginTop: '2px' }}>{user.email || 'Not provided'}</div>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Language Preference:</span>
            <div style={{ fontWeight: '600', marginTop: '2px' }}>{user.defaultLanguage.toUpperCase()}</div>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Member Since:</span>
            <div style={{ fontWeight: '600', marginTop: '2px' }}>{new Date(user.createdAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <UserRolesCard
        roles={user.roles}
        roleToAssign={roleToAssign}
        setRoleToAssign={setRoleToAssign}
        updating={updating}
        onAssignRole={handleAssignRole}
        onRevokeRole={handleRevokeRole}
      />

      <UserStatusCard
        status={user.status}
        updating={updating}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
