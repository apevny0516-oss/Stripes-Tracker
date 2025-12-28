import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, setDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore'
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
                assignedStudents: [],
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

  // Load data from Firestore when user logs in (admin only loads main data)
  useEffect(() => {
    if (!user || (userRole !== 'admin' && userRole !== 'approved')) return

    // For admin, load from admin's data store
    // For approved users, load from admin's shared data
    const dataDocRef = doc(db, 'appData', 'main')
    
    const unsubscribe = onSnapshot(dataDocRef, (docSnap) => {
      // Don't update state from remote if we're saving or have pending changes
      // This prevents remote updates from overwriting unsaved local work
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

  // Save data to Firestore (debounced) - admin only
  useEffect(() => {
    if (!user || loading || !dataLoaded || !isAdmin) return
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
  }, [students, checklists, songs, studentSortBy, user, loading, dataLoaded, isAdmin])

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
      const userDocRef = doc(db, 'appUsers', userId)
      await deleteDoc(userDocRef)
    } catch (error) {
      console.error('Error denying user:', error)
    }
  }

  const assignStudentToUser = (studentId, userId) => {
    markLocalChange()
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student
      const currentAssigned = student.assignedTo || []
      if (currentAssigned.includes(userId)) return student
      return { ...student, assignedTo: [...currentAssigned, userId] }
    }))
  }

  const unassignStudentFromUser = (studentId, userId) => {
    markLocalChange()
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student
      return { 
        ...student, 
        assignedTo: (student.assignedTo || []).filter(id => id !== userId) 
      }
    }))
  }

  // Get students visible to current user
  const getVisibleStudents = () => {
    if (isAdmin) return students
    // For approved users, only show assigned students
    return students.filter(s => s.assignedTo?.includes(user?.uid))
  }

  // ========== STUDENT FUNCTIONS ==========
  
  const addStudent = (name) => {
    if (!isAdmin) return // Only admin can add students
    markLocalChange()
    const newStudent = {
      id: uuidv4(),
      name,
      currentLevel: 'level1',
      progress: createStudentProgress(checklists),
      assignedTo: [],
      dateAdded: new Date().toISOString()
    }
    setStudents([...students, newStudent])
  }

  const deleteStudent = (studentId) => {
    if (!isAdmin) return // Only admin can delete students
    markLocalChange()
    setStudents(students.filter(s => s.id !== studentId))
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(null)
      setView('students')
    }
  }

  const editStudentName = (studentId, newName) => {
    if (!isAdmin) return // Only admin can edit student names
    markLocalChange()
    setStudents(students.map(s => 
      s.id === studentId ? { ...s, name: newName } : s
    ))
  }

  // ========== SONG FUNCTIONS ==========

  const addSong = (artist, title) => {
    if (!isAdmin) return // Only admin can add songs
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
    if (!isAdmin) return // Only admin can edit songs
    markLocalChange()
    setSongs(songs.map(s => 
      s.id === songId ? { ...s, artist, title } : s
    ))
  }

  const deleteSong = (songId) => {
    if (!isAdmin) return // Only admin can delete songs
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
    if (!isAdmin) return // Only admin can link songs
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
    if (!isAdmin) return // Only admin can unlink songs
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
    if (!isAdmin) return // Only admin can add checklist items
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
    if (!isAdmin) return // Only admin can add sub-items
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
    if (!isAdmin) return // Only admin can delete checklist items
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
    if (!isAdmin) return // Only admin can delete sub-items
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
    if (!isAdmin) return // Only admin can reorder items
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
    if (!isAdmin) return // Only admin can reorder sub-items
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
    if (!isAdmin) return // Only admin can save lesson content
    markLocalChange()
    setChecklists(prev => ({
      ...prev,
      [level]: (prev[level] || []).map(item => {
        if (item.id !== itemId) return item
        
        if (subItemId) {
          // Save to sub-item
          return {
            ...item,
            subItems: (item.subItems || []).map(sub => {
              if (sub.id !== subItemId) return sub
              return { ...sub, lessonContent: content }
            })
          }
        } else {
          // Save to main item
          return { ...item, lessonContent: content }
        }
      })
    }))
  }

  const moveChecklistItem = (fromLevel, itemId, toLevel) => {
    if (!isAdmin) return // Only admin can move items
    markLocalChange()
    
    // Find the item to move
    const item = (checklists[fromLevel] || []).find(i => i.id === itemId)
    if (!item) return

    // Get all IDs (main item + sub-items) for progress migration
    const allIds = [item.id, ...(item.subItems || []).map(s => s.id)]

    // Remove from source level and add to target level
    setChecklists(prev => ({
      ...prev,
      [fromLevel]: (prev[fromLevel] || []).filter(i => i.id !== itemId),
      [toLevel]: [...(prev[toLevel] || []), item]
    }))

    // Update student progress: move progress from source to target level
    setStudents(prev => prev.map(student => {
      const fromProgress = { ...(student.progress?.[fromLevel] || {}) }
      const toProgress = { ...(student.progress?.[toLevel] || {}) }

      // Move progress for all IDs
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
    // Check if user can modify this student's progress
    const student = students.find(s => s.id === studentId)
    if (!student) return
    if (!isAdmin && !student.assignedTo?.includes(user?.uid)) return
    
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
    // Check if user can graduate this student
    const student = students.find(s => s.id === studentId)
    if (!student) return
    if (!isAdmin && !student.assignedTo?.includes(user?.uid)) return
    
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

  // Get visible students for current user
  const visibleStudents = getVisibleStudents()

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">📚</span>
          <h1>Progress Tracker</h1>
        </div>
        <nav className="nav-tabs">
          {/* Admin-only tabs */}
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
          
          {/* Non-admin users can see their assigned students */}
          {!isAdmin && visibleStudents.length > 0 && (
            <>
              <button 
                className={`nav-tab ${view === 'students' ? 'active' : ''}`}
                onClick={() => setView('students')}
              >
                My Students
              </button>
              <button 
                className={`nav-tab ${view === 'progress' ? 'active' : ''}`}
                onClick={() => setView('progress')}
                disabled={!selectedStudent}
              >
                Progress
              </button>
            </>
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

      {view !== 'songs' && view !== 'manage' && view !== 'curriculum' && view !== 'admin' && (
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
            students={visibleStudents}
            onAddStudent={isAdmin ? addStudent : null}
            onDeleteStudent={isAdmin ? deleteStudent : null}
            onEditStudentName={isAdmin ? editStudentName : null}
            onSelectStudent={selectStudent}
            calculateCompletion={calculateCompletion}
            activeLevel={activeLevel}
            levelColors={LEVEL_COLORS}
            levelTextColors={LEVEL_TEXT_COLORS}
            levelOrder={LEVEL_ORDER}
            levelNames={LEVEL_NAMES}
            sortBy={studentSortBy}
            onSortChange={isAdmin ? ((newSort) => { markLocalChange(); setStudentSortBy(newSort); }) : null}
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
            onGraduate={graduateStudent}
            calculateCompletion={calculateCompletion}
            levelColors={LEVEL_COLORS}
            levelTextColors={LEVEL_TEXT_COLORS}
            levelOrder={LEVEL_ORDER}
            levelNames={LEVEL_NAMES}
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
            onAssignStudent={assignStudentToUser}
            onUnassignStudent={unassignStudentFromUser}
            levelColors={LEVEL_COLORS}
            levelNames={LEVEL_NAMES}
          />
        )}
      </main>
    </div>
  )
}

export default App
