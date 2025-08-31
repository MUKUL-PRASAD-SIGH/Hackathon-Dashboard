import React, { useState, useEffect } from 'react';
import './UserGuide.css';

const UserGuide = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);

  const guideSteps = [
    {
      title: "🚀 Welcome to Hackathon Dashboard!",
      content: "Your ultimate companion for managing hackathon participation and team collaboration.",
      target: ".dashboard-header",
      position: "bottom"
    },
    {
      title: "📊 Dashboard Overview",
      content: "View all your hackathons, statistics, and manage your participation journey from here.",
      target: ".stats-section",
      position: "bottom"
    },
    {
      title: "🔍 Smart Search",
      content: "Search through your hackathons by name, platform, status, or even team members!",
      target: ".search-container",
      position: "bottom"
    },
    {
      title: "🎯 Add New Hackathon",
      content: "Click here to add new hackathons you want to participate in.",
      target: "[href='/add-hackathon']",
      position: "bottom"
    },
    {
      title: "💎 Hackathon Cards",
      content: "Each card shows your hackathon details. Click 'View Details' to see team members and manage your team.",
      target: ".hackathon-item",
      position: "top"
    },
    {
      title: "👥 Team Management",
      content: "Invite team members, manage roles, and collaborate with your team through private chats.",
      target: ".gradient-btn",
      position: "top"
    },
    {
      title: "🌍 Hackathon Worlds",
      content: "Join public hackathon communities, find teammates, and participate in team formation.",
      target: "[href='/worlds']",
      position: "bottom"
    },
    {
      title: "🔔 Notifications",
      content: "Stay updated with team invitations, join requests, and important hackathon updates.",
      target: "[href='/notifications']",
      position: "bottom"
    },
    {
      title: "👤 Profile Management",
      content: "Customize your profile, add skills, social links, and track your hackathon achievements.",
      target: "[href^='/profile']",
      position: "bottom"
    }
  ];

  const handleNext = () => {
    console.log('🔄 Guide Next clicked:', { currentStep, totalSteps: guideSteps.length });
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenGuide', 'true');
    onComplete();
  };

  const handleSkipGuide = () => {
    localStorage.setItem('hasSeenGuide', 'true');
    onSkip();
  };

  const getTargetElement = () => {
    const target = guideSteps[currentStep]?.target;
    return target ? document.querySelector(target) : null;
  };

  const getTooltipPosition = () => {
    const element = getTargetElement();
    if (!element) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const rect = element.getBoundingClientRect();
    const position = guideSteps[currentStep]?.position || 'bottom';

    switch (position) {
      case 'top':
        return {
          top: rect.top - 10,
          left: rect.left + rect.width / 2,
          transform: 'translate(-50%, -100%)'
        };
      case 'bottom':
        return {
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2,
          transform: 'translate(-50%, 0)'
        };
      default:
        return {
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2,
          transform: 'translate(-50%, 0)'
        };
    }
  };

  useEffect(() => {
    // Wait for DOM to be ready
    const timer = setTimeout(() => {
      const element = getTargetElement();
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('guide-highlight');
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      document.querySelectorAll('.guide-highlight').forEach(el => {
        el.classList.remove('guide-highlight');
      });
    };
  }, [currentStep]);

  if (showWelcome) {
    return (
      <div className="guide-overlay">
        <div className="welcome-modal">
          <div className="welcome-header">
            <h2>🎉 Welcome to Hackathon Dashboard!</h2>
            <p>Ready to explore all the amazing features?</p>
          </div>
          
          <div className="welcome-options">
            <button 
              onClick={() => setShowWelcome(false)}
              className="guide-btn primary"
            >
              🚀 Show me around!
            </button>
            <button 
              onClick={handleSkipGuide}
              className="guide-btn secondary"
            >
              ⚡ Skip guide, let's go!
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentGuide = guideSteps[currentStep];
  const tooltipStyle = getTooltipPosition();
  const targetElement = getTargetElement();

  return (
    <div className="guide-overlay">
      <div className="guide-tooltip" style={tooltipStyle}>
        {!targetElement && (
          <div className="element-not-found">
            ⚠️ Element not found, showing guide anyway
          </div>
        )}
        <div className="tooltip-content">
          <div className="tooltip-header">
            <h3>{currentGuide.title}</h3>
            <span className="step-counter">
              {currentStep + 1} / {guideSteps.length}
            </span>
          </div>
          
          <p>{currentGuide.content}</p>
          
          <div className="tooltip-actions">
            <button 
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="guide-btn secondary"
            >
              ← Previous
            </button>
            
            <button 
              onClick={handleSkipGuide}
              className="guide-btn skip"
            >
              Skip Guide
            </button>
            
            <button 
              onClick={handleNext}
              className="guide-btn primary"
            >
              {currentStep === guideSteps.length - 1 ? 'Finish 🎯' : 'Next →'}
            </button>
          </div>
        </div>
        
        <div className="tooltip-arrow"></div>
      </div>
    </div>
  );
};

export default UserGuide;
