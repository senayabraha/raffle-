import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Marketplace from "@/pages/Marketplace";
import RaffleDetail from "@/pages/RaffleDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/en" replace />} />
        <Route path="/en" element={<Landing />} />
        {/* All authenticated host routes render the dashboard view for now */}
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
