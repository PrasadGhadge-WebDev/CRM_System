import React, { useEffect, useState } from 'react'
import { FiX, FiLoader } from 'react-icons/fi'

const VideoModal = ({ isOpen, onClose, videoSrc }) => {
  const [isLoaded, setIsLoaded] = useState(false)

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Reset loading state for new opens
      setIsLoaded(false)
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('video-modal-overlay')) {
      onClose()
    }
  }

  return (
    <div className="video-modal-overlay" onClick={handleBackdropClick} aria-modal="true" role="dialog">
      <div className="video-modal-content">
        <button className="video-modal-close" onClick={onClose} aria-label="Close video">
          <FiX size={24} />
        </button>
        
        {!isLoaded && (
          <div className="video-loader-overlay">
            <FiLoader className="loader-spin" size={40} />
            <span>Buffering Demo...</span>
          </div>
        )}

        <img 
          src={videoSrc} 
          alt="CRM System Walkthrough" 
          className={`video-frame ${isLoaded ? 'loaded' : 'loading'}`}
          onLoad={() => setIsLoaded(true)}
          loading="eager"
        />
        
        {/* If it were a real mp4 video, we'd use <video> tag here:
        <video className="video-frame" controls autoPlay>
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        */}
      </div>
    </div>
  )
}

export default VideoModal
