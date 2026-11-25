import { Card, CardContent, CardHeader, CardTitle } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@allgo/ui';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type React from 'react';

const ALL_ROLES = [
  'CUSTOMER',
  'PARTNER',
  'MERCHANT',
  'ADMIN',
  'DRIVER',
  'RESTAURANT_OWNER',
  'STORE_MANAGER',
];

interface UserRolesCardProps {
  roles: string[];
  roleToAssign: string;
  setRoleToAssign: (val: string) => void;
  updating: boolean;
  onAssignRole: () => void;
  onRevokeRole: (role: string) => void;
}

export const UserRolesCard: React.FC<UserRolesCardProps> = ({
  roles,
  roleToAssign,
  setRoleToAssign,
  updating,
  onAssignRole,
  onRevokeRole,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Assigned Platform Roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {roles.map((r: string) => (
            <Badge
              key={r}
              variant="secondary"
              className="px-3 py-1 text-sm flex items-center gap-2"
            >
              {r}
              {roles.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRevokeRole(r)}
                  disabled={updating}
                  title={`Revoke role ${r}`}
                  className="size-4 p-0 hover:text-destructive cursor-pointer hover:bg-transparent"
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>

        <div className="flex gap-3 items-center border-t border-border pt-4">
          <Select
            value={roleToAssign}
            onValueChange={(val) => setRoleToAssign(val ?? '')}
            disabled={updating}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ALL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button onClick={onAssignRole} disabled={updating} variant="outline">
            Assign Role
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
