'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api-client';
import { authSettingsApi } from '@/data/api';
import {
  StatusBadge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
} from '@allgo/ui';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Input } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@allgo/ui';

const USER_ROLE_ITEMS = {
  ALL: 'All Roles',
  CUSTOMER: 'Customer',
  MERCHANT: 'Merchant',
  DELIVERY_PARTNER: 'Delivery Partner',
  ADMIN: 'System Administrator',
  CITY_OPS: 'City Operations Dispatcher',
};

const USER_STATUS_ITEMS = {
  ALL: 'All Statuses',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  BLOCKED: 'Blocked',
  PENDING_VERIFICATION: 'Pending Verification',
};

export default function UsersDirectoryPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Create User Dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState('CUSTOMER');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getUsers(selectedRole || undefined, selectedStatus || undefined);
      setUsers((data as any).users || (Array.isArray(data) ? data : []));
    } catch (err: any) {
      setError(err?.message || 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRole, selectedStatus]);

  const filteredUsers = users.filter((u) =>
    phoneSearch ? u.phone?.includes(phoneSearch) || u.fullName?.toLowerCase().includes(phoneSearch.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            User Identity & Access Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search cross-platform identities, review assigned RBAC roles, audit phone verification, and suspend malicious users.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            Create User
          </Button>
          <Button onClick={fetchUsers}>
            Refresh Directory
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="text"
          placeholder="Search by phone number or name..."
          value={phoneSearch}
          onChange={(e) => setPhoneSearch(e.target.value)}
          className="max-w-md"
        />
        <Select
          value={selectedRole || 'ALL'}
          items={USER_ROLE_ITEMS}
          onValueChange={(val) => setSelectedRole(val === 'ALL' ? '' : (val ?? ''))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="CUSTOMER">Customer</SelectItem>
              <SelectItem value="MERCHANT">Merchant</SelectItem>
              <SelectItem value="DELIVERY_PARTNER">Delivery Partner</SelectItem>
              <SelectItem value="ADMIN">System Administrator</SelectItem>
              <SelectItem value="CITY_OPS">City Operations Dispatcher</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={selectedStatus || 'ALL'}
          items={USER_STATUS_ITEMS}
          onValueChange={(val) => setSelectedStatus(val === 'ALL' ? '' : (val ?? ''))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
              <SelectItem value="PENDING_VERIFICATION">Pending Verification</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User / Phone</TableHead>
                <TableHead>Assigned Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered Date</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Loading user records...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No users found matching current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{u.fullName || 'Registered User'}</div>
                      <div className="text-xs text-muted-foreground">{u.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map((r: string) => (
                          <Badge key={r} variant="secondary" className="text-xs">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/admin/users/${u.id}`} />}>
                        View Profile & RBAC
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create / Invite User</DialogTitle>
            <DialogDescription>
              Create a user with phone, email, optional password, and initial RBAC role.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setCreating(true);
              setError(null);
              try {
                await authSettingsApi.createUser({
                  email: createEmail.trim() || undefined,
                  phone: createPhone.trim() || undefined,
                  password: createPassword || undefined,
                  fullName: createName.trim() || undefined,
                  role: createRole,
                });
                setShowCreate(false);
                setCreateEmail('');
                setCreatePhone('');
                setCreatePassword('');
                setCreateName('');
                await fetchUsers();
              } catch (err: any) {
                setError(err.message || 'Failed to create user');
              } finally {
                setCreating(false);
              }
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="user@allgo.in" />
            </div>
            <div className="space-y-1">
              <Label>Phone (E.164)</Label>
              <Input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} placeholder="+919876543210" />
            </div>
            <div className="space-y-1">
              <Label>Password (optional)</Label>
              <Input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Min 8 characters" />
            </div>
            <div className="space-y-1">
              <Label>Initial Role</Label>
              <Select value={createRole} onValueChange={(v) => v && setCreateRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="MERCHANT">Merchant</SelectItem>
                  <SelectItem value="DELIVERY_PARTNER">Delivery Partner</SelectItem>
                  <SelectItem value="CITY_OPS">City Operations</SelectItem>
                  <SelectItem value="ADMIN">System Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
