import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError("Please enter both User ID and Password");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    try {
      setError("");
      await login({
        userId: userId.trim(),
        password: password.trim(),
      });

      // Navigate to home
      navigate("/");
    } catch (error) {
      setError(error.message || "Login failed. Please try again.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError("Please enter both User ID and Password");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    try {
      setError("");
      // Determine server URL based on current location
      const serverUrl =
        window.location.hostname === "localhost"
          ? "http://localhost:3000"
          : "https://dzlm4fpf-3000.use.devtunnels.ms";

      console.log("Attempting registration to:", serverUrl);

      // Show loading message on screen for mobile debugging
      const loadingDiv = document.createElement("div");
      loadingDiv.id = "debug-register";
      loadingDiv.style.cssText =
        "position:fixed;top:50px;left:10px;background:blue;color:white;padding:10px;z-index:9999;font-size:12px;";
      loadingDiv.textContent = `Registering to: ${serverUrl}`;
      document.body.appendChild(loadingDiv);

      const response = await fetch(`${serverUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId.trim(),
          password: password.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Show error on screen for mobile debugging
        const errorDiv = document.getElementById("debug-register");
        if (errorDiv) {
          errorDiv.style.background = "red";
          errorDiv.textContent = `Registration failed: ${
            errorData.error || "Unknown error"
          }`;
        }

        throw new Error(errorData.error || "Registration failed");
      }

      // Show success on screen for mobile debugging
      const successDiv = document.getElementById("debug-register");
      if (successDiv) {
        successDiv.style.background = "green";
        successDiv.textContent = `Registration successful: ${userId.trim()}`;
      }

      // Auto-login after successful registration
      await login({
        userId: userId.trim(),
        password: password.trim(),
      });

      // Navigate to home
      navigate("/");
    } catch (error) {
      // Show network error on screen for mobile debugging
      const errorDiv = document.getElementById("debug-register");
      if (errorDiv) {
        errorDiv.style.background = "red";
        if (error.name === "TypeError" && error.message.includes("fetch")) {
          errorDiv.textContent = "Network Error: Cannot connect to server";
        } else {
          errorDiv.textContent = `Error: ${error.message}`;
        }
      }

      setError(error.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-400 mb-2">
            Imposter Game
          </h1>
          <p className="text-slate-400">Please login to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Enter your User ID"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Enter your Password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
              <p className="text-red-300 text-center">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Login
            </button>
            <button
              type="button"
              onClick={handleRegister}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Register New Account
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            This helps maintain your connection across sessions
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
