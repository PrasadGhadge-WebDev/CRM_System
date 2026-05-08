import { useNavigate } from 'react-router-dom'
import { Icon } from '../layouts/icons'

/**
 * Modern Professional Back Button Component
 * Designed for CRM applications with high-end aesthetics.
 */
export default function BackButton({ to = '/payments', text = 'Back to Payments' }) {
  const navigate = useNavigate()

  return (
    <button 
      onClick={() => navigate(to)}
      className="
        group 
        flex items-center gap-3 
        px-6 py-2.5 
        rounded-full 
        bg-white/80 backdrop-blur-md
        border border-gray-200/60
        shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)]
        hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.1)]
        hover:border-blue-400/50
        hover:-translate-y-0.5
        active:scale-95
        transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        print:hidden
      "
    >
      <div className="
        flex items-center justify-center 
        w-5 h-5 
        rounded-full
        bg-gray-50 
        text-gray-500 
        group-hover:bg-blue-50 
        group-hover:text-blue-600 
        transition-all duration-300
      ">
        <Icon name="chevronLeft" size={14} />
      </div>
      <span className="
        text-sm font-bold 
        text-gray-600 
        group-hover:text-blue-600 
        transition-colors duration-300
      ">
        {text}
      </span>
    </button>
  )
}
