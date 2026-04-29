import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import emptyData from '../assets/empty-state-animation.json';

const LottieEmpty = ({ message = 'No records found', description = 'Try adjusting your filters or search terms.' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center animate-in zoom-in duration-300">
      <div className="w-64 h-64 opacity-80">
        <DotLottieReact
          data={emptyData}
          loop
          autoplay
        />
      </div>
      <h3 className="mt-2 text-xl font-bold text-slate-700 dark:text-slate-200">
        {message}
      </h3>
      <p className="mt-2 text-slate-400 dark:text-slate-500 max-w-sm">
        {description}
      </p>
    </div>
  );
};

export default LottieEmpty;
