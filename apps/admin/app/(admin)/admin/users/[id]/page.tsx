'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi, UserSummary } from '@/lib/api-client';
import { StatusBadge } from '@allgo/ui';
import { UserRolesCard } from '@/components/users/UserRolesCard';
import { UserStatusCard } from '@/components/users/UserStatusCard';
import { UserIdentitiesCard } from '@/components/users/UserIdentitiesCard';
import { UserDevicesCard } from '@/components/users/UserDevicesCard';
import { UserTwoFactorCard } from '@/components/users/UserTwoFactorCard';
import { Button } from '@allgo/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@allgo/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

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
      <div className="p-10 text-center text-muted-foreground text-sm">
        Loading user profile...
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
          {error || 'User not found'}
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/users')}
          className="flex items-center gap-1.5"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4 rtl:rotate-180" />
          <span>Back to User Directory</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/users')}
          className="text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1.5 -ms-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5 rtl:rotate-180" />
          <span>Back to Users</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{user.fullName || 'User Profile'}</h1>
          <p className="text-muted-foreground text-xs">ID: {user.id}</p>
        </div>
        <StatusBadge status={user.status} />
      </div>

      {message && (
        <div className="p-4 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm">
          {message}
        </div>
      )}

      {/* Account Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Primary Identity Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Registered Phone:</span>
              <div className="font-semibold text-foreground text-sm mt-0.5">{user.phone}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <div className="font-semibold text-foreground text-sm mt-0.5">{user.email || 'Not provided'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Language Preference:</span>
              <div className="font-semibold text-foreground text-sm mt-0.5">{user.defaultLanguage.toUpperCase()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Member Since:</span>
              <div className="font-semibold text-foreground text-sm mt-0.5">{new Date(user.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      <UserIdentitiesCard userId={user.id} />

      <UserTwoFactorCard userId={user.id} />

      <UserDevicesCard userId={user.id} />
    </div>
  );
}
