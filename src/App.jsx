import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          {/* The ambient glow lives at the app root so it powers all backgrounds continuously and beautifully */}
          <div className="ambient-glow"></div>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
