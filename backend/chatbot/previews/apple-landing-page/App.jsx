import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

const AppleLandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      const sections = document.querySelectorAll('section');
      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
          setActiveSection(index);
        }
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = ['Store', 'Mac', 'iPad', 'iPhone', 'Watch', 'AirPods', 'TV & Home'];

  return (
    <div ref={containerRef} className="min-h-screen bg-white text-black font-sans overflow-x-hidden">
      {/* Navigation */}
      <motion.nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <span className="text-xl font-semibold">Apple</span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item, index) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm text-gray-800 hover:text-gray-500 transition-colors"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.1 }}
              >
                {item}
              </motion.a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              className="hidden md:block p-2 rounded-full hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </motion.button>
            <motion.button
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-white z-40 pt-20"
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-6 py-4">
              {navItems.map((item, index) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="block py-4 text-2xl font-light border-b border-gray-100"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item}
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-30"
            animate={{ 
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-30"
            animate={{ 
              x: [0, -100, 0],
              y: [0, -50, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="text-sm font-medium text-orange-500 mb-4 block">New</span>
            <h1 className="text-6xl md:text-8xl font-bold mb-4 tracking-tight">
              iPhone 15 Pro
            </h1>
            <p className="text-2xl md:text-3xl text-gray-600 mb-8 font-light">
              Titanium. So strong. So light. So Pro.
            </p>
            <div className="flex items-center justify-center gap-4 mb-12">
              <motion.button
                className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Learn more
              </motion.button>
              <motion.button
                className="text-blue-600 px-8 py-3 rounded-full font-medium hover:bg-blue-50 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Buy
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 100, rotateX: -30 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.5, type: "spring" }}
          >
            <motion.div
              className="w-64 h-64 md:w-96 md:h-96 mx-auto"
              animate={{ 
                y: [0, -20, 0],
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="w-full h-full rounded-[3rem] bg-gradient-to-br from-gray-200 to-gray-400 shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="w-11/12 h-11/12 rounded-[2.5rem] bg-black flex items-center justify-center">
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                      <motion.div
                        className="text-white text-6xl font-bold"
                        animate={{ 
                          backgroundPosition: ['0% 0%', '100% 100%'],
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                        style={{
                          background: 'linear-gradient(45deg, #fff, #87CEEB, #fff)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        📱
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-gray-300 flex justify-center pt-2">
            <motion.div 
              className="w-1 h-2 bg-gray-400 rounded-full"
              animate={{ opacity: [1, 0], y: [0, 10] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Second Hero Section */}
      <section className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
        <motion.div 
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white to-gray-50" />
        </motion.div>

        <div className="relative z-10 text-center px-6">
          <motion.h2
            className="text-5xl md:text-7xl font-bold mb-6"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            MacBook Pro
          </motion.h2>
          <motion.p
            className="text-xl md:text-2xl text-gray-600 mb-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Supercharged by M3 Pro and M3 Max.
          </motion.p>
          
          <motion.div
            className="relative w-full max-w-4xl mx-auto h-64 md:h-96"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden">
              <div className="text-center">
                <motion.div
                  className="text-8xl mb-4"
                  animate={{ 
                    rotateY: [0, 360],
                  }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                >
                  💻
                </motion.div>
                <div className="text-gray-500 font-light">M3 Pro</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Which Apple product is right for you?
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '📱', name: 'iPhone 15 Pro', price: 'From $999', color: 'from-gray-100 to-gray-200' },
              { icon: '⌚', name: 'Apple Watch', price: 'From $399', color: 'from-red-100 to-red-200' },
              { icon: '🎧', name: 'AirPods Pro', price: 'From $249', color: 'from-white to-gray-100' },
              { icon: '📱', name: 'iPad Pro', price: 'From $799', color: 'from-blue-100 to-blue-200' },
            ].map((product, index) => (
              <motion.div
                key={product.name}
                className={`bg-gradient-to-br ${product.color} rounded-3xl p-8 text-center cursor-pointer group`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
                }}
              >
                <motion.div 
                  className="text-6xl mb-6"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {product.icon}
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                <p className="text-gray-600">{product.price}</p>
                <motion.button
                  className="mt-4 bg-black text-white px-6 py-2 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Buy
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Innovation at its finest.</h2>
            <p className="text-xl text-gray-600">Designed to change the way you experience technology.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'A17 Pro', desc: 'The most powerful chip ever in a smartphone.', icon: '⚡' },
              { title: 'Titanium Design', desc: 'Aerospace-grade titanium for a lighter, stronger device.', icon: '🔧' },
              { title: 'Pro Camera', desc: '48MP main camera with computational photography.', icon: '📷' },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                className="bg-white rounded-3xl p-8 shadow-lg"
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
              >
                <motion.div
                  className="text-4xl mb-4"
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="text-6xl mb-8"
              animate={{ 
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ✨
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-light mb-8 leading-relaxed">
              "Apple products have transformed the way I work and create. 
              The seamless integration between devices makes everything just work."
            </h2>
            <p className="text-gray-500">— Sarah Chen, Creative Director</p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-black text-white relative overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
            }}
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </motion.div>

        <div className="relative z-10 text-center px-6">
          <motion.h2
            className="text-4xl md:text-6xl font-bold mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Ready to switch?
          </motion.h2>
          <motion.p
            className="text-xl text-gray-400 mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Visit an Apple Store near you or shop online.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <motion.button
              className="bg-blue-600 text-white px-10 py-4 rounded-full font-medium text-lg"
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)' }}
              whileTap={{ scale: 0.95 }}
            >
              Find a Store
            </motion.button>
            <motion.button
              className="text-white px-10 py-4 rounded-full font-medium text-lg border border-white/20 hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Shop Online
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
            {[
              { title: 'Shop', items: ['Mac', 'iPad', 'iPhone', 'Watch', 'AirPods'] },
              { title: 'Services', items: ['Apple Music', 'Apple TV+', 'Apple Arcade', 'iCloud'] },
              { title: 'Account', items: ['Manage Your ID', 'Apple Store Account', 'iCloud.com'] },
              { title: 'Apple Store', items: ['Find a Store', 'Genius Bar', 'Today at Apple', 'Camp'] },
              { title: 'For Business', items: ['Apple and Business', 'Shop for Business'] },
              { title: 'About Apple', items: ['Newsroom', 'Apple Leadership', 'Career Opportunities', 'Investors'] },
            ].map((column, index) => (
              <motion.div
                key={column.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <h3 className="font-semibold mb-4">{column.title}</h3>
                <ul className="space-y-2">
                  {column.items.map((item) => (
                    <li key={item}>
                      <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              Copyright © 2024 Apple Inc. All rights reserved.
            </p>
            <div className="flex gap-6">
              {['Privacy Policy', 'Terms of Use', 'Sales and Refunds', 'Legal'].map((item) => (
                <a key={item} href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-blue-600 z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />
    </div>
  );
};

export default AppleLandingPage;