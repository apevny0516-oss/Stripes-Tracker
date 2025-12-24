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

const LEVEL_ORDER = ['level1', 'level2', 'level3', 'level4', 'level5', 'level6']

const LEVEL_COLORS = {
  level1: '#64748b',
  level2: '#f59e0b',
  level3: '#ef4444',
  level4: '#22c55e',
  level5: '#3b82f6',
  level6: '#8b5cf6'
}

const LEVEL_TEXT_COLORS = {
  level1: '#ffffff',
  level2: '#ffffff',
  level3: '#ffffff',
  level4: '#ffffff',
  level5: '#ffffff',
  level6: '#ffffff'
}

const LEVEL_NAMES = {
  level1: 'Level 1',
  level2: 'Level 2',
  level3: 'Level 3',
  level4: 'Level 4',
  level5: 'Level 5',
  level6: 'Level 6'
}

// Initialize empty checklists for each level
const createEmptyChecklists = () => {
  const checklists = {}
  LEVEL_ORDER.forEach(level => {
    checklists[level] = []
  })
  return checklists
}

// Initialize student progress for all checklists
const createStudentProgress = (checklists) => {
  const progress = {}
  LEVEL_ORDER.forEach(level => {
    progress[level] = {}
    const items = checklists[level] || []
    items.forEach(item => {
      progress[level][item.id] = false
      if (item.subItems) {
        item.subItems.forEach(sub => {
          progress[level][sub.id] = false
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
  const [activeLevel, setActiveLevel] = useState('level1')
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
      currentLevel: 'level1',
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
      LEVEL_ORDER.forEach(level => {
        updated[level] = (updated[level] || []).map(item => ({
          ...item,
          linkedSongs: (item.linkedSongs || []).filter(id => id !== songId),
          subItems: (item.subItems || []).map(sub => ({
            ...sub,
            linkedSongs: (sub.linkedSongs || []).filter(id => id !== songId)
          }))
        }))
      })
      return updated
    })
  }

  // Link a song to a checklist item or subitem
  const linkSong = (level, itemId, subItemId, songId) => {
    markLocalChange()
    setChecklists(prev => ({
      ...prev,
      [level]: (prev[level] || []).map(item => {
        if (item.id !== itemId) return item
        
        if (subItemId) {
          // Link to subitem
          return {
            ...item,
            subItems: (item.subItems || []).map(sub => {
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
  const unlinkSong = (level, itemId, subItemId, songId) => {
    markLocalChange()
    setChecklists(prev => ({
      ...prev,
      [level]: (prev[level] || []).map(item => {
        if (item.id !== itemId) return item
        
        if (subItemId) {
          return {
            ...item,
            subItems: (item.subItems || []).map(sub => {
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

  const addChecklistItem = (level, itemText) => {
    markLocalChange()
    const newItem = {
      id: uuidv4(),
      text: itemText,
      subItems: [],
      linkedSongs: []
    }
    
    setChecklists(prev => ({
      ...prev,
      [level]: [...(prev[level] || []), newItem]
    }))

    setStudents(prev => prev.map(student => ({
      ...student,
      progress: {
        ...student.progress,
        [level]: {
          ...(student.progress?.[level] || {}),
          [newItem.id]: false
        }
      }
    })))
  }

  const addSubItem = (level, itemId, subItemText) => {
    markLocalChange()
    const newSubItem = {
      id: uuidv4(),
      text: subItemText,
      linkedSongs: []
    }

    setChecklists(prev => ({
      ...prev,
      [level]: (prev[level] || []).map(item => 
        item.id === itemId 
          ? { ...item, subItems: [...(item.subItems || []), newSubItem] }
          : item
      )
    }))

    setStudents(prev => prev.map(student => ({
      ...student,
      progress: {
        ...student.progress,
        [level]: {
          ...(student.progress?.[level] || {}),
          [newSubItem.id]: false
        }
      }
    })))
  }

  const deleteChecklistItem = (level, itemId) => {
    markLocalChange()
    const item = (checklists[level] || []).find(i => i.id === itemId)
    const subItemIds = item?.subItems?.map(s => s.id) || []

    setChecklists(prev => ({
      ...prev,
      [level]: (prev[level] || []).filter(i => i.id !== itemId)
    }))

    setStudents(prev => prev.map(student => {
      const newProgress = { ...(student.progress?.[level] || {}) }
      delete newProgress[itemId]
      subItemIds.forEach(subId => delete newProgress[subId])
      return {
        ...student,
        progress: {
          ...student.progress,
          [level]: newProgress
        }
      }
    }))
  }

  const deleteSubItem = (level, itemId, subItemId) => {
    markLocalChange()
    setChecklists(prev => ({
      ...prev,
      [level]: (prev[level] || []).map(item =>
        item.id === itemId
          ? { ...item, subItems: (item.subItems || []).filter(s => s.id !== subItemId) }
          : item
      )
    }))

    setStudents(prev => prev.map(student => {
      const newProgress = { ...(student.progress?.[level] || {}) }
      delete newProgress[subItemId]
      return {
        ...student,
        progress: {
          ...student.progress,
          [level]: newProgress
        }
      }
    }))
  }

  const reorderItems = (level, fromIndex, toIndex) => {
    markLocalChange()
    setChecklists(prev => {
      const items = [...(prev[level] || [])]
      const [removed] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, removed)
      return {
        ...prev,
        [level]: items
      }
    })
  }

  const reorderSubItems = (level, itemId, fromIndex, toIndex) => {
    markLocalChange()
    setChecklists(prev => ({
      ...prev,
      [level]: (prev[level] || []).map(item => {
        if (item.id !== itemId) return item
        const subItems = [...(item.subItems || [])]
        const [removed] = subItems.splice(fromIndex, 1)
        subItems.splice(toIndex, 0, removed)
        return { ...item, subItems }
      })
    }))
  }

  // ========== PROGRESS FUNCTIONS ==========

  const toggleProgress = (studentId, level, itemId) => {
    markLocalChange()
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student
      const levelProgress = student.progress?.[level] || {}
      return {
        ...student,
        progress: {
          ...student.progress,
          [level]: {
            ...levelProgress,
            [itemId]: !levelProgress[itemId]
          }
        }
      }
    }))
  }

  const graduateStudent = (studentId) => {
    markLocalChange()
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student
      const currentIndex = LEVEL_ORDER.indexOf(student.currentLevel)
      if (currentIndex < LEVEL_ORDER.length - 1) {
        return {
          ...student,
          currentLevel: LEVEL_ORDER[currentIndex + 1]
        }
      }
      return student
    }))
  }

  const calculateCompletion = (student, level) => {
    const items = checklists[level]
    if (!items || items.length === 0) return 0
    
    let total = 0
    let completed = 0
    
    items.forEach(item => {
      total++
      if (student.progress[level]?.[item.id]) completed++
      item.subItems?.forEach(sub => {
        total++
        if (student.progress[level]?.[sub.id]) completed++
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
          <span className="logo-icon">📚</span>
          <h1>Progress Tracker</h1>
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
        <div className="level-tabs">
          {LEVEL_ORDER.map(level => (
            <button
              key={level}
              className={`level-tab ${activeLevel === level ? 'active' : ''}`}
              style={{
                '--level-color': LEVEL_COLORS[level],
                '--level-text': LEVEL_TEXT_COLORS[level]
              }}
              onClick={() => setActiveLevel(level)}
            >
              {LEVEL_NAMES[level]}
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
            activeLevel={activeLevel}
            levelColors={LEVEL_COLORS}
            levelTextColors={LEVEL_TEXT_COLORS}
            levelOrder={LEVEL_ORDER}
            levelNames={LEVEL_NAMES}
            sortBy={studentSortBy}
            onSortChange={(newSort) => { markLocalChange(); setStudentSortBy(newSort); }}
          />
        )}

        {view === 'progress' && selectedStudent && (
          <StudentProgress
            student={students.find(s => s.id === selectedStudent.id) || selectedStudent}
            checklists={checklists}
            songs={songs}
            activeLevel={activeLevel}
            onToggleProgress={toggleProgress}
            onGraduate={graduateStudent}
            calculateCompletion={calculateCompletion}
            levelColors={LEVEL_COLORS}
            levelTextColors={LEVEL_TEXT_COLORS}
            levelOrder={LEVEL_ORDER}
            levelNames={LEVEL_NAMES}
          />
        )}

        {view === 'manage' && (
          <ChecklistManager
            checklists={checklists}
            activeLevel={activeLevel}
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
            levelColors={LEVEL_COLORS}
            levelNames={LEVEL_NAMES}
          />
        )}

        {view === 'songs' && (
          <SongManager
            songs={songs}
            checklists={checklists}
            onAddSong={addSong}
            onEditSong={editSong}
            onDeleteSong={deleteSong}
            levelNames={LEVEL_NAMES}
          />
        )}
      </main>
    </div>
  )
}

export default App
