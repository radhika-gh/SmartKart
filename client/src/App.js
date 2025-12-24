import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import PaymentPage from "./pages/PaymentPage";
import RFIDMonitorPage from "./pages/RFIDMonitorPage"; 

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cart/:cartId" element={<CartPage />} /> {/* ✅ Dynamic Route */}
        <Route path="/payment/:cartId" element={<PaymentPage />} /> {/* ✅ Payment Route */}
        <Route path="/rfid-monitor" element={<RFIDMonitorPage />} /> {/* ✅ RFID Monitor Route */}
      </Routes>
    </Router>
  );
};

export default App;
