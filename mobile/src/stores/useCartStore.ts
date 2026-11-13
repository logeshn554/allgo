import { create } from 'zustand';

export interface CartItem {
  id: string;
  title: string;
  unitPriceCents: number;
  quantity: number;
}

export type VerticalType = 'grocery' | 'food' | 'courier';

interface VerticalCartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getSubtotalCents: () => number;
}

interface MultiVerticalCartStore {
  grocery: VerticalCartState;
  food: VerticalCartState;
  courier: VerticalCartState;
}

const createCartSlice = (set: any, get: any, vertical: VerticalType): VerticalCartState => ({
  items: [],
  addItem: (item) =>
    set((state: any) => {
      const existing = state[vertical].items.find((i: CartItem) => i.id === item.id);
      let updatedItems: CartItem[];

      if (existing) {
        updatedItems = state[vertical].items.map((i: CartItem) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      } else {
        updatedItems = [...state[vertical].items, item];
      }

      return {
        ...state,
        [vertical]: {
          ...state[vertical],
          items: updatedItems,
        },
      };
    }),
  removeItem: (id) =>
    set((state: any) => ({
      ...state,
      [vertical]: {
        ...state[vertical],
        items: state[vertical].items.filter((i: CartItem) => i.id !== id),
      },
    })),
  clearCart: () =>
    set((state: any) => ({
      ...state,
      [vertical]: {
        ...state[vertical],
        items: [],
      },
    })),
  getSubtotalCents: () => {
    return get()[vertical].items.reduce(
      (acc: number, item: CartItem) => acc + item.unitPriceCents * item.quantity,
      0
    );
  },
});

export const useCartStore = create<MultiVerticalCartStore>((set, get) => ({
  grocery: createCartSlice(set, get, 'grocery'),
  food: createCartSlice(set, get, 'food'),
  courier: createCartSlice(set, get, 'courier'),
}));
