import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import PinScreen from './components/PinScreen'
import StudentList from './components/StudentList'
import StudentProgress from './components/StudentProgress'
import ChecklistManager from './components/ChecklistManager'
import './App.css'

const STRIPE_ORDER = ['white', 'yellow', 'red', 'green', 'blue', 'purple']

const STRIPE_COLORS = {
  white: '#f8f9fa',
  yellow: '#ffd43b',
  red: '#fa5252',
  green: '#51cf66',
  blue: '#339af0',
  purple: '#9775fa'
}

const STRIPE_TEXT_COLORS = {
  white: '#212529',
  yellow: '#212529',
  red: '#ffffff',
  green: '#ffffff',
  blue: '#ffffff',
  purple: '#ffffff'
}

// Initialize empty checklists for each stripe
const createEmptyChecklists = () => {
  const checklists = {}
  STRIPE_ORDER.forEach(stripe => {
    checklists[stripe] = []
  })
  return checklists
}

// Initialize student progress for all checklists
const createStudentProgress = (checklists) => {
  const progress = {}
  STRIPE_ORDER.forEach(stripe => {
    progress[stripe] = {}
    checklists[stripe].forEach(item => {
      progress[stripe][item.id] = false
      if (item.subItems) {
        item.subItems.forEach(sub => {
          progress[stripe][sub.id] = false
        })
      }
    })
  })
  return progress
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('stripes-authenticated') === 'true'
  })
  const [students, setStudents] = useState([])
  const [checklists, setChecklists] = useState(createEmptyChecklists())
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [view, setView] = useState('students') // 'students', 'progress', 'manage'
  const [activeStripe, setActiveStripe] = useState('white')
  const [studentSortBy, setStudentSortBy] = useState('name-asc')

  // Load data from localStorage
  useEffect(() => {
    const savedStudents = localStorage.getItem('stripes-students')
    const savedChecklists = localStorage.getItem('stripes-checklists')
    const savedSortBy = localStorage.getItem('stripes-student-sort')
    
    if (savedChecklists) {
      setChecklists(JSON.parse(savedChecklists))
    }
    if (savedStudents) {
      setStudents(JSON.parse(savedStudents))
    }
    if (savedSortBy) {
      setStudentSortBy(savedSortBy)
    }
  }, [])

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('stripes-students', JSON.stringify(students))
  }, [students])

  useEffect(() => {
    localStorage.setItem('stripes-checklists', JSON.stringify(checklists))
  }, [checklists])

  useEffect(() => {
    localStorage.setItem('stripes-student-sort', studentSortBy)
  }, [studentSortBy])

  // Add a new student
  const addStudent = (name) => {
    const newStudent = {
      id: uuidv4(),
      name,
      currentStripe: 'white',
      progress: createStudentProgress(checklists),
      dateAdded: new Date().toISOString()
    }
    setStudents([...students, newStudent])
  }

  // Delete a student
  const deleteStudent = (studentId) => {
    setStudents(students.filter(s => s.id !== studentId))
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(null)
      setView('students')
    }
  }

  // Add a checklist item (adds to all students too)
  const addChecklistItem = (stripe, itemText) => {
    const newItem = {
      id: uuidv4(),
      text: itemText,
      subItems: []
    }
    
    setChecklists(prev => ({
      ...prev,
      [stripe]: [...prev[stripe], newItem]
    }))

    // Add this item to all students' progress
    setStudents(prev => prev.map(student => ({
      ...student,
      progress: {
        ...student.progress,
        [stripe]: {
          ...student.progress[stripe],
          [newItem.id]: false
        }
      }
    })))
  }

  // Add a sub-item to a checklist item
  const addSubItem = (stripe, itemId, subItemText) => {
    const newSubItem = {
      id: uuidv4(),
      text: subItemText
    }

    setChecklists(prev => ({
      ...prev,
      [stripe]: prev[stripe].map(item => 
        item.id === itemId 
          ? { ...item, subItems: [...item.subItems, newSubItem] }
          : item
      )
    }))

    // Add this sub-item to all students' progress
    setStudents(prev => prev.map(student => ({
      ...student,
      progress: {
        ...student.progress,
        [stripe]: {
          ...student.progress[stripe],
          [newSubItem.id]: false
        }
      }
    })))
  }

  // Delete a checklist item
  const deleteChecklistItem = (stripe, itemId) => {
    const item = checklists[stripe].find(i => i.id === itemId)
    const subItemIds = item?.subItems?.map(s => s.id) || []

    setChecklists(prev => ({
      ...prev,
      [stripe]: prev[stripe].filter(i => i.id !== itemId)
    }))

    // Remove from all students' progress
    setStudents(prev => prev.map(student => {
      const newProgress = { ...student.progress[stripe] }
      delete newProgress[itemId]
      subItemIds.forEach(subId => delete newProgress[subId])
      return {
        ...student,
        progress: {
          ...student.progress,
          [stripe]: newProgress
        }
      }
    }))
  }

  // Delete a sub-item
  const deleteSubItem = (stripe, itemId, subItemId) => {
    setChecklists(prev => ({
      ...prev,
      [stripe]: prev[stripe].map(item =>
        item.id === itemId
          ? { ...item, subItems: item.subItems.filter(s => s.id !== subItemId) }
          : item
      )
    }))

    // Remove from all students' progress
    setStudents(prev => prev.map(student => {
      const newProgress = { ...student.progress[stripe] }
      delete newProgress[subItemId]
      return {
        ...student,
        progress: {
          ...student.progress,
          [stripe]: newProgress
        }
      }
    }))
  }

  // Reorder checklist items
  const reorderItems = (stripe, fromIndex, toIndex) => {
    setChecklists(prev => {
      const items = [...prev[stripe]]
      const [removed] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, removed)
      return {
        ...prev,
        [stripe]: items
      }
    })
  }

  // Reorder sub-items within an item
  const reorderSubItems = (stripe, itemId, fromIndex, toIndex) => {
    setChecklists(prev => ({
      ...prev,
      [stripe]: prev[stripe].map(item => {
        if (item.id !== itemId) return item
        const subItems = [...item.subItems]
        const [removed] = subItems.splice(fromIndex, 1)
        subItems.splice(toIndex, 0, removed)
        return { ...item, subItems }
      })
    }))
  }

  // Toggle student's progress on an item
  const toggleProgress = (studentId, stripe, itemId) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student
      return {
        ...student,
        progress: {
          ...student.progress,
          [stripe]: {
            ...student.progress[stripe],
            [itemId]: !student.progress[stripe][itemId]
          }
        }
      }
    }))
  }

  // Graduate student to next stripe
  const graduateStudent = (studentId) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student
      const currentIndex = STRIPE_ORDER.indexOf(student.currentStripe)
      if (currentIndex < STRIPE_ORDER.length - 1) {
        return {
          ...student,
          currentStripe: STRIPE_ORDER[currentIndex + 1]
        }
      }
      return student
    }))
  }

  // Calculate completion percentage for a stripe
  const calculateCompletion = (student, stripe) => {
    const items = checklists[stripe]
    if (!items || items.length === 0) return 0
    
    let total = 0
    let completed = 0
    
    items.forEach(item => {
      total++
      if (student.progress[stripe]?.[item.id]) completed++
      item.subItems?.forEach(sub => {
        total++
        if (student.progress[stripe]?.[sub.id]) completed++
      })
    })
    
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const selectStudent = (student) => {
    setSelectedStudent(student)
    setView('progress')
  }

  if (!isAuthenticated) {
    return <PinScreen onUnlock={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🥋</span>
          <h1>Stripes Tracker</h1>
        </div>
        <nav className="nav-tabs">
          <button 
            className={`nav-tab ${view === 'students' ? 'active' : ''}`}
            onClick={() => setView('students')}
          >
            Students
          </button>
          <button 
            className={`nav-tab ${view === 'progress' ? 'active' : ''}`}
            onClick={() => setView('progress')}
            disabled={!selectedStudent}
          >
            Progress
          </button>
          <button 
            className={`nav-tab ${view === 'manage' ? 'active' : ''}`}
            onClick={() => setView('manage')}
          >
            Manage Checklists
          </button>
        </nav>
      </header>

      <div className="stripe-tabs">
        {STRIPE_ORDER.map(stripe => (
          <button
            key={stripe}
            className={`stripe-tab ${activeStripe === stripe ? 'active' : ''}`}
            style={{
              '--stripe-color': STRIPE_COLORS[stripe],
              '--stripe-text': STRIPE_TEXT_COLORS[stripe]
            }}
            onClick={() => setActiveStripe(stripe)}
          >
            {stripe.charAt(0).toUpperCase() + stripe.slice(1)}
          </button>
        ))}
      </div>

      <main className="main-content">
        {view === 'students' && (
          <StudentList
            students={students}
            onAddStudent={addStudent}
            onDeleteStudent={deleteStudent}
            onSelectStudent={selectStudent}
            calculateCompletion={calculateCompletion}
            activeStripe={activeStripe}
            stripeColors={STRIPE_COLORS}
            stripeTextColors={STRIPE_TEXT_COLORS}
            stripeOrder={STRIPE_ORDER}
            sortBy={studentSortBy}
            onSortChange={setStudentSortBy}
          />
        )}

        {view === 'progress' && selectedStudent && (
          <StudentProgress
            student={students.find(s => s.id === selectedStudent.id) || selectedStudent}
            checklists={checklists}
            activeStripe={activeStripe}
            onToggleProgress={toggleProgress}
            onGraduate={graduateStudent}
            calculateCompletion={calculateCompletion}
            stripeColors={STRIPE_COLORS}
            stripeTextColors={STRIPE_TEXT_COLORS}
            stripeOrder={STRIPE_ORDER}
          />
        )}

        {view === 'manage' && (
          <ChecklistManager
            checklists={checklists}
            activeStripe={activeStripe}
            onAddItem={addChecklistItem}
            onAddSubItem={addSubItem}
            onDeleteItem={deleteChecklistItem}
            onDeleteSubItem={deleteSubItem}
            onReorderItems={reorderItems}
            onReorderSubItems={reorderSubItems}
            stripeColors={STRIPE_COLORS}
          />
        )}
      </main>
    </div>
  )
}

export default App
