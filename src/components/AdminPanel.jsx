import { useState } from 'react'

function AdminPanel({ 
  users, 
  students,
  onApproveUser, 
  onDenyUser, 
  onAssignStudent,
  onUnassignStudent,
  levelColors,
  levelNames
}) {
  const [selectedUser, setSelectedUser] = useState(null)
  const [activeTab, setActiveTab] = useState('pending') // 'pending', 'approved', 'assignments'

  const pendingUsers = users.filter(u => u.status === 'pending')
  const approvedUsers = users.filter(u => u.status === 'approved' && u.role !== 'admin')

  const getAssignedStudents = (userId) => {
    return students.filter(s => s.assignedTo?.includes(userId))
  }

  const getUnassignedStudents = (userId) => {
    return students.filter(s => !s.assignedTo?.includes(userId))
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>👑 Admin Panel</h2>
        <p className="admin-hint">Manage user access and student assignments</p>
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
          className={`admin-tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
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
                const assignedStudents = getAssignedStudents(user.id)
                return (
                  <div key={user.id} className="user-card approved">
                    <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
                    <div className="user-info">
                      <p className="user-name">{user.displayName}</p>
                      <p className="user-email">{user.email}</p>
                      <p className="user-students">
                        {assignedStudents.length} student{assignedStudents.length !== 1 ? 's' : ''} assigned
                      </p>
                    </div>
                    <div className="user-actions">
                      <button 
                        className="manage-btn"
                        onClick={() => {
                          setSelectedUser(user)
                          setActiveTab('assignments')
                        }}
                      >
                        Manage Students
                      </button>
                      <button 
                        className="revoke-btn"
                        onClick={() => {
                          if (confirm(`Revoke access for ${user.displayName}?`)) {
                            onDenyUser(user.id)
                          }
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="admin-section">
          <h3>Student Assignments</h3>
          
          {approvedUsers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">👥</span>
              <p>Approve users first to assign students</p>
            </div>
          ) : (
            <>
              <div className="user-selector">
                <label>Select User:</label>
                <select 
                  value={selectedUser?.id || ''} 
                  onChange={(e) => {
                    const user = approvedUsers.find(u => u.id === e.target.value)
                    setSelectedUser(user || null)
                  }}
                  className="user-select"
                >
                  <option value="">-- Select a user --</option>
                  {approvedUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.displayName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div className="assignment-panels">
                  <div className="assignment-panel">
                    <h4>Assigned to {selectedUser.displayName}</h4>
                    <div className="student-assignment-list">
                      {getAssignedStudents(selectedUser.id).length === 0 ? (
                        <p className="no-students">No students assigned</p>
                      ) : (
                        getAssignedStudents(selectedUser.id).map(student => (
                          <div key={student.id} className="assignment-student">
                            <div className="assignment-student-info">
                              <span 
                                className="level-dot"
                                style={{ backgroundColor: levelColors[student.currentLevel] }}
                              />
                              <span>{student.name}</span>
                              <span className="level-label">{levelNames[student.currentLevel]}</span>
                            </div>
                            <button 
                              className="unassign-btn"
                              onClick={() => onUnassignStudent(student.id, selectedUser.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="assignment-panel">
                    <h4>Available Students</h4>
                    <div className="student-assignment-list">
                      {getUnassignedStudents(selectedUser.id).length === 0 ? (
                        <p className="no-students">All students are assigned</p>
                      ) : (
                        getUnassignedStudents(selectedUser.id).map(student => (
                          <div key={student.id} className="assignment-student">
                            <div className="assignment-student-info">
                              <span 
                                className="level-dot"
                                style={{ backgroundColor: levelColors[student.currentLevel] }}
                              />
                              <span>{student.name}</span>
                              <span className="level-label">{levelNames[student.currentLevel]}</span>
                            </div>
                            <button 
                              className="assign-btn"
                              onClick={() => onAssignStudent(student.id, selectedUser.id)}
                            >
                              Assign
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminPanel

