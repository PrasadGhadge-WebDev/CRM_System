export function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' }

  const stroke = {
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common} aria-hidden="true">
          <path
            {...stroke}
            d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3h8v6h-8V3zM3 21h8v-6H3v6z"
          />
        </svg>
      )

    case 'users':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <path {...stroke} d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </svg>
      )

    case 'search':
      return (
        <svg {...common} aria-hidden="true">
          <circle {...stroke} cx="11" cy="11" r="8" />
          <path {...stroke} d="m21 21-4.3-4.3" />
        </svg>
      )

    case 'bell':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path {...stroke} d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )

    case 'menu':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M4 6h16" />
          <path {...stroke} d="M4 12h16" />
          <path {...stroke} d="M4 18h16" />
        </svg>
      )

    case 'close':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M18 6 6 18" />
          <path {...stroke} d="M6 6l12 12" />
        </svg>
      )

    case 'alert':
      return (
        <svg {...common} aria-hidden="true">
          <circle {...stroke} cx="12" cy="12" r="10" />
          <line {...stroke} x1="12" y1="8" x2="12" y2="12" />
          <line {...stroke} x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )

    case 'info':
      return (
        <svg {...common} aria-hidden="true">
          <circle {...stroke} cx="12" cy="12" r="10" />
          <line {...stroke} x1="12" y1="16" x2="12" y2="12" />
          <line {...stroke} x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )

    case 'sun':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
          <path {...stroke} d="M12 2v2" />
          <path {...stroke} d="M12 20v2" />
          <path {...stroke} d="M4.93 4.93l1.41 1.41" />
          <path {...stroke} d="M17.66 17.66l1.41 1.41" />
          <path {...stroke} d="M2 12h2" />
          <path {...stroke} d="M20 12h2" />
          <path {...stroke} d="M4.93 19.07l1.41-1.41" />
          <path {...stroke} d="M17.66 6.34l1.41-1.41" />
        </svg>
      )

    case 'moon':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M21 12.8A8.5 8.5 0 0 1 11.2 3a6.5 6.5 0 1 0 9.8 9.8Z" />
        </svg>
      )

    case 'chevronDown':
      return (
        <svg {...common} aria-hidden="true" style={{ width: 14, height: 14 }}>
          <path {...stroke} d="m6 9 6 6 6-6" />
        </svg>
      )

    case 'arrowLeft':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M19 12H5" />
          <path {...stroke} d="m12 19-7-7 7-7" />
        </svg>
      )

    case 'user':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle {...stroke} cx="12" cy="7" r="4" />
        </svg>
      )

    case 'settings':
      return (
        <svg {...common} aria-hidden="true">
          <path
            {...stroke}
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          />
          <circle {...stroke} cx="12" cy="12" r="3" />
        </svg>
      )

    case 'logOut':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline {...stroke} points="16 17 21 12 16 7" />
          <line {...stroke} x1="21" y1="12" x2="9" y2="12" />
        </svg>
      )

    case 'tasks':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M9 11l3 3L22 4" />
          <path {...stroke} d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      )

    case 'mail':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline {...stroke} points="22,6 12,13 2,6" />
        </svg>
      )

    case 'phone':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      )

    case 'reports':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M12 20V10" />
          <path {...stroke} d="M18 20V4" />
          <path {...stroke} d="M6 20v-4" />
        </svg>
      )

    case 'deals':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M12 2v20" />
          <path {...stroke} d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )

    case 'notes':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path {...stroke} d="M14 2v6h6" />
          <path {...stroke} d="M16 13H8" />
          <path {...stroke} d="M16 17H8" />
          <path {...stroke} d="M10 9H8" />
        </svg>
      )
    case 'edit':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path {...stroke} d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )
    case 'eye':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
          <circle {...stroke} cx="12" cy="12" r="3" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M12 5v14" />
          <path {...stroke} d="M5 12h14" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...common} aria-hidden="true">
          <polyline {...stroke} points="3 6 5 6 21 6" />
          <path {...stroke} d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line {...stroke} x1="10" y1="11" x2="10" y2="17" />
          <line {...stroke} x1="14" y1="11" x2="14" y2="17" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common} aria-hidden="true">
          <polyline {...stroke} points="20 6 9 17 4 12" />
        </svg>
      )
    case 'undo':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M3 7V2h5" />
          <path {...stroke} d="M3 2v5h5" />
          <path {...stroke} d="M21 17a9 9 0 1 1-2.14-10.37L3 7" />
        </svg>
      )
    case 'shoppingCart':
      return (
        <svg {...common} aria-hidden="true">
          <circle {...stroke} cx="9" cy="21" r="1" />
          <circle {...stroke} cx="20" cy="21" r="1" />
          <path {...stroke} d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )
    case 'help':
      return (
        <svg {...common} aria-hidden="true">
          <circle {...stroke} cx="12" cy="12" r="10" />
          <path {...stroke} d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line {...stroke} x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'package':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="m7.5 4.21 4.5 2.66 4.5-2.66" />
          <path {...stroke} d="m12 22 4.5-2.66V14.2l-4.5 2.66-4.5-2.66v5.14L12 22Z" />
          <path {...stroke} d="m12 11.58 4.5-2.66V3.78L12 1.12 7.5 3.78v5.14l4.5 2.66Z" />
        </svg>
      )

    case 'billing':
      return (
        <svg {...common} aria-hidden="true">
          <rect {...stroke} x="2" y="5" width="20" height="14" rx="2" />
          <line {...stroke} x1="2" y1="10" x2="22" y2="10" />
        </svg>
      )
    case 'briefcase':
      return (
        <svg {...common} aria-hidden="true">
          <rect {...stroke} x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path {...stroke} d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
    case 'refresh':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" {...stroke} />
          <path d="M21 3v5h-5" {...stroke} />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" {...stroke} />
          <path d="M3 21v-5h5" {...stroke} />
        </svg>
      )
    case 'archive':
      return (
        <svg {...common} aria-hidden="true">
          <path {...stroke} d="M3 7h18" />
          <path {...stroke} d="M5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" />
          <path {...stroke} d="M9 12h6" />
          <path {...stroke} d="M4 3h16v4H4z" />
        </svg>
      )

    case 'filter':
      return (
        <svg {...common} aria-hidden="true">
          <polygon {...stroke} points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      )

    default:
      return null
  }
}
