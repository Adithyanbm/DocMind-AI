import React from 'react';
import { Search, Zap, Layers, Lock, FileJson, TrendingUp } from 'lucide-react';
import './Features.css';

const featureList = [
  {
    icon: <Search size={24} />,
    title: 'Semantic Search',
    description: 'Find exactly what you need, even if you do not use the exact keywords. Understands context, intent, and relationships.',
    color: 'var(--accent-blue)'
  },
  {
    icon: <Zap size={24} />,
    title: 'Instant Summarization',
    description: 'Turn 100-page scientific papers or legal contracts into concise, actionable summaries in seconds.',
    color: 'var(--accent-purple)'
  },
  {
    icon: <Layers size={24} />,
    title: 'Multi-Doc Synthesis',
    description: 'Ask questions across your entire knowledge base simultaneously. Compare contracts or find contradictions instantly.',
    color: 'var(--primary)'
  },
  {
    icon: <Lock size={24} />,
    title: 'Enterprise Security',
    description: 'SOC2 Type II compliant. Your data is isolated, encrypted, and never used to train public language models.',
    color: '#10b981'
  },
  {
    icon: <FileJson size={24} />,
    title: 'Structured Extraction',
    description: 'Automatically pull key-value pairs, tables, and specific data points into JSON or CSV formats.',
    color: '#f59e0b'
  },
  {
    icon: <TrendingUp size={24} />,
    title: 'Continuous Learning',
    description: 'The more you use it, the better it understands your specific domain terminology and company conventions.',
    color: '#ef4444'
  }
];

const Features = () => {
  return (
    <section className="features-section" id="features">
      <div className="features-container">
        <div className="features-header animate-fade-up">
          <h2 className="features-title">Everything you need to master your data</h2>
          <p className="features-subtitle">
            Say goodbye to endless scrolling. Our AI reads, comprehends, and connects the dots across your entire document repository.
          </p>
        </div>

        <div className="features-grid">
          {featureList.map((feature, index) => (
            <div 
              className={`feature-card glass-card animate-fade-up delay-${(index % 3 + 1) * 100}`} 
              key={index}
            >
              <div 
                className="feature-icon-wrapper"
                style={{ color: feature.color, backgroundColor: `color-mix(in srgb, ${feature.color} 15%, transparent)` }}
              >
                {feature.icon}
              </div>
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
