import React from 'react'

/**
 * StatusBadge Component
 * Renders a stylized badge for lead/deal statuses with dynamic colors.
 * 
 * @param {Object} props
 * @param {string} props.status - The name of the status (e.g., 'NEW', 'WON')
 * @param {string} props.color - Hex color code or CSS color string
 * @param {string} props.className - Additional custom classes
 */
export default function StatusBadge({ status, color, className = '' }) {
  if (!status) return null

  // Process color to ensure visibility (e.g., subtle background)
  const safeColor = color || '#3b82f6' // Default blue
  
  // Create a background with low opacity for the pill effect
  const bgStyle = {
    backgroundColor: `${safeColor}15`, // 15 is hex for ~8% opacity
    color: safeColor,
    borderColor: `${safeColor}40`, // 40 is hex for ~25% opacity
    borderWidth: '1px',
    borderStyle: 'solid'
  }

  // Handle common status types for specific icons or styles if needed
  const statusKey = status.toLowerCase()
  
  return (
    <span 
      className={`status-badge-pill ${className}`}
      style={bgStyle}
    >
      <span 
        className="status-dot" 
        style={{ backgroundColor: safeColor }} 
      />
      {status}

      <style>{`
        .status-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.725rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        
        .status-badge-pill:hover {
          filter: brightness(0.95);
          transform: translateY(-1px);
        }

        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 4px currentColor;
        }
      `}</style>
    </span>
  )
}
