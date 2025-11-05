"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Customer } from "@/interfaces/customer";
import { useCustomerStore } from "../store/customerStore";

export default function Home() {
  // Local state for fetching customers and handling loading/errors
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zustand store hook for global state management
  const { setSelectedCustomer } = useCustomerStore();

  // Log the store state to the console for debugging
  useEffect(() => {
    const storeState = useCustomerStore.getState();
    console.log("Current Zustand Store State:", storeState);
  }, []);

  // Fetch customer data from the API
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers`);
        if (!res.ok) {
          throw new Error("Failed to fetch customers.");
        }
        const fetchedData = await res.json();
        setData(fetchedData);
      } catch (err: any) {
        console.error("API fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []); // Empty dependency array means this effect runs once on mount

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-500">Loading customers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8">
          Customers
        </h1>

        {data.length === 0 ? (
          <div className="flex justify-center items-center h-64 flex-col text-center p-4 rounded-xl shadow-lg bg-white">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No Customers Found
            </h2>
            <p className="text-gray-600">
              Your customer list is currently empty. Add new customers to see
              them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((customer) => (
              <Link
                href={`/customers/${customer.customerId}`}
                key={customer.customerId}
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden p-6 cursor-pointer transform hover:scale-105">
                  <h2 className="text-xl font-bold text-gray-900 truncate mb-1">
                    {customer.firstName} {customer.lastName}
                  </h2>
                  <p className="text-sm text-gray-600 truncate mb-4">
                    {customer.jobTitle}
                  </p>

                  <div className="space-y-2 text-sm text-gray-700">
                    <p className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 21h19.5m-19.5 0A2.25 2.25 0 0 0 4.5 18.75H2.25m19.5 0A2.25 2.25 0 0 1 19.5 21m0 0H2.25m17.25 0a2.25 2.25 0 0 0 2.25-2.25M1.5 10.5h19.5m-19.5 0a2.25 2.25 0 0 1-2.25-2.25V6.75a2.25 2.25 0 0 1 2.25-2.25h19.5a2.25 2.25 0 0 1 2.25 2.25v1.5a2.25 2.25 0 0 1-2.25 2.25m-19.5 0a2.25 2.25 0 0 0 2.25-2.25m19.5 0a2.25 2.25 0 0 0 2.25-2.25m-19.5 0h-1.5m1.5 0c.232 0 .458.059.663.179A2.25 2.25 0 0 0 19.5 8.25m-2.25 4.5a2.25 2.25 0 0 1-2.25 2.25H12a2.25 2.25 0 0 1-2.25-2.25m-2.25 0a2.25 2.25 0 0 0-2.25 2.25v2.25a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25V12.75a2.25 2.25 0 0 0-2.25-2.25h-1.5m-2.25 0a2.25 2.25 0 0 1-2.25-2.25"
                        />
                      </svg>
                      <span className="truncate">{customer.company}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                        />
                      </svg>
                      <span className="truncate">{customer.email}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 6.75a2.25 2.25 0 0 1 2.25-2.25h14.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-14.5a2.25 2.25 0 0 1-2.25-2.25V6.75zm19.5 0h-19.5m19.5 0a2.25 2.25 0 0 0-2.25-2.25h-14.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v10.5a2.25 2.25 0 0 1-2.25 2.25h-14.5a2.25 2.25 0 0 1-2.25-2.25V6.75"
                        />
                      </svg>
                      <span className="truncate">{customer.phone}</span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
