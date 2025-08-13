import React, { useState } from "react";
import "./ShoppingChecklist.css";

const ShoppingChecklist = ({ isVisible, onClose }) => {
  const [items, setItems] = useState([
    { id: 1, name: "Milk", checked: false },
    { id: 2, name: "Bread", checked: true },
    { id: 3, name: "Eggs", checked: false },
  ]);
  const [newItem, setNewItem] = useState("");

  const handleToggle = (id) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([
        ...items,
        { id: Date.now(), name: newItem.trim(), checked: false },
      ]);
      setNewItem("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAddItem();
    }
  };

  const handleDelete = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <div
      className={`checklist-overlay ${isVisible ? "visible" : ""}`}
      onClick={onClose} // Close when clicking the backdrop
    >
      <div className="checklist-diary" onClick={(e) => e.stopPropagation()}>
        <div className="checklist-header">
          <h2>Shopping Checklist</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="checklist-body">
          <div className="add-item-container">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a new item..."
              className="add-item-input"
            />
            <button onClick={handleAddItem} className="add-item-btn">
              +
            </button>
          </div>
          <ul className="checklist-items">
            {items.map((item) => (
              <li
                key={item.id}
                className={`checklist-item ${item.checked ? "checked" : ""}`}
              >
                <div
                  className="checkbox"
                  onClick={() => handleToggle(item.id)}
                >
                  {item.checked && <span className="checkmark">✔</span>}
                </div>
                <span className="item-name">{item.name}</span>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(item.id)}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ShoppingChecklist;
