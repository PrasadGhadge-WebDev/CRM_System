import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiMail, FiArrowLeft } from 'react-icons/fi';

const TrialExpiredPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiAlertCircle size={40} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Trial Expired</h1>
        <p className="text-slate-600 mb-8">
          Your 5-day free trial has come to an end. We hope you enjoyed exploring the CRM System!
        </p>

        <div className="space-y-4">
          <button 
            onClick={() => navigate('/contact')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
          >
            <FiMail /> Contact Sales to Upgrade
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <FiArrowLeft /> Back to Home
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100">
          <p className="text-sm text-slate-400 italic">
            Need more time? Reach out to our support team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrialExpiredPage;
