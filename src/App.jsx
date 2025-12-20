import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
import LoginScreen from './components/LoginScreen'
import StudentList from './components/StudentList'
import StudentProgress from './components/StudentProgress'
import ChecklistManager from './components/ChecklistManager'
import SongManager from './components/SongManager'
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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [students, setStudents] = useState([])
  const [checklists, setChecklists] = useState(createEmptyChecklists())
  const [songs, setSongs] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [view, setView] = useState('students')
  const [activeStripe, setActiveStripe] = useState('white')
  const [studentSortBy, setStudentSortBy] = useState('name-asc')
  
  // Track if we have pending local changes to save
  const hasLocalChanges = useRef(false)
  const isSaving = useRef(false)

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (!currentUser) {
        setDataLoaded(false)
        hasLocalChanges.current = false
      }
    })
    return () => unsubscribe()
  }, [])

  // Load data from Firestore when user logs in
  useEffect(() => {
    if (!user) return

    const userDocRef = doc(db, 'users', user.uid)
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      // Don't update state from remote if we're saving or have pending changes
      // This prevents remote updates from overwriting unsaved local work
      if (isSaving.current || hasLocalChanges.current) return
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.students) setStudents(data.students)
        if (data.checklists) setChecklists(data.checklists)
        if (data.songs) setSongs(data.songs)
        if (data.studentSortBy) setStudentSortBy(data.studentSortBy)
      }
      setDataLoaded(true)
    })

    return () => unsubscribe()
  }, [user])

  // Save data to Firestore (debounced)
  useEffect(() => {
    if (!user || loading || !dataLoaded) return
    if (!hasLocalChanges.current) return

    const saveTimeout = setTimeout(async () => {
      try {
        isSaving.current = true
        const userDocRef = doc(db, 'users', user.uid)
        
        await setDoc(userDocRef, {
          students,
          checklists,
          songs,
          studentSortBy,
          lastUpdated: new Date().toISOString()
        }, { merge: true })
        
        hasLocalChanges.current = false
      } catch (error) {
        console.error('Error saving data:', error)
      }
      isSaving.current = false
    }, 1000)

    return () => clearTimeout(saveTimeout)
  }, [students, checklists, songs, studentSortBy, user, loading, dataLoaded])

  // Helper to mark that we made a local change
  const markLocalChange = () => {
    hasLocalChanges.current = true
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth)
      setDataLoaded(false)
      setStudents([])
      setChecklists(createEmptyChecklists())
      setSongs([])
      setSelectedStudent(null)
      setView('students')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // ========== STUDENT FUNCTIONS ==========
  
  const addStudent = (name) => {
    markLocalChange()
    const newStudent = {
      id: uuidv4(),
      name,
      currentStripe: 'white',
      progress: createStudentProgress(checklists),
      dateAdded: new Date().toISOString()
    }
    setStudents([...students, newStudent])
  }

  const deleteStudent = (studentId) => {
    markLocalChange()
    setStudents(students.filter(s => s.id !== studentId))
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(null)
      setView('students')
    }
  }

  const editStudentName = (studentId, newName) => {
    markLocalChange()
    setStudents(students.map(s => 
      s.id === studentId ? { ...s, name: newName } : s
    ))
  }

  // ========== SONG FUNCTIONS ==========

  const addSong = (artist, title) => {
    markLocalChange()
    const newSong = {
      id: uuidv4(),
      artist,
      title,
      dateAdded: new Date().toISOString()
    }
    setSongs([...songs, newSong])
    return newSong.id // Return the ID so we can link immediately
  }

  const editSong = (songId, artist, title) => {
    markLocalChange()
    setSongs(songs.map(s => 
      s.id === songId ? { ...s, artist, title } : s
    ))
  }

  const deleteSong = (songId) => {
    markLocalChange()
    setSongs(songs.filter(s => s.id !== songId))
    // Also remove this song from any checklist items it's linked to
    setChecklists(prev => {
      const updated = { ...prev }
      STRIPE_ORDER.forEach(stripe => {
        updated[stripe] = updated[stripe].map(item => ({
          ...item,
          linkedSongs: (item.linkedSongs || []).filter(id => id !== songId),
          subItems: item.subItems.map(sub => ({
            ...sub,
            linkedSongs: (sub.linkedSongs || []).filter(id => id !== songId)
          }))
        }))
      })
      return updated
    })
  }

  // Link a song to a checklist item or subitem
  const linkSong = (stripe, itemId, subItemId, songId) => {
    markLocalChange()
    setChecklists(prev => ({
      ...prev,
      [stripe]: prev[stripe].map(item => {
        if (item.id !== itemId) return item
        
        if (subItemId) {
          // Link to subitem
          return {
            ...item,
            subItems: item.subItems.map(sub => {
              if (sub.id !== subItemId) return sub
              const linkedSongs = sub.linkedSongs || []
              if (linkedSongs.includes(songId)) return sub
              return { ...sub, linkedSongs: [...linkedSongs, songId] }
            })
          }
        } else {
          // Link to main item
          const linkedSongs = item.linkedSongs || []
          if (linkedSongs.includes(songId)) return item
          return { ...item, linkedSongs: [...linkedSongs, songId] }
        }
      })
    }))
  }

  // Unlink a song from a checklist item or subitem
  const unlinkSong = (stripe, itemId, subItemId, songId) => {
    markLocalChange()
    setChecklists(prev => ({
      ...prev,
      [stripe]: prev[stripe].map(item => {
        if (item.id !== itemId) return item
        
        if (subItemId) {
          return {
            ...item,
            subItems: item.subItems.map(sub => {
              if (sub.id !== subItemId) return sub
              return { ...sub, linkedSongs: (sub.linkedSongs || []).filter(id => id !== songId) }
            })
          }
        } else {
          return { ...item, linkedSongs: (item.linkedSongs || []).filter(id => id !== songId) }
        }
      })
    }))
  }

  // ========== CHECKLIST FUNCTIONS ==========

  const addChecklistItem = (stripe, itemText) => {
    markLocalChange()
    const newItem = {
      id: uuidv4(),
      text: itemText,
      subItems: [],
      linkedSongs: []
    }
    
    setChecklists(prev => ({
      ...prev,
      [stripe]: [...prev[stripe], newItem]
    }))

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

  const addSubItem = (stripe, itemId, subItemText) => {
    markLocalChange()
    const newSubItem = {
      id: uuidv4(),
      text: subItemText,
      linkedSongs: []
    }

    setChecklists(prev => ({
      ...prev,
      [stripe]: prev[stripe].map(item => 
        item.id === itemId 
          ? { ...item, subItems: [...item.subItems, newSubItem] }
          : item
      )
    }))

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

  const deleteChecklistItem = (stripe, itemId) => {
    markLocalChange()
    const item = checklists[stripe].find(i => i.id === itemId)
    const subItemIds = item?.subItems?.map(s => s.id) || []

    setChecklists(prev => ({
      ...prev,
      [stripe]: prev[stripe].filter(i => i.id !== itemId)
    }))

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

  const deleteSubItem = (stripe, itemId, subItemId) => {
    markLocalChange()
    setChecklists(prev => ({
      ...prev,
      [stripe]: prev[stripe].map(item =>
        item.id === itemId
          ? { ...item, subItems: item.subItems.filter(s => s.id !== subItemId) }
          : item
      )
    }))

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

  const reorderItems = (stripe, fromIndex, toIndex) => {
    markLocalChange()
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

  const reorderSubItems = (stripe, itemId, fromIndex, toIndex) => {
    markLocalChange()
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

  // ========== PROGRESS FUNCTIONS ==========

  const toggleProgress = (studentId, stripe, itemId) => {
    markLocalChange()
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

  const graduateStudent = (studentId) => {
    markLocalChange()
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

  // Show loading screen
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen onLogin={setUser} />
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
          <button 
            className={`nav-tab ${view === 'songs' ? 'active' : ''}`}
            onClick={() => setView('songs')}
          >
            🎵 Songs
          </button>
        </nav>
        <div className="user-section">
          <img 
            src={user.photoURL} 
            alt={user.displayName} 
            className="user-avatar"
            title={user.displayName}
          />
          <button onClick={handleLogout} className="logout-btn">
            Sign Out
          </button>
        </div>
      </header>

      {view !== 'songs' && (
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
      )}

      <main className="main-content">
        {view === 'students' && (
          <StudentList
            students={students}
            onAddStudent={addStudent}
            onDeleteStudent={deleteStudent}
            onEditStudentName={editStudentName}
            onSelectStudent={selectStudent}
            calculateCompletion={calculateCompletion}
            activeStripe={activeStripe}
            stripeColors={STRIPE_COLORS}
            stripeTextColors={STRIPE_TEXT_COLORS}
            stripeOrder={STRIPE_ORDER}
            sortBy={studentSortBy}
            onSortChange={(newSort) => { markLocalChange(); setStudentSortBy(newSort); }}
          />
        )}

        {view === 'progress' && selectedStudent && (
          <StudentProgress
            student={students.find(s => s.id === selectedStudent.id) || selectedStudent}
            checklists={checklists}
            songs={songs}
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
            onLinkSong={linkSong}
            onUnlinkSong={unlinkSong}
            onAddSong={addSong}
            songs={songs}
            stripeColors={STRIPE_COLORS}
          />
        )}

        {view === 'songs' && (
          <SongManager
            songs={songs}
            checklists={checklists}
            onAddSong={addSong}
            onEditSong={editSong}
            onDeleteSong={deleteSong}
          />
        )}
      </main>
    </div>
  )
}

export default App
