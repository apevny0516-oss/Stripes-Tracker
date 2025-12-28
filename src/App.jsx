import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import LoginScreen from './components/LoginScreen'
import PendingApproval from './components/PendingApproval'
import AdminPanel from './components/AdminPanel'
import StudentList from './components/StudentList'
import StudentProgress from './components/StudentProgress'
import ChecklistManager from './components/ChecklistManager'
import SongManager from './components/SongManager'
import CurriculumView from './components/CurriculumView'
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

// Admin email - only this user has full access
const ADMIN_EMAIL = 'apevny0516@gmail.com'

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
  const [userRole, setUserRole] = useState(null) // 'admin', 'approved', 'pending', 'denied'
  const [loading, setLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [students, setStudents] = useState([])
  const [checklists, setChecklists] = useState(createEmptyChecklists())
  const [songs, setSongs] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [view, setView] = useState('students')
  const [activeLevel, setActiveLevel] = useState('level1')
  const [studentSortBy, setStudentSortBy] = useState('name-asc')
  
  // For admin: list of all users
  const [allUsers, setAllUsers] = useState([])
  
  // Track if we have pending local changes to save
  const hasLocalChanges = useRef(false)
  const isSaving = useRef(false)

  // Check if current user is admin
  const isAdmin = user?.email === ADMIN_EMAIL

  // Get the student linked to the current user (for non-admin users)
  const myStudent = !isAdmin ? students.find(s => s.linkedUserId === user?.uid) : null

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      
      if (currentUser) {
        // Check if this is the admin
        if (currentUser.email === ADMIN_EMAIL) {
          setUserRole('admin')
        } else {
          // Check user status in Firestore
          const userDocRef = doc(db, 'appUsers', currentUser.uid)
          const unsubUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data()
              setUserRole(userData.status || 'pending')
            } else {
              // First time user - create pending record
              setDoc(userDocRef, {
                id: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                status: 'pending',
                createdAt: new Date().toISOString()
              })
              setUserRole('pending')
            }
          })
          // Store unsubscribe function for cleanup
          return () => unsubUser()
        }
      } else {
        setUserRole(null)
        setDataLoaded(false)
        hasLocalChanges.current = false
      }
      
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Load all users for admin
  useEffect(() => {
    if (!isAdmin) return

    const unsubscribe = onSnapshot(collection(db, 'appUsers'), (snapshot) => {
      const users = []
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() })
      })
      setAllUsers(users)
    })

    return () => unsubscribe()
  }, [isAdmin])

  // Load data from Firestore when user logs in
  useEffect(() => {
    if (!user || (userRole !== 'admin' && userRole !== 'approved')) return

    const dataDocRef = doc(db, 'appData', 'main')
    
    const unsubscribe = onSnapshot(dataDocRef, (docSnap) => {
      // Don't update state from remote if we're saving or have pending changes
      if (isSaving.current || hasLocalChanges.current) return
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.students) setStudents(data.students)
        if (data.checklists) setChecklists(data.checklists)
        if (data.songs) setSongs(data.songs)
        if (data.studentSortBy && isAdmin) setStudentSortBy(data.studentSortBy)
      }
      setDataLoaded(true)
    })

    return () => unsubscribe()
  }, [user, userRole, isAdmin])

  // Save data to Firestore (debounced) - admin only for most changes
  // But also allow students to save their own progress
  useEffect(() => {
    if (!user || loading || !dataLoaded) return
    if (!hasLocalChanges.current) return

    const saveTimeout = setTimeout(async () => {
      try {
        isSaving.current = true
        const dataDocRef = doc(db, 'appData', 'main')
        
        await setDoc(dataDocRef, {
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
      setUserRole(null)
      setStudents([])
      setChecklists(createEmptyChecklists())
      setSongs([])
      setSelectedStudent(null)
      setView('students')
      setAllUsers([])
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // ========== ADMIN FUNCTIONS ==========

  const approveUser = async (userId) => {
    try {
      const userDocRef = doc(db, 'appUsers', userId)
      await setDoc(userDocRef, { status: 'approved' }, { merge: true })
    } catch (error) {
      console.error('Error approving user:', error)
    }
  }

  const denyUser = async (userId) => {
    try {
      // Also unlink any student that was linked to this user
      const linkedStudent = students.find(s => s.linkedUserId === userId)
      if (linkedStudent) {
        markLocalChange()
        setStudents(prev => prev.map(s => 
          s.id === linkedStudent.id ? { ...s, linkedUserId: null } : s
        ))
      }
      
      const userDocRef = doc(db, 'appUsers', userId)
      await deleteDoc(userDocRef)
    } catch (error) {
      console.error('Error denying user:', error)
    }
  }

  // Link a user to a student (one-to-one relationship)
  const linkUserToStudent = (studentId, userId) => {
    markLocalChange()
    setStudents(prev => prev.map(student => {
      // If unlinking (userId is null), just clear the link on this student
      if (student.id === studentId) {
        return { ...student, linkedUserId: userId }
      }
      // If linking to a new user, make sure no other student has this user
      if (userId && student.linkedUserId === userId) {
        return { ...student, linkedUserId: null }
      }
      return student
    }))
  }

  // ========== STUDENT FUNCTIONS ==========
  
  const addStudent = (name) => {
    if (!isAdmin) return
    markLocalChange()
    const newStudent = {
      id: uuidv4(),
      name,
      currentLevel: 'level1',
      progress: createStudentProgress(checklists),
      linkedUserId: null,
      dateAdded: new Date().toISOString()
    }
    setStudents([...students, newStudent])
  }

  const deleteStudent = (studentId) => {
    if (!isAdmin) return
    markLocalChange()
    setStudents(students.filter(s => s.id !== studentId))
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(null)
      setView('students')
    }
  }

  const editStudentName = (studentId, newName) => {
    if (!isAdmin) return
    markLocalChange()
    setStudents(students.map(s => 
      s.id === studentId ? { ...s, name: newName } : s
    ))
  }

  // ========== SONG FUNCTIONS ==========

  const addSong = (artist, title) => {
    if (!isAdmin) return
    markLocalChange()
    const newSong = {
      id: uuidv4(),
      artist,
      title,
      dateAdded: new Date().toISOString()
    }
    setSongs([...songs, newSong])
    return newSong.id
  }

  const editSong = (songId, artist, title) => {
    if (!isAdmin) return
    markLocalChange()
    setSongs(songs.map(s => 
      s.id === songId ? { ...s, artist, title } : s
    ))
  }

  const deleteSong = (songId) => {
    if (!isAdmin) return
    markLocalChange()
    setSongs(songs.filter(s => s.id !== songId))
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

  const linkSong = (level, itemId, subItemId, songId) => {
    if (!isAdmin) return
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
              const linkedSongs = sub.linkedSongs || []
              if (linkedSongs.includes(songId)) return sub
              return { ...sub, linkedSongs: [...linkedSongs, songId] }
            })
          }
        } else {
          const linkedSongs = item.linkedSongs || []
          if (linkedSongs.includes(songId)) return item
          return { ...item, linkedSongs: [...linkedSongs, songId] }
        }
      })
    }))
  }

  const unlinkSong = (level, itemId, subItemId, songId) => {
    if (!isAdmin) return
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
    if (!isAdmin) return
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
    if (!isAdmin) return
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
    if (!isAdmin) return
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
    if (!isAdmin) return
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
    if (!isAdmin) return
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
    if (!isAdmin) return
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

  const saveLessonContent = (level, itemId, subItemId, content) => {
    if (!isAdmin) return
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
              return { ...sub, lessonContent: content }
            })
          }
        } else {
          return { ...item, lessonContent: content }
        }
      })
    }))
  }

  const moveChecklistItem = (fromLevel, itemId, toLevel) => {
    if (!isAdmin) return
    markLocalChange()
    
    const item = (checklists[fromLevel] || []).find(i => i.id === itemId)
    if (!item) return

    const allIds = [item.id, ...(item.subItems || []).map(s => s.id)]

    setChecklists(prev => ({
      ...prev,
      [fromLevel]: (prev[fromLevel] || []).filter(i => i.id !== itemId),
      [toLevel]: [...(prev[toLevel] || []), item]
    }))

    setStudents(prev => prev.map(student => {
      const fromProgress = { ...(student.progress?.[fromLevel] || {}) }
      const toProgress = { ...(student.progress?.[toLevel] || {}) }

      allIds.forEach(id => {
        if (id in fromProgress) {
          toProgress[id] = fromProgress[id]
          delete fromProgress[id]
        } else {
          toProgress[id] = false
        }
      })

      return {
        ...student,
        progress: {
          ...student.progress,
          [fromLevel]: fromProgress,
          [toLevel]: toProgress
        }
      }
    }))
  }

  // ========== PROGRESS FUNCTIONS ==========

  const toggleProgress = (studentId, level, itemId) => {
    // Admin can toggle any student, students can only toggle their own
    const student = students.find(s => s.id === studentId)
    if (!student) return
    if (!isAdmin && student.linkedUserId !== user?.uid) return
    
    markLocalChange()
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s
      const levelProgress = s.progress?.[level] || {}
      return {
        ...s,
        progress: {
          ...s.progress,
          [level]: {
            ...levelProgress,
            [itemId]: !levelProgress[itemId]
          }
        }
      }
    }))
  }

  const graduateStudent = (studentId) => {
    // Only admin can graduate students
    if (!isAdmin) return
    
    markLocalChange()
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s
      const currentIndex = LEVEL_ORDER.indexOf(s.currentLevel)
      if (currentIndex < LEVEL_ORDER.length - 1) {
        return {
          ...s,
          currentLevel: LEVEL_ORDER[currentIndex + 1]
        }
      }
      return s
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

  // Show pending approval screen for non-admin users awaiting approval
  if (userRole === 'pending') {
    return <PendingApproval user={user} />
  }

  // Denied users see a message
  if (userRole === 'denied') {
    return (
      <div className="pending-approval-screen">
        <div className="pending-card denied">
          <div className="pending-icon">🚫</div>
          <h1>Access Denied</h1>
          <p>Your access request was denied.</p>
          <button onClick={handleLogout} className="sign-out-btn">
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // For approved users who aren't linked to a student yet
  if (!isAdmin && !myStudent) {
    return (
      <div className="pending-approval-screen">
        <div className="pending-card">
          <div className="pending-icon">🔗</div>
          <h1>Account Not Linked</h1>
          <p className="pending-message">
            Your account has been approved, but hasn't been linked to a student profile yet.
          </p>
          <div className="pending-user-info">
            <img src={user.photoURL} alt={user.displayName} className="pending-avatar" />
            <div>
              <p className="pending-name">{user.displayName}</p>
              <p className="pending-email">{user.email}</p>
            </div>
          </div>
          <p className="pending-hint">
            Please contact your instructor to link your account to your student profile.
          </p>
          <div className="pending-actions">
            <button 
              className="curriculum-btn"
              onClick={() => setView('curriculum')}
            >
              📖 View Curriculum
            </button>
            <button 
              className="songs-btn"
              onClick={() => setView('songs')}
            >
              🎵 View Songs
            </button>
          </div>
          <button onClick={handleLogout} className="sign-out-btn" style={{ marginTop: '1rem' }}>
            Sign Out
          </button>
        </div>
        
        {/* Show curriculum/songs even if not linked */}
        {view === 'curriculum' && (
          <div className="modal-overlay" onClick={() => setView('students')}>
            <div className="modal-content wide" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setView('students')}>×</button>
              <CurriculumView
                checklists={checklists}
                levelColors={LEVEL_COLORS}
                levelTextColors={LEVEL_TEXT_COLORS}
                levelNames={LEVEL_NAMES}
                levelOrder={LEVEL_ORDER}
              />
            </div>
          </div>
        )}
        {view === 'songs' && (
          <div className="modal-overlay" onClick={() => setView('students')}>
            <div className="modal-content wide" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setView('students')}>×</button>
              <SongManager
                songs={songs}
                checklists={checklists}
                onAddSong={null}
                onEditSong={null}
                onDeleteSong={null}
                levelNames={LEVEL_NAMES}
                isReadOnly={true}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">📚</span>
          <h1>Progress Tracker</h1>
        </div>
        <nav className="nav-tabs">
          {/* Admin sees all tabs */}
          {isAdmin && (
            <>
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
            </>
          )}
          
          {/* Students see My Progress tab */}
          {!isAdmin && myStudent && (
            <button 
              className={`nav-tab ${view === 'progress' ? 'active' : ''}`}
              onClick={() => {
                setSelectedStudent(myStudent)
                setView('progress')
              }}
            >
              📊 My Progress
            </button>
          )}

          {/* Everyone can see curriculum */}
          <button 
            className={`nav-tab curriculum-tab ${view === 'curriculum' ? 'active' : ''}`}
            onClick={() => setView('curriculum')}
          >
            📖 Curriculum
          </button>

          {/* Songs view (read-only for non-admin) */}
          {!isAdmin && (
            <button 
              className={`nav-tab ${view === 'songs' ? 'active' : ''}`}
              onClick={() => setView('songs')}
            >
              🎵 Songs
            </button>
          )}

          {/* Admin panel */}
          {isAdmin && (
            <button 
              className={`nav-tab admin-tab ${view === 'admin' ? 'active' : ''}`}
              onClick={() => setView('admin')}
            >
              👑 Admin
            </button>
          )}
        </nav>
        <div className="user-section">
          {isAdmin && <span className="admin-badge">Admin</span>}
          {!isAdmin && myStudent && (
            <span className="student-name-badge">{myStudent.name}</span>
          )}
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

      {/* Level tabs - show for admin on students/progress, show for students on progress */}
      {((isAdmin && (view === 'students' || view === 'progress')) || 
        (!isAdmin && view === 'progress')) && (
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
        {view === 'students' && isAdmin && (
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
            isAdmin={isAdmin}
          />
        )}

        {view === 'progress' && selectedStudent && (
          <StudentProgress
            student={students.find(s => s.id === selectedStudent.id) || selectedStudent}
            checklists={checklists}
            songs={songs}
            activeLevel={activeLevel}
            onToggleProgress={toggleProgress}
            onGraduate={isAdmin ? graduateStudent : null}
            calculateCompletion={calculateCompletion}
            levelColors={LEVEL_COLORS}
            levelTextColors={LEVEL_TEXT_COLORS}
            levelOrder={LEVEL_ORDER}
            levelNames={LEVEL_NAMES}
            isAdmin={isAdmin}
          />
        )}

        {view === 'manage' && isAdmin && (
          <ChecklistManager
            checklists={checklists}
            onAddItem={addChecklistItem}
            onAddSubItem={addSubItem}
            onDeleteItem={deleteChecklistItem}
            onDeleteSubItem={deleteSubItem}
            onReorderItems={reorderItems}
            onReorderSubItems={reorderSubItems}
            onMoveItem={moveChecklistItem}
            onSaveLessonContent={saveLessonContent}
            onLinkSong={linkSong}
            onUnlinkSong={unlinkSong}
            onAddSong={addSong}
            songs={songs}
            levelColors={LEVEL_COLORS}
            levelNames={LEVEL_NAMES}
            levelOrder={LEVEL_ORDER}
          />
        )}

        {view === 'songs' && (
          <SongManager
            songs={songs}
            checklists={checklists}
            onAddSong={isAdmin ? addSong : null}
            onEditSong={isAdmin ? editSong : null}
            onDeleteSong={isAdmin ? deleteSong : null}
            levelNames={LEVEL_NAMES}
            isReadOnly={!isAdmin}
          />
        )}

        {view === 'curriculum' && (
          <CurriculumView
            checklists={checklists}
            levelColors={LEVEL_COLORS}
            levelTextColors={LEVEL_TEXT_COLORS}
            levelNames={LEVEL_NAMES}
            levelOrder={LEVEL_ORDER}
          />
        )}

        {view === 'admin' && isAdmin && (
          <AdminPanel
            users={allUsers}
            students={students}
            onApproveUser={approveUser}
            onDenyUser={denyUser}
            onLinkUserToStudent={linkUserToStudent}
            levelColors={LEVEL_COLORS}
            levelNames={LEVEL_NAMES}
          />
        )}
      </main>
    </div>
  )
}

export default App
