// Job: Save and load current user session, profile, and active delivery address.

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  role: 'customer' | 'driver';
  address: string;
}

let currentUser: UserProfile | null = {
  id: 'usr_guest',
  phone: '+91 98765 43210',
  name: 'Demo Customer',
  role: 'customer',
  address: 'Indiranagar 100ft Road, Bengaluru',
};

export function loadCurrentUser(): UserProfile | null {
  return currentUser ? { ...currentUser } : null;
}

export function saveUserSession(user: UserProfile): void {
  currentUser = { ...user };
}

export function updateUserAddress(newAddress: string): UserProfile | null {
  if (!currentUser) return null;
  currentUser.address = newAddress;
  return { ...currentUser };
}

export function clearUserSession(): void {
  currentUser = null;
}
