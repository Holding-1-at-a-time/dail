
import React from 'react';

const VITE_CONVEX_URL = process.env.VITE_CONVEX_URL;
const VITE_CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY;
const VITE_STRIPE_PUBLISHABLE_KEY = process.env.VITE_STRIPE_PUBLISHABLE_KEY;

const requiredFrontendVars = {
  VITE_CONVEX_URL,
  VITE_CLERK_PUBLISHABLE_KEY,
  VITE_STRIPE_PUBLISHABLE_KEY,
};

const requiredBackendVars = [
  'CLERK_JWT_ISSUER_DOMAIN',
  'CLERK_WEBHOOK_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'API_KEY (for Google GenAI)',
  'EMAIL_API_KEY (for Resend)',
  'EMAIL_FROM_ADDRESS',
];

const DevEnvWarning = () => {
  const missingVars = Object.entries(requiredFrontendVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-red-900/90 text-white z-[9999] flex items-center justify-center p-8">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-3xl w-full border-2 border-red-500">
        <h1 className="text-3xl font-bold text-red-400 mb-4">Configuration Error</h1>
        <p className="text-lg text-gray-300 mb-6">
          Your application is missing some required environment variables. Please create a `.env.local` file in the root of your project and add the following:
        </p>
        <div className="bg-gray-900 p-4 rounded-md mb-6">
          <h2 className="font-semibold text-red-300 mb-2">Missing Frontend Variables:</h2>
          <pre className="text-red-300 whitespace-pre-wrap">
            {missingVars.map(v => `${v}=YOUR_VALUE_HERE`).join('\n')}
          </pre>
        </div>
        <p className="text-lg text-gray-300 mb-4">
          Additionally, ensure the following environment variables are set in your Convex project dashboard under "Settings" -&gt; "Environment Variables":
        </p>
         <div className="bg-gray-900 p-4 rounded-md">
          <h2 className="font-semibold text-yellow-300 mb-2">Required Backend Variables (in Convex):</h2>
          <pre className="text-yellow-300 whitespace-pre-wrap">
            {requiredBackendVars.join('\n')}
          </pre>
        </div>
        <p className="text-sm text-gray-500 mt-6">The application will not function correctly until these variables are set.</p>
      </div>
    </div>
  );
};

export default DevEnvWarning;
