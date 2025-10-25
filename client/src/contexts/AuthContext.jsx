import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing user on mount
  useEffect(() => {
    const checkAuth = () => {
      const savedUser = localStorage.getItem("imposter-user");
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          // Check if login is not too old (24 hours)
          const loginTime = userData.loginTime;
          const now = Date.now();
          const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);

          if (hoursSinceLogin < 24) {
            setUser(userData);
          } else {
            // Login expired
            localStorage.removeItem("imposter-user");
            localStorage.removeItem("imposter-session");
            localStorage.removeItem("imposter-showWord");
          }
        } catch (error) {
          console.error("Error parsing saved user:", error);
          localStorage.removeItem("imposter-user");
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (userData) => {
    try {
      // Determine server URL based on current location
      const serverUrl =
        window.location.hostname === "localhost"
          ? "http://localhost:3000"
          : "https://dzlm4fpf-3000.use.devtunnels.ms";

      console.log("Attempting login to:", serverUrl);

      // Show loading message on screen for mobile debugging
      const loadingDiv = document.createElement("div");
      loadingDiv.id = "debug-loading";
      loadingDiv.style.cssText =
        "position:fixed;top:10px;left:10px;background:red;color:white;padding:10px;z-index:9999;font-size:12px;";
      loadingDiv.textContent = `Connecting to: ${serverUrl}`;
      document.body.appendChild(loadingDiv);

      const response = await fetch(`${serverUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Login failed:", errorData);

        // Show error on screen for mobile debugging
        const errorDiv = document.getElementById("debug-loading");
        if (errorDiv) {
          errorDiv.style.background = "red";
          errorDiv.textContent = `Login failed: ${
            errorData.error || "Unknown error"
          }`;
        }

        throw new Error(errorData.error || "Login failed");
      }

      const result = await response.json();

      // Show success on screen for mobile debugging
      const successDiv = document.getElementById("debug-loading");
      if (successDiv) {
        successDiv.style.background = "green";
        successDiv.textContent = `Login successful: ${userData.userId}`;
        setTimeout(() => successDiv.remove(), 2000);
      }

      const userWithTime = {
        ...userData,
        loginTime: Date.now(),
        lastLogin: result.lastLogin,
      };
      localStorage.setItem("imposter-user", JSON.stringify(userWithTime));
      setUser(userWithTime);
    } catch (error) {
      console.error("Login error:", error);

      // Show network error on screen for mobile debugging
      const errorDiv = document.getElementById("debug-loading");
      if (errorDiv) {
        errorDiv.style.background = "red";
        if (error.name === "TypeError" && error.message.includes("fetch")) {
          errorDiv.textContent = "Network Error: Cannot connect to server";
        } else {
          errorDiv.textContent = `Error: ${error.message}`;
        }
      }

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error(
          "Unable to connect to server. Please check your internet connection."
        );
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("imposter-user");
    localStorage.removeItem("imposter-session");
    localStorage.removeItem("imposter-showWord");
    setUser(null);
    navigate("/login");
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
