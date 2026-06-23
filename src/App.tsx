import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import CreateRaffle from "@/pages/CreateRaffle";
import EndedRaffle from "@/pages/EndedRaffle";
import Marketplace from "@/pages/Marketplace";
import RaffleDetail from "@/pages/RaffleDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/en" replace />} />
        <Route path="/en" element={<Landing />} />
        {/* Auth */}
        <Route path="/en/login" element={<Login />} />
        <Route path="/en/register" element={<Register />} />
        {/* Host dashboard */}
        <Route path="/en/dashboard/create" element={<CreateRaffle />} />
        <Route path="/en/dashboard/ended" element={<EndedRaffle />} />
        {/* All other authenticated host routes render the dashboard view for now */}
        <Route path="/en/dashboard/*" element={<Dashboard />} />
        {/* Public marketplace */}
        <Route path="/en/public-raffles/live" element={<Marketplace />} />
        <Route path="/en/public-raffles/ended" element={<Marketplace />} />
        <Route path="/en/raffle/:slug" element={<RaffleDetail />} />
        <Route path="*" element={<Navigate to="/en" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
