export const validateToken = (token: string | null): boolean => {
  if (!token) return false;
  
  try {
    // Check if it's a valid JWT format (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Try to decode the payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export const clearInvalidTokens = (): void => {
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('user');
  
  if (!validateToken(token)) {
    console.log('🔄 Clearing invalid tokens...');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }
};

export const getValidToken = (): string | null => {
  const token = localStorage.getItem('auth_token');
  return validateToken(token) ? token : null;
};
