import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Typography, Space, Modal, message } from 'antd';
import { 
  PartyPopperOutlined, 
  GiftOutlined, 
  CakeOutlined, 
  StarOutlined,
  HeartOutlined,
  SmileOutlined,
  SendOutlined
} from '@ant-design/icons';
import { theme } from 'antd';
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Confetti Component
const Confetti = ({ active }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        color: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'][Math.floor(Math.random() * 5)],
      }));
      setParticles(newParticles);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div style={styles.confettiContainer}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          style={{
            ...styles.confettiParticle,
            left: `${particle.left}%`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// Balloon Component
const Balloon = ({ color, delay, left }) => (
  <div
    style={{
      ...styles.balloon,
      backgroundColor: color,
      animationDelay: `${delay}s`,
      left: `${left}%`,
    }}
  >
    <div style={styles.balloonString} />
  </div>
);

// Main Birthday App
const BirthdayWishes = () => {
  const [name, setName] = useState('');
const [wish, setWish] = useState('');
const [showCelebration, setShowCelebration] = useState(false);
const [messages, setMessages] = useState([
    { id: 1, name: 'Emma', wish: 'Happy Birthday! Have a magical day! 🎉', time: 'Just now' },
    { id: 2, name: 'Tommy', wish: 'Wishing you lots of fun and cake! 🎂', time: '5 min ago' },
    { id: 3, name: 'Sarah', wish: 'Best birthday ever! 🎈', time: '10 min ago' },
  ]);
const [isModalOpen, setIsModalOpen] = useState(false);
const { token } = theme.useToken();
const handleSubmit = () => {
    if (!name.trim() || !wish.trim()) {
      message.warning('Please fill in both name and wish!');
      return;
    }
const newMessage = {
      id: Date.now(),
      name: name,
      wish: wish,
      time: 'Just now',
    };

    setMessages([newMessage, ...messages]);
    setName('');
    setWish('');
    setShowCelebration(true);
    message.success('Your wish has been sent! 🎉');

    setTimeout(() => setShowCelebration(false), 3000);
  };
const balloons = [
    { color: '#ff6b6b', delay: 0, left: 10 },
    { color: '#4ecdc4', delay: 1, left: 25 },
    { color: '#ffe66d', delay: 2, left: 40 },
    { color: '#95e1d3', delay: 3, left: 55 },
    { color: '#f38181', delay: 4, left: 70 },
    { color: '#ff9ff3', delay: 5, left: 85 },
  ];

  return (
    <div style={styles.container}>
      <Confetti active={showCelebration} />
      
      {/* Header Section */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <PartyPopperOutlined style={styles.headerIcon} />
          <Title style={styles.title}>🎉 Happy Birthday! 🎂</Title>
          <Text style={styles.subtitle}>Make a wish and celebrate!</Text>
        </div>
      </div>

      {/* Balloons Animation */}
      <div style={styles.balloonContainer}>
        {balloons.map((balloon, index) => (
          <Balloon key={index} {...balloon} />
        ))}
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Send Wish Card */}
        <Card style={styles.card} title={<><CakeOutlined /> Send Birthday Wish</>}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Your Name:</label>
            <Input
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              size="large"
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Your Wish:</label>
            <TextArea
              placeholder="Write your birthday wish..."
              value={wish}
              onChange={(e) => setWish(e.target.value)}
              style={styles.textArea}
              rows={4}
              size="large"
            />
          </div>

          <Button
            type="primary"
            size="large"
            onClick={handleSubmit}
            style={styles.button}
            icon={<SendOutlined />}
          >
            Send Wish 🎁
          </Button>
        </Card>

        {/* Messages Card */}
        <Card style={styles.card} title={<><HeartOutlined /> Birthday Messages</>}>
          <div style={styles.messagesContainer}>
            {messages.map((msg) => (
              <div key={msg.id} style={styles.messageItem}>
                <div style={styles.messageHeader}>
                  <Space>
                    <AvatarIcon />
                    <Text strong>{msg.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{msg.time}</Text>
                  </Space>
                </div>
                <Paragraph style={styles.messageText}>{msg.wish}</Paragraph>
              </div>
            ))}
          </div>
        </Card>

        {/* Fun Stats Card */}
        <Card style={styles.card} title={<><StarOutlined /> Party Stats</>}>
          <div style={styles.statsContainer}>
            <div style={styles.statItem}>
              <SmileOutlined style={styles.statIcon} />
              <Text strong>24</Text>
              <Text> Wishes</Text>
            </div>
            <div style={styles.statItem}>
              <PartyPopperOutlined style={styles.statIcon} />
              <Text strong>156</Text>
              <Text> Celebrations</Text>
            </div>
            <div style={styles.statItem}>
              <GiftOutlined style={styles.statIcon} />
              <Text strong>89</Text>
              <Text> Gifts</Text>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <Text style={styles.footerText}>
          Made with ❤️ for special birthday celebrations
        </Text>
      </div>
    </div>
  );
};

// Helper component for avatar
const AvatarIcon = () => (
  <div style={styles.avatarIcon}>
    <SmileOutlined />
  </div>
);

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '30px',
    marginBottom: '24px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: {
    fontSize: '48px',
    color: '#667eea',
  },
  title: {
    margin: '0',
    fontSize: '42px',
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '18px',
    color: '#666',
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  inputGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    width: '100%',
  },
  textArea: {
    width: '100%',
    resize: 'none',
  },
  button: {
    width: '100%',
    height: '50px',
    fontSize: '18px',
    fontWeight: '600',
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    border: 'none',
  },
  messagesContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  messageItem: {
    padding: '16px',
    borderBottom: '1px solid #f0f0f0',
    background: '#fafafa',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  messageHeader: {
    marginBottom: '8px',
  },
  messageText: {
    margin: 0,
    fontSize: '15px',
    color: '#333',
  },
  statsContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '20px 0',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  statIcon: {
    fontSize: '32px',
    color: '#667eea',
  },
  footer: {
    textAlign: 'center',
    padding: '30px',
    marginTop: '24px',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '16px',
  },
  confettiContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1000,
  },
  confettiParticle: {
    position: 'absolute',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    animation: 'fall 3s linear infinite',
  },
  balloonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '200px',
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  balloon: {
    position: 'absolute',
    bottom: '-50px',
    width: '40px',
    height: '50px',
    borderRadius: '50%',
    animation: 'float 6s ease-in-out infinite',
  },
  balloonString: {
    position: 'absolute',
    bottom: '-20px',
    left: '50%',
    width: '2px',
    height: '20px',
    background: 'rgba(0, 0, 0, 0.3)',
    transform: 'translateX(-50%)',
  },
  avatarIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
};

// Add keyframe animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fall {
    0% {
      transform: translateY(-100vh) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-20px);
    }
  }
`;
document.head.appendChild(style);
export default BirthdayWishes;