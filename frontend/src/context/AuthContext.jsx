import { useEffect, useState } from "react";
import { api } from "../utils/api.js";
import { AuthContext } from "../utils/auth.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api
      .get("/profile")
      .then(({ data }) => {
        if (active) setUser(data);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (credentials) => {
    const { data } = await api.post("/login", credentials);
    setUser(data);
    return data;
  };

  const signUp = (details) => api.post("/signup", details);

  const logout = async () => {
    try {
      await api.post("/logout");
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signUp, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
