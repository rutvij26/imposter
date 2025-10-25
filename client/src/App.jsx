import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SocketProvider } from "./contexts/SocketContext";
import { GameProvider } from "./contexts/GameContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Login from "./pages/Login";

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <GameProvider>
            <div className="min-h-screen bg-slate-900 text-slate-100">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Home />} />
                <Route path="/lobby" element={<Lobby />} />
                <Route path="/game" element={<Game />} />
              </Routes>
            </div>
          </GameProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
