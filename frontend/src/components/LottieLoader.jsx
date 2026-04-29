import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loaderData from '../assets/loading-animation.json';

const LottieLoader = ({ message = 'Loading...', size = 150 }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 w-full animate-in fade-in duration-500">
      <div style={{ width: size, height: size }}>
        <DotLottieReact
          data={loaderData}
          loop
          autoplay
        />
      </div>
      {message && (
        <p className="mt-4 text-slate-400 font-medium text-sm tracking-wide uppercase opacity-70">
          {message}
        </p>
      )}
    </div>
  );
};

export default LottieLoader;
