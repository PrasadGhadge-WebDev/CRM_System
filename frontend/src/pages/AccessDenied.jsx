import { Link } from 'react-router-dom'

export default function AccessDenied() {
  return (
    <div className="accessDenied">
      <div className="accessDeniedCard">
        <div className="accessDeniedCode">403</div>
        <h1>Access denied</h1>
        <p>
          Your account does not have permission to open this section. Contact an administrator if
          you need access.
        </p>
        <div className="accessDeniedActions">
          <Link className="btn" to="/">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
