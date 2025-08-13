import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/homepage.css";
import { useNavigate } from "react-router-dom";

// Store images for the hero carousel
const storeImages = [
  `${process.env.PUBLIC_URL}/images/image1.jpg`,
  `${process.env.PUBLIC_URL}/images/image2.jpg`,
  `${process.env.PUBLIC_URL}/images/image3.jpg`,
  `${process.env.PUBLIC_URL}/images/image4.jpg`,
  `${process.env.PUBLIC_URL}/images/image5.jpg`,
  `${process.env.PUBLIC_URL}/images/image6.jpg`,
  `${process.env.PUBLIC_URL}/images/image7.jpg`,
  `${process.env.PUBLIC_URL}/images/image8.jpg`,
  `${process.env.PUBLIC_URL}/images/image9.jpg`,
];

// Popular products data with names matching the actual images
const popularProducts = [
  {
    id: 1,
    name: "Blueberry Cheesecake",
    category: "DESSERTS",
    price: 12.99,
    originalPrice: 18.99,
    discount: 29,
    rating: 4.8,
    image: `${process.env.PUBLIC_URL}/images/pop1.jpg`
  },
  {
    id: 2,
    name: "Premium Coffee Beans",
    category: "BEVERAGES",
    price: 15.99,
    originalPrice: 19.99,
    discount: 19,
    rating: 4.9,
    image: `${process.env.PUBLIC_URL}/images/pop2.jpg`
  },
  {
    id: 3,
    name: "Artisan Whole Grain Bread",
    category: "BAKERY",
    price: 4.49,
    originalPrice: 5.99,
    discount: 22,
    rating: 4.7,
    image: `${process.env.PUBLIC_URL}/images/pop3.jpg`
  },
  {
    id: 4,
    name: "Fresh Garden Salad Mix",
    category: "FRESH PRODUCE",
    price: 8.99,
    originalPrice: 11.99,
    discount: 25,
    rating: 4.6,
    image: `${process.env.PUBLIC_URL}/images/pop4.jpg`
  },
  {
    id: 5,
    name: "Organic Whole Milk",
    category: "DAIRY",
    price: 3.99,
    originalPrice: 5.49,
    discount: 25,
    rating: 4.8,
    image: `${process.env.PUBLIC_URL}/images/pop5.jpg`
  },
  {
    id: 6,
    name: "Fresh Atlantic Salmon",
    category: "SEAFOOD",
    price: 24.99,
    originalPrice: 31.99,
    discount: 20,
    rating: 4.9,
    image: `${process.env.PUBLIC_URL}/images/pop6.jpg`
  },
  {
    id: 7,
    name: "Tropical Fruit Tart",
    category: "DESSERTS",
    price: 14.99,
    originalPrice: 19.99,
    discount: 25,
    rating: 4.5,
    image: `${process.env.PUBLIC_URL}/images/pop7.jpg`
  },
  {
    id: 8,
    name: "Gourmet Coffee Beans",
    category: "BEVERAGES",
    price: 18.99,
    originalPrice: 24.99,
    discount: 23,
    rating: 4.7,
    image: `${process.env.PUBLIC_URL}/images/pop8.jpg`
  }
];

const CARDS_PER_SLIDE = 5;

const HomePage = () => {
  const [cartId, setCartId] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentStoreImage, setCurrentStoreImage] = useState(0);
  const navigate = useNavigate();

  // Store images carousel auto-scroll
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStoreImage((prev) => (prev + 1) % storeImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Cart Claim Logic
  const handleCartSubmit = async () => {
    if (!cartId.trim()) {
      alert("Please enter a cart ID");
      return;
    }
    
    try {
      const response = await axios.post(
        "http://localhost:8001/api/shop/claim",
        { cartId },
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("Cart Claimed:", response.data);
      navigate(`/cart/${cartId}`);
    } catch (error) {
      console.error(
        "Error fetching cart:",
        error?.response?.data || error.message
      );
      alert(error.response?.data?.error || "Something went wrong!");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCartSubmit();
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.ceil(popularProducts.length / CARDS_PER_SLIDE));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + Math.ceil(popularProducts.length / CARDS_PER_SLIDE)) % Math.ceil(popularProducts.length / CARDS_PER_SLIDE));
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="homepage">
      {/* Header */}
      <header className="header">
        <div className="logo-container">
          <div className="logo-icon">
            {/* Minimal cart icon (Feather Icons style) */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.98-1.75l1.22-7.36a1 1 0 00-.98-1.25H5.12" />
            </svg>
          </div>
          <h1 className="logo-text">SmartKart</h1>
        </div>
        <div className="tagline">
          <span className="tagline-icon">⚡</span>
          <span className="tagline-text">Experience the Future of Shopping</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text-content">            
            <h1 className="hero-title">
              Welcome to <span className="brand-highlight">SmartKart</span>
            </h1>
            
            <p className="hero-subtitle">
              Enter your cart ID to unlock a world of smart shopping possibilities.
            </p>

            <div className="cart-input-container">
              <div className="input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Enter Cart ID"
                  value={cartId}
                  onChange={(e) => setCartId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="cart-input"
                />
              </div>
              <button onClick={handleCartSubmit} className="start-button">
                Start Your Journey <span className="button-arrow">→</span>
              </button>
            </div>
          </div>

          <div className="hero-image-content">
            <div className="store-carousel">
              {storeImages.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Store image ${index + 1}`}
                  className={`store-image ${index === currentStoreImage ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Products Carousel Section */}
      <section className="popular-section">
        <div className="section-header">
          <h2 className="section-title">Popular Products</h2>
        </div>

        <div className="carousel-container">
          <div className="carousel-wrapper">
            <div 
              className="carousel-track"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {Array.from({ length: Math.ceil(popularProducts.length / CARDS_PER_SLIDE) }).map((_, slideIndex) => (
                <div key={slideIndex} className="carousel-slide">
                  <div className="products-grid">
                    {popularProducts
                      .slice(slideIndex * CARDS_PER_SLIDE, slideIndex * CARDS_PER_SLIDE + CARDS_PER_SLIDE)
                      .map((product) => (
                        <div key={product.id} className="product-card">
                          <div className="discount-badge">{product.discount}% OFF</div>
                          <div className="product-image-container">
                            <img src={product.image} alt={product.name} className="product-image" />
                            <button className="add-button">+</button>
                          </div>
                          <div className="product-info">
                            <div className="product-category-rating">
                              <span className="product-category">{product.category}</span>
                              <div className="product-rating">
                                <span className="star">⭐</span>
                                <span className="rating-value">{product.rating}</span>
                              </div>
                            </div>
                            <h3 className="product-name">{product.name}</h3>
                            <div className="product-pricing">
                              <span className="current-price">${product.price.toFixed(2)}</span>
                              <span className="original-price">${product.originalPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button className="carousel-btn next-btn" onClick={nextSlide}>
            <span>›</span>
          </button>
        </div>

        {/* Carousel Indicators */}
        <div className="carousel-indicators">
          {Array.from({ length: Math.ceil(popularProducts.length / CARDS_PER_SLIDE) }).map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
