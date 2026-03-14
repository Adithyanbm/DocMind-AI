import React, { useState } from 'react';
import { Scale, HeartPulse, PieChart } from 'lucide-react';
import './UseCases.css';

const useCasesData = [
  {
    id: 'legal',
    title: 'Legal & Compliance',
    icon: <Scale size={24} />,
    color: 'var(--accent-blue)',
    description: 'Instantly identify favorable terms, hidden liabilities, and non-standard clauses across thousands of contracts.',
    stats: [
      { label: 'Time saved on review', value: '85%' },
      { label: 'Risk identification', value: '3x faster' }
    ],
    imageAlt: 'Legal Document Analysis UI Concept'
  },
  {
    id: 'healthcare',
    title: 'Healthcare & Pharma',
    icon: <HeartPulse size={24} />,
    color: '#10b981',
    description: 'Synthesize patient records, clinical trial data, and medical literature to accelerate research and diagnosis.',
    stats: [
      { label: 'Data extraction accuracy', value: '99.9%' },
      { label: 'Faster trial matching', value: '40%' }
    ],
    imageAlt: 'Medical Records Extraction Concept'
  },
  {
    id: 'finance',
    title: 'Financial Services',
    icon: <PieChart size={24} />,
    color: 'var(--accent-purple)',
    description: 'Analyze earnings reports, parse SEC filings, and automate loan document processing in real-time.',
    stats: [
      { label: 'Processing speed', value: '< 1 sec/doc' },
      { label: 'Manual entry reduction', value: '95%' }
    ],
    imageAlt: 'Financial SEC Filing Report Concept'
  }
];

const UseCases = () => {
  const [activeTab, setActiveTab] = useState(useCasesData[0]);

  return (
    <section className="use-cases-section" id="use-cases">
      <div className="use-cases-container">
        <div className="use-cases-header animate-fade-up">
          <h2 className="section-title">Built for complex domains</h2>
          <p className="section-subtitle">
            Whether you are reviewing contracts or clinical trials, DocMind AI adapts to your industry's specific language.
          </p>
        </div>

        <div className="use-cases-content animate-fade-up delay-100">
          <div className="use-cases-sidebar">
            {useCasesData.map((useCase) => (
              <button
                key={useCase.id}
                className={`tab-btn ${activeTab.id === useCase.id ? 'active' : ''}`}
                onClick={() => setActiveTab(useCase)}
              >
                <div 
                  className="tab-icon" 
                  style={{ 
                    color: activeTab.id === useCase.id ? useCase.color : 'var(--text-muted)',
                    backgroundColor: activeTab.id === useCase.id ? `color-mix(in srgb, ${useCase.color} 15%, transparent)` : 'transparent'
                  }}
                >
                  {useCase.icon}
                </div>
                <div className="tab-text">
                  <span className="tab-title">{useCase.title}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="use-case-display glass-card">
            <div className="use-case-info">
              <h3 className="use-case-title">{activeTab.title}</h3>
              <p className="use-case-description">{activeTab.description}</p>
              
              <div className="use-case-stats">
                {activeTab.stats.map((stat, idx) => (
                  <div key={idx} className="use-case-stat">
                    <span className="stat-number" style={{ color: activeTab.color }}>{stat.value}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="use-case-visual" style={{ borderColor: `color-mix(in srgb, ${activeTab.color} 30%, transparent)` }}>
               {/* Abstract visual representation instead of a real image to keep it self-contained */}
               <div className="abstract-ui" style={{ '--ui-color': activeTab.color }}>
                  <div className="ui-header"></div>
                  <div className="ui-body">
                    <div className="ui-line ui-full"></div>
                    <div className="ui-line ui-full"></div>
                    <div className="ui-box">
                      <div className="ui-minibox"></div>
                      <div className="ui-minibox"></div>
                    </div>
                    <div className="ui-line ui-half"></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UseCases;
