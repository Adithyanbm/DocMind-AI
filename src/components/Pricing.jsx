import React from 'react';
import { Check } from 'lucide-react';
import './Pricing.css';

const pricingTiers = [
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    description: 'Perfect for small teams and individual professionals.',
    features: [
      'Up to 1,000 documents/mo',
      'Semantic Search',
      'Basic Summarization',
      'Standard Support'
    ],
    buttonText: 'Start Free Trial',
    buttonClass: 'btn-ghost',
    popular: false
  },
  {
    name: 'Pro',
    price: '$199',
    period: '/mo',
    description: 'For growing teams requiring advanced synthesis capabilities.',
    features: [
      'Up to 10,000 documents/mo',
      'Multi-Doc Synthesis',
      'Structured Data Extraction',
      'API Access (1M tokens)',
      'Priority Support'
    ],
    buttonText: 'Get Started',
    buttonClass: 'btn-primary',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Scale securely with dedicated infrastructure and custom models.',
    features: [
      'Unlimited documents',
      'Private Cloud / On-Premise deployment',
      'Custom Model Fine-Tuning',
      'SOC2 & HIPAA Compliance',
      'Dedicated Success Manager'
    ],
    buttonText: 'Contact Sales',
    buttonClass: 'btn-ghost',
    popular: false
  }
];

const Pricing = () => {
  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-container">
        <div className="pricing-header animate-fade-up">
          <h2 className="section-title">Transparent pricing for every stage</h2>
          <p className="section-subtitle">
            Start small and seamlessly scale as your data intelligence needs grow. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="pricing-grid">
          {pricingTiers.map((tier, index) => (
            <div 
              key={index}
              className={`pricing-card glass-card animate-fade-up delay-${(index + 1) * 100} ${tier.popular ? 'popular' : ''}`}
            >
              {tier.popular && <div className="popular-badge">Most Popular</div>}
              
              <div className="pricing-card-header">
                <h3 className="tier-name">{tier.name}</h3>
                <div className="tier-price">
                  <span className="price">{tier.price}</span>
                  <span className="period">{tier.period}</span>
                </div>
                <p className="tier-description">{tier.description}</p>
              </div>

              <div className="pricing-features">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="feature-item">
                    <Check size={18} className="check-icon" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pricing-action">
                <button className={`btn ${tier.buttonClass} w-full`}>
                  {tier.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
