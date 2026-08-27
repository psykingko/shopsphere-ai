import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    principal: null,
    isLoading: true
  });

  const checkSession = async () => {
    try {
      const response = await fetch('/api/v1/auth/session');
      if (response.ok) {
        const data = await response.json();
        setAuthState({
          isAuthenticated: true,
          principal: data.principal,
          isLoading: false
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          principal: null,
          isLoading: false
        });
      }
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        principal: null,
        isLoading: false
      });
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email, password) => {
    let response;
    try {
      response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
    } catch (networkError) {
      throw new Error('Network error: Unable to reach the server.');
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(`Server returned an invalid response (Status: ${response.status}). Is the backend running?`);
    }

    if (!response.ok) {
      throw new Error(data?.error?.message || 'Authentication failed');
    }

    setAuthState({
      isAuthenticated: true,
      principal: data.principal,
      isLoading: false
    });
  };

  const logout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    setAuthState({
      isAuthenticated: false,
      principal: null,
      isLoading: false
    });
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
