import { useState, useMemo } from 'react'

function StudentList({ 
  students, 
  onAddStudent, 
  onDeleteStudent, 
  onSelectStudent,
  calculateCompletion,
  activeStripe,
  stripeColors,
  stripeTextColors,
  stripeOrder,
  sortBy,
  onSortChange
}) {
  const [newStudentName, setNewStudentName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (newStudentName.trim()) {
      onAddStudent(newStudentName.trim())
      setNewStudentName('')
    }
  }

  const getStripeIndex = (stripe) => stripeOrder.indexOf(stripe)

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
        case 'stripe-desc': {
          // Highest stripe first, then by completion percentage within same stripe
          const aStripeIdx = getStripeIndex(a.currentStripe)
          const bStripeIdx = getStripeIndex(b.currentStripe)
          if (aStripeIdx !== bStripeIdx) {
            return bStripeIdx - aStripeIdx
          }
          // Same stripe, sort by completion
          return calculateCompletion(b, b.currentStripe) - calculateCompletion(a, a.currentStripe)
        }
        case 'stripe-asc': {
          // Lowest stripe first, then by completion percentage within same stripe
          const aStripeIdx = getStripeIndex(a.currentStripe)
          const bStripeIdx = getStripeIndex(b.currentStripe)
          if (aStripeIdx !== bStripeIdx) {
            return aStripeIdx - bStripeIdx
          }
          // Same stripe, sort by completion (lowest first)
          return calculateCompletion(a, a.currentStripe) - calculateCompletion(b, b.currentStripe)
        }
        default:
          return 0
      }
    })
  }, [students, searchTerm, sortBy, stripeOrder, calculateCompletion])

  return (
    <div className="student-list-container">
      <div className="student-list-header">
        <h2>Students</h2>
        <p className="student-count">{students.length} student{students.length !== 1 ? 's' : ''}</p>
      </div>

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
        
        <div className="sort-container">
          <label className="sort-label">Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => onSortChange(e.target.value)}
            className="sort-select"
          >
            <option value="name-asc">Name (A → Z)</option>
            <option value="name-desc">Name (Z → A)</option>
            <option value="stripe-desc">Stripe (Highest first)</option>
            <option value="stripe-asc">Stripe (Lowest first)</option>
          </select>
        </div>
      </div>

      <div className="students-grid">
        {sortedAndFilteredStudents.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">👤</span>
            <p>{students.length === 0 ? 'No students yet. Add your first student above!' : 'No students match your search.'}</p>
          </div>
        ) : (
          sortedAndFilteredStudents.map(student => {
            const completion = calculateCompletion(student, student.currentStripe)
            return (
              <div 
                key={student.id} 
                className="student-card"
                onClick={() => onSelectStudent(student)}
              >
                <div className="student-card-header">
                  <div 
                    className="stripe-badge"
                    style={{
                      backgroundColor: stripeColors[student.currentStripe],
                      color: stripeTextColors[student.currentStripe]
                    }}
                  >
                    {student.currentStripe}
                  </div>
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
                </div>
                
                <h3 className="student-name">{student.name}</h3>
                
                <div className="progress-section">
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar"
                      style={{
                        width: `${completion}%`,
                        backgroundColor: stripeColors[student.currentStripe]
                      }}
                    />
                  </div>
                  <span className="progress-text">{completion}% complete</span>
                </div>

                <div className="stripe-progress-dots">
                  {stripeOrder.map((stripe, idx) => (
                    <div
                      key={stripe}
                      className={`stripe-dot ${getStripeIndex(student.currentStripe) >= idx ? 'achieved' : ''}`}
                      style={{
                        backgroundColor: getStripeIndex(student.currentStripe) >= idx 
                          ? stripeColors[stripe] 
                          : '#e9ecef',
                        border: stripe === 'white' ? '1px solid #dee2e6' : 'none'
                      }}
                      title={stripe}
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
