import React from "react";
import InvoiceGenerator from "./InvoiceGenerator";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-4xl p-4 bg-white shadow-md rounded-lg">
        <h1 className="text-3xl font-bold text-center mb-6">Invoice Generator</h1>
        <InvoiceGenerator />
      </div>
    </div>
  );
}

export default App;
