import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import PaymentPage from "./pages/PaymentPage"; 

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cart/:cartId" element={<CartPage />} /> {/* ✅ Dynamic Route */}
        <Route path="/payment/:cartId" element={<PaymentPage />} /> {/* ✅ Payment Route */}
      </Routes>
    </Router>
  );
};

export default App;
