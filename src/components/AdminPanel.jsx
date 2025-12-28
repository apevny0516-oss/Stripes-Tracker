import { useState } from 'react'

function AdminPanel({ 
  users, 
  students,
  onApproveUser, 
  onDenyUser, 
  onLinkUserToStudent,
  levelColors,
  levelNames
}) {
  const [activeTab, setActiveTab] = useState('pending') // 'pending', 'approved', 'link'

  const pendingUsers = users.filter(u => u.status === 'pending')
  const approvedUsers = users.filter(u => u.status === 'approved' && u.role !== 'admin')

  // Get which student a user is linked to
  const getLinkedStudent = (userId) => {
    return students.find(s => s.linkedUserId === userId)
  }

  // Get students that aren't linked to any user
  const getUnlinkedStudents = () => {
    return students.filter(s => !s.linkedUserId)
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>👑 Admin Panel</h2>
        <p className="admin-hint">Manage user access and link users to their student profiles</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({pendingUsers.length})
        </button>
        <button 
          className={`admin-tab ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          Approved Users ({approvedUsers.length})
        </button>
        <button 
          className={`admin-tab ${activeTab === 'link' ? 'active' : ''}`}
          onClick={() => setActiveTab('link')}
        >
          Link Users to Students
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="admin-section">
          <h3>Pending Approval</h3>
          {pendingUsers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✅</span>
              <p>No pending users</p>
            </div>
          ) : (
            <div className="user-list">
              {pendingUsers.map(user => (
                <div key={user.id} className="user-card pending">
                  <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
                  <div className="user-info">
                    <p className="user-name">{user.displayName}</p>
                    <p className="user-email">{user.email}</p>
                    <p className="user-date">Requested: {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="user-actions">
                    <button 
                      className="approve-btn"
                      onClick={() => onApproveUser(user.id)}
                    >
                      ✓ Approve
                    </button>
                    <button 
                      className="deny-btn"
                      onClick={() => {
                        if (confirm(`Deny access for ${user.displayName}?`)) {
                          onDenyUser(user.id)
                        }
                      }}
                    >
                      ✕ Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'approved' && (
        <div className="admin-section">
          <h3>Approved Users</h3>
          {approvedUsers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">👥</span>
              <p>No approved users yet</p>
            </div>
          ) : (
            <div className="user-list">
              {approvedUsers.map(user => {
                const linkedStudent = getLinkedStudent(user.id)
                return (
                  <div key={user.id} className="user-card approved">
                    <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
                    <div className="user-info">
                      <p className="user-name">{user.displayName}</p>
                      <p className="user-email">{user.email}</p>
                      {linkedStudent ? (
                        <p className="user-linked-student">
                          <span className="linked-badge">
                            <span 
                              className="level-dot-inline"
                              style={{ backgroundColor: levelColors[linkedStudent.currentLevel] }}
                            />
                            Linked to: {linkedStudent.name}
                          </span>
                        </p>
                      ) : (
                        <p className="user-not-linked">⚠️ Not linked to any student</p>
                      )}
                    </div>
                    <div className="user-actions">
                      <button 
                        className="revoke-btn"
                        onClick={() => {
                          if (confirm(`Revoke access for ${user.displayName}?`)) {
                            onDenyUser(user.id)
                          }
                        }}
                      >
                        Revoke Access
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'link' && (
        <div className="admin-section">
          <h3>Link Users to Students</h3>
          <p className="link-hint">
            Link each approved user to their student profile so they can track their own progress.
          </p>

          {approvedUsers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">👥</span>
              <p>Approve users first to link them to students</p>
            </div>
          ) : (
            <div className="link-list">
              {approvedUsers.map(user => {
                const linkedStudent = getLinkedStudent(user.id)
                const unlinkedStudents = getUnlinkedStudents()
                
                return (
                  <div key={user.id} className="link-card">
                    <div className="link-user-section">
                      <img src={user.photoURL} alt={user.displayName} className="link-avatar" />
                      <div className="link-user-info">
                        <p className="link-user-name">{user.displayName}</p>
                        <p className="link-user-email">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="link-arrow">→</div>
                    
                    <div className="link-student-section">
                      {linkedStudent ? (
                        <div className="linked-student-display">
                          <div className="linked-student-info">
                            <span 
                              className="level-dot"
                              style={{ backgroundColor: levelColors[linkedStudent.currentLevel] }}
                            />
                            <span className="linked-student-name">{linkedStudent.name}</span>
                            <span className="linked-level">{levelNames[linkedStudent.currentLevel]}</span>
                          </div>
                          <button 
                            className="unlink-btn"
                            onClick={() => onLinkUserToStudent(linkedStudent.id, null)}
                          >
                            Unlink
                          </button>
                        </div>
                      ) : (
                        <div className="unlinked-student-section">
                          {unlinkedStudents.length === 0 ? (
                            <p className="no-students-available">No unlinked students available</p>
                          ) : (
                            <select 
                              className="student-link-select"
                              onChange={(e) => {
                                if (e.target.value) {
                                  onLinkUserToStudent(e.target.value, user.id)
                                }
                              }}
                              defaultValue=""
                            >
                              <option value="">Select a student...</option>
                              {unlinkedStudents.map(student => (
                                <option key={student.id} value={student.id}>
                                  {student.name} ({levelNames[student.currentLevel]})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Show unlinked students */}
          {getUnlinkedStudents().length > 0 && (
            <div className="unlinked-students-section">
              <h4>Unlinked Students ({getUnlinkedStudents().length})</h4>
              <p className="unlinked-hint">These students don't have a user account linked yet:</p>
              <div className="unlinked-students-list">
                {getUnlinkedStudents().map(student => (
                  <div key={student.id} className="unlinked-student-item">
                    <span 
                      className="level-dot"
                      style={{ backgroundColor: levelColors[student.currentLevel] }}
                    />
                    <span>{student.name}</span>
                    <span className="unlinked-level">{levelNames[student.currentLevel]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminPanel
