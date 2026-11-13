// Job: Save and load the logged-in user profile and delivery address.

export interface UserProfile {
  phone: string;
  name: string;
  role: 'customer' | 'driver';
  address: string;
}

let currentUser: UserProfile | null = {
  phone: '+91 98765 43210',
  name: 'AllGo User',
  role: 'customer',
  address: 'MG Road, Bengaluru',
};

export function loadUserProfile(): UserProfile | null {
  return currentUser ? { ...currentUser } : null;
}

export function saveUserLogin(phone: string, name: string, role: 'customer' | 'driver'): UserProfile {
  currentUser = {
    phone,
    name: name || 'User',
    role,
    address: currentUser?.address || 'MG Road, Bengaluru',
  };
  return { ...currentUser };
}

export function saveUserAddress(newAddress: string): UserProfile | null {
  if (!currentUser) return null;
  currentUser.address = newAddress;
  return { ...currentUser };
}
