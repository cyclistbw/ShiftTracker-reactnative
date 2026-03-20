
import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email?: string;
}

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error('Error getting current user:', error);
      return null;
    }

    return {
      id: user.id,
      email: user.email
    };
  } catch (err) {
    console.error('Exception getting current user:', err);
    return null;
  }
};

export const requireAuthentication = async (): Promise<string> => {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Authentication required. Please log in to continue.");
  }
  
  return user.id;
};

export const validateUserOwnership = (
  resourceUserId: string, 
  currentUserId: string
): boolean => {
  if (!resourceUserId || !currentUserId) {
    return false;
  }
  
  return resourceUserId === currentUserId;
};

export const sanitizeUserInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Basic sanitization - remove potential SQL injection patterns
  return input
    .replace(/['"`;]/g, '') // Remove quotes and semicolons
    .trim()
    .substring(0, 1000); // Limit length
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// New helper function to ensure user context in all operations
export const withUserContext = async <T>(
  operation: (userId: string) => Promise<T>
): Promise<T> => {
  const userId = await requireAuthentication();
  return await operation(userId);
};
