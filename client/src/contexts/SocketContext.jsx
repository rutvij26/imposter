import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Connect to server through dev tunnel
    const serverUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:3000"
        : "https://dzlm4fpf-3000.use.devtunnels.ms";
    const newSocket = io(serverUrl, {
      autoConnect: false, // Don't connect immediately
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("Connected to server:", serverUrl);
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      console.error("Trying to connect to:", serverUrl);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const connect = () => {
    if (socket && !socket.connected) {
      console.log("Manually connecting socket...");
      socket.connect();
    }
  };

  const disconnect = () => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  };

  const value = {
    socket,
    isConnected,
    connectionError,
    connect,
    disconnect,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
