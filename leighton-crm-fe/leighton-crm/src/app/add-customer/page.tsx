"use client";

import { useState, useEffect } from "react";
import { NewCustomer } from "@/interfaces/newCustomer";

export default function AddCustomerPage() {
  const [formData, setFormData] = useState<NewCustomer>({
    firstName: "",
    lastName: "",
    jobTitle: "",
    company: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
  });
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | null;
    message: string | null;
  }>({ type: null, message: null });
  const [loading, setLoading] = useState(false);

  // Use useEffect to clear the status message after a few seconds
  useEffect(() => {
    if (statusMessage.message) {
      const timer = setTimeout(() => {
        setStatusMessage({ type: null, message: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Handle changes to form inputs, including nested address fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Check if the input name is for a nested address field
    if (name.startsWith("address.")) {
      const addressKey = name.split(".")[1];
      setFormData((prevData) => ({
        ...prevData,
        address: {
          ...prevData.address,
          [addressKey]: value,
        },
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage({ type: null, message: null });

    // Simple client-side validation for all fields
    const requiredFields = [
      "firstName",
      "lastName",
      "jobTitle",
      "company",
      "email",
      "phone",
      "address.street",
      "address.city",
      "address.state",
      "address.postalCode",
      "address.country",
    ];
    let isFormValid = true;
    for (const field of requiredFields) {
      if (field.startsWith("address.")) {
        const addressKey = field.split(".")[1] as keyof NewCustomer["address"];
        if (!formData.address[addressKey]) {
          isFormValid = false;
          break;
        }
      } else {
        const key = field as keyof NewCustomer;
        if (!formData[key]) {
          isFormValid = false;
          break;
        }
      }
    }

    if (!isFormValid) {
      setStatusMessage({
        type: "error",
        message: "Please fill out all mandatory fields.",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        "https://05zj6qwpx9.execute-api.eu-west-1.amazonaws.com/api/v1/customers/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        // Check for specific error message from the API if available
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      // Log the successful response to the console
      const successData = await response.json();
      console.log("Customer added successfully:", successData);

      // Set a success message
      setStatusMessage({
        type: "success",
        message: "Customer added successfully.",
      });

      // Reset form after successful submission
      setFormData({
        firstName: "",
        lastName: "",
        jobTitle: "",
        company: "",
        email: "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
      });
    } catch (error: any) {
      console.error("Failed to add customer:", error);
      setStatusMessage({
        type: "error",
        message:
          error.message ||
          "Failed to add customer. Please check the API status.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 pb-20">
      <div className="container">
        <a
          href="/"
          className="mb-8 text-indigo-600 font-medium hover:underline flex items-center gap-2"
        >
          &larr; Back to Dashboard
        </a>
        <div className="w-full max-w-2xl mx-auto bg-white shadow-xl rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Add New Customer
          </h1>

          {/* Status Message Display */}
          {statusMessage.message && (
            <div
              className={`p-4 mb-4 rounded-lg flex justify-between items-center ${
                statusMessage.type === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <p className="font-medium">{statusMessage.message}</p>
              <button
                onClick={() => setStatusMessage({ type: null, message: null })}
                className="text-current font-bold"
              >
                &times;
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">
                Personal Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <input
                type="text"
                name="jobTitle"
                placeholder="Job Title"
                value={formData.jobTitle}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                name="company"
                placeholder="Company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">
                Contact Information
              </h2>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Address</h2>
              <input
                type="text"
                name="address.street"
                placeholder="Street Address"
                value={formData.address.street}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="address.city"
                  placeholder="City"
                  value={formData.address.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  name="address.state"
                  placeholder="State"
                  value={formData.address.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="address.postalCode"
                  placeholder="Postal Code"
                  value={formData.address.postalCode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  name="address.country"
                  placeholder="Country"
                  value={formData.address.country}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? "Adding Customer..." : "Add Customer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
