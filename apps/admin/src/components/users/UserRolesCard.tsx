import React from 'react';

const ALL_ROLES = ['CUSTOMER', 'PARTNER', 'MERCHANT', 'ADMIN', 'DRIVER', 'RESTAURANT_OWNER', 'STORE_MANAGER'];

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
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', marginBottom: '20px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0' }}>Assigned Platform Roles</h2>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {roles.map((r: string) => (
          <span
            key={r}
            style={{
              backgroundColor: '#F1F5F9',
              color: '#334155',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {r}
            {roles.length > 1 && (
              <button
                onClick={() => onRevokeRole(r)}
                disabled={updating}
                title={`Revoke role ${r}`}
                style={{
                  border: 'none',
                  background: '#E2E8F0',
                  color: '#64748B',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  lineHeight: '16px',
                  textAlign: 'center',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  padding: 0,
                }}
              >
                ✕
              </button>
            )}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
        <select
          value={roleToAssign}
          onChange={(e) => setRoleToAssign(e.target.value)}
          disabled={updating}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            fontSize: '13px',
          }}
        >
          {ALL_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <button
          onClick={onAssignRole}
          disabled={updating}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            fontWeight: '600',
            fontSize: '13px',
            cursor: updating ? 'not-allowed' : 'pointer',
          }}
        >
          Assign Role
        </button>
      </div>
    </div>
  );
};
