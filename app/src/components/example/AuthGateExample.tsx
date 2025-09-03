"use client";
import React, { useState } from "react";
import { useAuthGate } from "@/hooks/useAuthGate";

export default function AuthGateExample() {
  const { requireAuth, renderLoginModal } = useAuthGate();
  const [status, setStatus] = useState<string | null>(null);

  const handleProtectedAction = async () => {
    await requireAuth(async () => {
      // This will only run if the user is authenticated
      setStatus("🎉 Protected action completed! You're signed in!");
      
      // Simulate some protected operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // You could call an API, update Firestore, etc.
      console.log("User is authenticated, performing protected action...");
    });
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-8 text-white text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold">Protected Action</h3>
          <p className="text-purple-100 mt-2">Requires authentication to proceed</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-4">
              Click the button below to trigger an action that requires authentication.
            </p>
            
            <button
              onClick={handleProtectedAction}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:from-purple-700 hover:to-pink-700 transform hover:scale-[1.02] transition-all duration-200"
            >
              🔒 Perform Protected Action
            </button>
          </div>

          {/* Status Display */}
          {status && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-emerald-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-emerald-800 font-medium">{status}</p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              If you're not signed in, a beautiful login modal will appear automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Render the LoginModal */}
      {renderLoginModal()}
    </div>
  );
}
