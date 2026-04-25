import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { login as loginApi, getMe } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(async (username, password) => {
    const res = await loginApi({ username, password });
    const { token: jwt, user: userData } = res.data;
    localStorage.setItem('token', jwt);
    setToken(jwt);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user]);
  const isOperator = useMemo(() => user?.role === 'OPERATOR' || user?.role === 'ADMIN', [user]);
  const isViewer = useMemo(() => !!user, [user]);

  const value = useMemo(
    () => ({ user, token, loading, login, logout, isAdmin, isOperator, isViewer }),
    [user, token, loading, login, logout, isAdmin, isOperator, isViewer]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
