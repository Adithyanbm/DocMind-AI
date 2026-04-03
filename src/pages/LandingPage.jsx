import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import UseCases from '../components/UseCases';
import Pricing from '../components/Pricing';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.authenticated) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <UseCases />
      <Pricing />
      <Contact />
      <Footer />
    </>
  );
};

export default LandingPage;
