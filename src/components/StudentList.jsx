import { useState, useMemo } from 'react'

function StudentList({ 
  students, 
  onAddStudent, 
  onDeleteStudent, 
  onEditStudentName,
  onSelectStudent,
  calculateCompletion,
  activeLevel,
  levelColors,
  levelTextColors,
  levelOrder,
  levelNames,
  sortBy,
  onSortChange,
  isAdmin
}) {
  const [newStudentName, setNewStudentName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (newStudentName.trim() && onAddStudent) {
      onAddStudent(newStudentName.trim())
      setNewStudentName('')
    }
  }

  const startEditing = (e, student) => {
    e.stopPropagation()
    if (!onEditStudentName) return
    setEditingId(student.id)
    setEditingName(student.name)
  }

  const saveEdit = (e) => {
    e.stopPropagation()
    if (editingName.trim() && onEditStudentName) {
      onEditStudentName(editingId, editingName.trim())
    }
    setEditingId(null)
    setEditingName('')
  }

  const cancelEdit = (e) => {
    e.stopPropagation()
    setEditingId(null)
    setEditingName('')
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveEdit(e)
    } else if (e.key === 'Escape') {
      cancelEdit(e)
    }
  }

  const getLevelIndex = (level) => levelOrder.indexOf(level)

  const sortedAndFilteredStudents = useMemo(() => {
    let filtered = students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'level-desc': {
          const aLevelIdx = getLevelIndex(a.currentLevel)
          const bLevelIdx = getLevelIndex(b.currentLevel)
          if (aLevelIdx !== bLevelIdx) {
            return bLevelIdx - aLevelIdx
          }
          return calculateCompletion(b, b.currentLevel) - calculateCompletion(a, a.currentLevel)
        }
        case 'level-asc': {
          const aLevelIdx = getLevelIndex(a.currentLevel)
          const bLevelIdx = getLevelIndex(b.currentLevel)
          if (aLevelIdx !== bLevelIdx) {
            return aLevelIdx - bLevelIdx
          }
          return calculateCompletion(a, a.currentLevel) - calculateCompletion(b, b.currentLevel)
        }
        default:
          return 0
      }
    })
  }, [students, searchTerm, sortBy, levelOrder, calculateCompletion])

  return (
    <div className="student-list-container">
      <div className="student-list-header">
        <h2>{isAdmin ? 'Students' : 'My Students'}</h2>
        <p className="student-count">{students.length} student{students.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Only show add form for admin */}
      {onAddStudent && (
        <form onSubmit={handleSubmit} className="add-student-form">
          <input
            type="text"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="Enter student name..."
            className="student-input"
          />
          <button type="submit" className="add-btn">
            <span>+</span> Add Student
          </button>
        </form>
      )}

      <div className="search-sort-row">
        <div className="search-container">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            className="search-input"
          />
        </div>
        
        {onSortChange && (
          <div className="sort-container">
            <label className="sort-label">Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => onSortChange(e.target.value)}
              className="sort-select"
            >
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="level-desc">Level (Highest first)</option>
              <option value="level-asc">Level (Lowest first)</option>
            </select>
          </div>
        )}
      </div>

      <div className="students-grid">
        {sortedAndFilteredStudents.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">👤</span>
            <p>
              {students.length === 0 
                ? (isAdmin ? 'No students yet. Add your first student above!' : 'No students assigned to you yet.')
                : 'No students match your search.'
              }
            </p>
          </div>
        ) : (
          sortedAndFilteredStudents.map(student => {
            const completion = calculateCompletion(student, student.currentLevel)
            const isEditing = editingId === student.id
            
            return (
              <div 
                key={student.id} 
                className="student-card"
                onClick={() => !isEditing && onSelectStudent(student)}
              >
                <div className="student-card-header">
                  <div 
                    className="level-badge"
                    style={{
                      backgroundColor: levelColors[student.currentLevel],
                      color: levelTextColors[student.currentLevel]
                    }}
                  >
                    {levelNames[student.currentLevel]}
                  </div>
                  <div className="card-actions">
                    {/* Only show edit/delete buttons for admin */}
                    {!isEditing && onEditStudentName && (
                      <button
                        className="edit-btn"
                        onClick={(e) => startEditing(e, student)}
                        title="Edit name"
                      >
                        ✎
                      </button>
                    )}
                    {onDeleteStudent && (
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`Delete ${student.name}?`)) {
                            onDeleteStudent(student.id)
                          }
                        }}
                        title="Delete student"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                
                {isEditing ? (
                  <div className="edit-name-container" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      className="edit-name-input"
                      autoFocus
                    />
                    <div className="edit-actions">
                      <button className="save-edit-btn" onClick={saveEdit}>Save</button>
                      <button className="cancel-edit-btn" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <h3 className="student-name">{student.name}</h3>
                )}
                
                <div className="progress-section">
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar"
                      style={{
                        width: `${completion}%`,
                        backgroundColor: levelColors[student.currentLevel]
                      }}
                    />
                  </div>
                  <span className="progress-text">{completion}% complete</span>
                </div>

                <div className="level-progress-dots">
                  {levelOrder.map((level, idx) => (
                    <div
                      key={level}
                      className={`level-dot ${getLevelIndex(student.currentLevel) >= idx ? 'achieved' : ''}`}
                      style={{
                        backgroundColor: getLevelIndex(student.currentLevel) >= idx 
                          ? levelColors[level] 
                          : '#e9ecef'
                      }}
                      title={levelNames[level]}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default StudentList
