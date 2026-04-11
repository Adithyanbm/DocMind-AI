import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const MotionDemo = () => {
  const [isVisible, setIsVisible] = useState(true);
const [selectedItem, setSelectedItem] = useState(null);
const items = [
    { id: 1, color: '#FF6B6B', label: 'Bounce' },
    { id: 2, color: '#4ECDC4', label: 'Scale' },
    { id: 3, color: '#45B7D1', label: 'Rotate' },
    { id: 4, color: '#96CEB4', label: 'Slide' },
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>✨ React Motion Demo</h1>
      
      {/* Animated Button */}
      <motion.button
        style={styles.button}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsVisible(!isVisible)}
      >
        {isVisible ? 'Hide' : 'Show'} Element
      </motion.button>

      {/* AnimatePresence Demo */}
      <div style={styles.section}>
        <h2 style={styles.subtitle}>AnimatePresence - Fade In/Out</h2>
        <AnimatePresence>
          {isVisible && (
            <motion.div
              style={styles.box}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              I'm animated with AnimatePresence!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Staggered List Animation */}
      <div style={styles.section}>
        <h2 style={styles.subtitle}>Staggered List Animation</h2>
        <div style={styles.list}>
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              style={{ ...styles.item, backgroundColor: item.color }}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, rotate: 3 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedItem(item.id)}
            >
              {item.label}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Interactive Cards */}
      <div style={styles.section}>
        <h2 style={styles.subtitle}>Interactive Cards</h2>
        <div style={styles.cardsContainer}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              style={{
                ...styles.card,
                backgroundColor: item.color,
                border: selectedItem === item.id ? '3px solid #333' : '3px solid transparent'
              }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              whileHover={{
                y: -10,
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
              }}
              onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
            >
              <span style={styles.cardLabel}>{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Spring Animation */}
      <div style={styles.section}>
        <h2 style={styles.subtitle}>Spring Physics Animation</h2>
        <motion.div
          style={styles.springBox}
          drag
          dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
        >
          Drag Me!
        </motion.div>
      </div>
    </div>
  );
};
const styles = {
  container: {
    minHeight: '100vh',
    padding: '40px',
    backgroundColor: '#1a1a2e',
    fontFamily: 'Arial, sans-serif',
    color: '#fff',
  },
  title: {
    textAlign: 'center',
    fontSize: '2.5rem',
    marginBottom: '40px',
    background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '20px',
    color: '#aaa',
  },
  button: {
    display: 'block',
    margin: '0 auto 40px',
    padding: '12px 30px',
    fontSize: '1rem',
    backgroundColor: '#4ECDC4',
    color: '#fff',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: '40px',
    padding: '20px',
    backgroundColor: '#16213e',
    borderRadius: '15px',
  },
  box: {
    padding: '20px',
    backgroundColor: '#FF6B6B',
    borderRadius: '10px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  list: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  item: {
    padding: '15px 25px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: '#fff',
  },
  cardsContainer: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    width: '120px',
    height: '120px',
    borderRadius: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
    fontWeight: 'bold',
  },
  cardLabel: {
    fontSize: '0.9rem',
  },
  springBox: {
    width: '150px',
    height: '80px',
    backgroundColor: '#96CEB4',
    borderRadius: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 auto',
  },
};
export default MotionDemo;