import { create } from "zustand";
import { Customer } from "@/interfaces/customer";

// Define the shape of your state
interface CustomerState {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
}

// Create the Zustand store
export const useCustomerStore = create<CustomerState>((set) => ({
  // Initial state
  selectedCustomer: null,

  // Actions to update the state
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
}));
