import React, { useState, useEffect, useRef } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import animationData from '../assets/dropdown-animation.lottie'; 

/**
 * Premium Dropdown with Lottie Animation
 * Features:
 * - Play animation on open, pause/reset on close
 * - Modern Tailwind CSS styling
 * - Optimized performance using refs
 */
const LottieDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dotLottieRef = useRef(null);

  // Play/Stop logic when isOpen changes
  useEffect(() => {
    if (dotLottieRef.current) {
      if (isOpen) {
        dotLottieRef.current.play();
      } else {
        dotLottieRef.current.stop();
      }
    }
  }, [isOpen]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  return (
    <div className="relative inline-block text-left">
      {/* Dropdown Button */}
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500 transition-all duration-300 group"
      >
        <span className="text-slate-700 dark:text-slate-200 font-semibold text-sm">
          Menu Options
        </span>
        
        {/* Lottie Animation Wrapper */}
        <div className="w-8 h-8 flex items-center justify-center">
          <DotLottieReact
            src={animationData}
            loop={false}
            autoplay={false}
            dotLottieRefCallback={(ref) => {
              dotLottieRef.current = ref;
            }}
            className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 origin-top-right rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in duration-200">
          <div className="py-2 px-1">
            <button className="flex items-center w-full px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700/50 hover:text-blue-600 rounded-xl transition-colors">
              User Profile
            </button>
            <button className="flex items-center w-full px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700/50 hover:text-blue-600 rounded-xl transition-colors">
              Account Settings
            </button>
            <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>
            <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close on click outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default LottieDropdown;
