import React from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';

const CONVEX_URL = process.env.VITE_CONVEX_URL!;
const PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY!;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Make sure VITE_CLERK_PUBLISHABLE_KEY is set in your .env.local file.");
}
if (!CONVEX_URL) {
  throw new Error("Missing Convex URL. Make sure VITE_CONVEX_URL is set in your .env.local file.");
}

const convex = new ConvexReactClient(CONVEX_URL);

export const ConvexClientProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
};
