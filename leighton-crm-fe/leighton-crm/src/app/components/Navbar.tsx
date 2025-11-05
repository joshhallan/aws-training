'use client';

import React from 'react';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <a href="/" className="text-2xl font-bold text-gray-800 hover:text-indigo-600 transition-colors duration-200">
            Leighton CRM
          </a>
        </div>
        <div>
          <a 
            href="/add-customer" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
          >
            Add Customer
          </a>
        </div>
      </div>
    </nav>
  );
}
