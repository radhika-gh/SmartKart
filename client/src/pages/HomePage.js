import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import Background from "../components/Background";
import CartInput from "../components/CartInput";

const socket = io("http://localhost:8001");

const HomePage = () => {
  const [cart, setCart] = useState(null);

  useEffect(() => {
    socket.on("updateCart", (data) => {
      console.log("Cart Updated:", data);
      setCart(data);
    });

    return () => {
      socket.off("updateCart");
    };
  }, []);

  return (
    <div>
      <Background />
      <CartInput onCartSubmit={setCart} />
      {cart && <p>Cart Loaded: {JSON.stringify(cart)}</p>}
    </div>
  );
};

export default HomePage;
