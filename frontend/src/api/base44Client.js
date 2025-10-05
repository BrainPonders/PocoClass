import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68d8e2251155399b9de64f0e", 
  requiresAuth: true // Ensure authentication is required for all operations
});
