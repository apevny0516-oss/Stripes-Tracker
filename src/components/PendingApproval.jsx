import { signOut } from 'firebase/auth'
import { auth } from '../firebase'

function PendingApproval({ user }) {
  const handleSignOut = async () => {
    await signOut(auth)
  }

  return (
    <div className="pending-approval-screen">
      <div className="pending-card">
        <div className="pending-icon">⏳</div>
        <h1>Awaiting Approval</h1>
        <p className="pending-message">
          Your account is pending approval from the administrator.
        </p>
        <div className="pending-user-info">
          <img src={user.photoURL} alt={user.displayName} className="pending-avatar" />
          <div>
            <p className="pending-name">{user.displayName}</p>
            <p className="pending-email">{user.email}</p>
          </div>
        </div>
        <p className="pending-hint">
          You'll be able to access the app once your account has been approved.
          Please check back later or contact the administrator.
        </p>
        <button onClick={handleSignOut} className="sign-out-btn">
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default PendingApproval



