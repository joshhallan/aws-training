// Interfaces for type safety, matching the structure of your JSON data
interface Address {
  country: string;
  state: string;
  city: string;
  street: string;
  postalCode: string;
}

export interface Customer {
  lastName: string;
  address: Address;
  email: string;
  firstName: string;
  updated: string;
  company: string;
  sk: string;
  jobTitle: string;
  pk: string;
  phone: string;
  type: string;
  customerId: string;
  created: string;
}