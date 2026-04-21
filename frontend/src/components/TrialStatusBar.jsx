import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FiClock, FiAlertTriangle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const TrialStatusBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user?.is_trial || !user?.trial_ends_at) return null;

  const timeLeft = new Date(user.trial_ends_at) - new Date();
  const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));
  
  if (daysLeft < 0) return null;

  const isUrgent = daysLeft <= 1;

  return (
    <div className={`trial-banner ${isUrgent ? 'urgent' : ''}`}>
      <div className="trial-banner-content">
        <div className="trial-info">
          <div className={`trial-icon ${isUrgent ? 'animate-pulse' : ''}`}>
            {isUrgent ? <FiAlertTriangle /> : <FiClock />}
          </div>
          <span className="trial-text">
            {daysLeft === 0 ? (
              <strong>Trial expires today!</strong>
            ) : (
              <>Free trial ends in <strong>{daysLeft} {daysLeft === 1 ? 'day' : 'days'}</strong></>
            )}
          </span>
        </div>
        
      </div>

      <style>{`
        .trial-banner {
          width: 100%;
          height: 48px;
          background: linear-gradient(90deg, #1e293b, #334155);
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 1000;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .dark .trial-banner {
          background: linear-gradient(90deg, #0f172a, #1e293b);
        }

        .trial-banner.urgent {
          background: linear-gradient(90deg, #991b1b, #dc2626);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .trial-banner-content {
          max-width: 1200px;
          width: 100%;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .trial-info {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
        }

        .trial-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          opacity: 0.9;
        }

        .trial-text {
          font-size: 14px;
          letter-spacing: 0.01em;
        }

        .trial-text strong {
          font-weight: 700;
        }

        .upgrade-button {
          position: relative;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .trial-banner.urgent .upgrade-button {
          background: white;
          color: #dc2626;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .upgrade-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          background: #2563eb;
        }

        .trial-banner.urgent .upgrade-button:hover {
          background: #f8fafc;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .upgrade-button:active {
          transform: translateY(0);
        }

        @media (max-width: 640px) {
          .trial-banner-content {
            justify-content: center;
          }
          .upgrade-button {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default TrialStatusBar;
