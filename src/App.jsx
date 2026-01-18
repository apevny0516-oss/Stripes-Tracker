import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, setDoc, onSnapshot, collection, deleteDoc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import LoginScreen from './components/LoginScreen'
import PendingApproval from './components/PendingApproval'
import AdminPanel from './components/AdminPanel'
import StudentList from './components/StudentList'
import StudentProgress from './components/StudentProgress'
import TabManager from './components/TabManager'
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
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [students, setStudents] = useState([])
  const [checklists, setChecklists] = useState(createEmptyChecklists())
  const [songs, setSongs] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [view, setView] = useState('students')
  const [activeLevel, setActiveLevel] = useState('level1')
  const [studentSortBy, setStudentSortBy] = useState('name-asc')
  const [allUsers, setAllUsers] = useState([])
  
  // Tab Vault state
  const [tabLibrary, setTabLibrary] = useState(null)
  const [tabGenres, setTabGenres] = useState([])
  const [tabMetadata, setTabMetadata] = useState({})
  const [tabLastSynced, setTabLastSynced] = useState(null)
  
  // Export/Import state
  const [showExportImport, setShowExportImport] = useState(false)
  
  const hasLocalChanges = useRef(false)
  const isSaving = useRef(false)
  const isInitialLoad = useRef(true)

  const isAdmin = user?.email === ADMIN_EMAIL
  const myStudent = !isAdmin ? students.find(s => s.linkedUserId === user?.uid) : null

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      
      if (currentUser) {
        if (currentUser.email === ADMIN_EMAIL) {
          setUserRole('admin')
        } else {
          const userDocRef = doc(db, 'appUsers', currentUser.uid)
          const unsubUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data()
              setUserRole(userData.status || 'pending')
            } else {
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
          return () => unsubUser()
        }
      } else {
        setUserRole(null)
        setDataLoaded(false)
        hasLocalChanges.current = false
        isInitialLoad.current = true
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

  // Load data from Firestore
  useEffect(() => {
    if (!user || (userRole !== 'admin' && userRole !== 'approved')) return

    const dataDocRef = doc(db, 'appData', 'main')
    
    const unsubscribe = onSnapshot(dataDocRef, (docSnap) => {
      // For admin: skip updates while saving or with local changes
      // For students: always accept updates from Firebase
      if (isAdmin && (isSaving.current || hasLocalChanges.current)) return
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        
        // Always load data for students, or on initial load for admin
        const shouldLoadAll = !isAdmin || isInitialLoad.current || !dataLoaded
        
        if (shouldLoadAll) {
          if (data.students) setStudents(data.students)
          if (data.checklists) setChecklists(data.checklists)
          if (data.songs) setSongs(data.songs)
          if (data.studentSortBy && isAdmin) setStudentSortBy(data.studentSortBy)
          isInitialLoad.current = false
        }
        
        // Tab Vault data - always update for everyone (it's read-only for students)
        if (data.tabLibrary !== undefined) {
          console.log('Loading Tab Vault from Firebase:', {
            artistCount: data.tabLibrary?.artists?.length || 0,
            tabCount: data.tabLibrary?.artists?.reduce((sum, a) => sum + (a.songs?.length || 0), 0) || 0
          })
          setTabLibrary(data.tabLibrary)
        }
        if (data.tabGenres !== undefined) setTabGenres(data.tabGenres)
        if (data.tabMetadata !== undefined) setTabMetadata(data.tabMetadata)
        if (data.tabLastSynced !== undefined) setTabLastSynced(data.tabLastSynced)
      }
      setDataLoaded(true)
    })

    return () => unsubscribe()
  }, [user, userRole, isAdmin])

  // Save data to Firestore (admin only)
  useEffect(() => {
    if (!user || loading || !dataLoaded || !isAdmin) return
    if (!hasLocalChanges.current) return

    const saveTimeout = setTimeout(async () => {
      try {
        isSaving.current = true
        const dataDocRef = doc(db, 'appData', 'main')
        
        const dataToSave = {
          students,
          checklists,
          songs,
          studentSortBy,
          tabLibrary,
          tabGenres,
          tabMetadata,
          tabLastSynced,
          lastUpdated: new Date().toISOString()
        }
        
        console.log('Saving to Firebase...', {
          hasTabLibrary: !!tabLibrary,
          tabCount: tabLibrary?.artists?.reduce((sum, a) => sum + (a.songs?.length || 0), 0) || 0
        })
        
        await setDoc(dataDocRef, dataToSave, { merge: true })
        
        console.log('Saved successfully!')
        hasLocalChanges.current = false
      } catch (error) {
        console.error('Error saving data:', error)
        alert('Failed to save Tab Vault to database. Error: ' + error.message)
      }
      isSaving.current = false
    }, 1000)

    return () => clearTimeout(saveTimeout)
  }, [students, checklists, songs, studentSortBy, tabLibrary, tabGenres, tabMetadata, tabLastSynced, user, loading, dataLoaded, isAdmin])

  const markLocalChange = () => {
    hasLocalChanges.current = true
  }

  // ========== TAB VAULT FUNCTIONS ==========
  
  const saveTabLibrary = (library) => {
    if (!isAdmin) return
    markLocalChange()
    setTabLibrary(library)
    setTabLastSynced(new Date().toISOString())
  }

  const saveTabGenres = (genres) => {
    if (!isAdmin) return
    markLocalChange()
    setTabGenres(genres)
  }

  const saveTabMetadata = (metadata) => {
    if (!isAdmin) return
    markLocalChange()
    setTabMetadata(metadata)
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
      isInitialLoad.current = true
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // ========== EXPORT/IMPORT FUNCTIONS ==========

  const exportToCSV = () => {
    // Export Students
    let studentsCSV = 'ID,Name,Current Level,Linked User ID,Date Added\n'
    students.forEach(s => {
      studentsCSV += `"${s.id}","${s.name}","${s.currentLevel}","${s.linkedUserId || ''}","${s.dateAdded}"\n`
    })

    // Export Songs
    let songsCSV = 'ID,Artist,Title,Date Added\n'
    songs.forEach(s => {
      songsCSV += `"${s.id}","${s.artist || ''}","${s.title}","${s.dateAdded}"\n`
    })

    // Export Checklists (all levels)
    let checklistsCSV = 'Level,Item ID,Item Text,Sub Item ID,Sub Item Text,Linked Songs,Lesson Content\n'
    LEVEL_ORDER.forEach(level => {
      const items = checklists[level] || []
      items.forEach(item => {
        checklistsCSV += `"${level}","${item.id}","${item.text}","","","${(item.linkedSongs || []).join(';')}","${(item.lessonContent || '').replace(/"/g, '""')}"\n`
        if (item.subItems) {
          item.subItems.forEach(sub => {
            checklistsCSV += `"${level}","${item.id}","${item.text}","${sub.id}","${sub.text}","${(sub.linkedSongs || []).join(';')}","${(sub.lessonContent || '').replace(/"/g, '""')}"\n`
          })
        }
      })
    })

    // Export Progress (one file per student would be complex, so we'll do JSON)
    const fullExport = {
      exportDate: new Date().toISOString(),
      students,
      songs,
      checklists,
      studentSortBy
    }

    // Create download links
    const downloadCSV = (content, filename) => {
      const blob = new Blob([content], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }

    const downloadJSON = (content, filename) => {
      const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }

    downloadCSV(studentsCSV, 'students.csv')
    downloadCSV(songsCSV, 'songs.csv')
    downloadCSV(checklistsCSV, 'curriculum.csv')
    downloadJSON(fullExport, 'full_backup.json')
  }

  const importFromJSON = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        
        if (confirm('This will replace ALL current data with the imported data. Are you sure?')) {
          if (data.students) setStudents(data.students)
          if (data.songs) setSongs(data.songs)
          if (data.checklists) setChecklists(data.checklists)
          if (data.studentSortBy) setStudentSortBy(data.studentSortBy)
          markLocalChange()
          alert('Data imported successfully!')
        }
      } catch (error) {
        console.error('Import error:', error)
        alert('Error importing data. Please make sure the file is a valid JSON backup.')
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Reset file input
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

  const linkUserToStudent = (studentId, userId) => {
    markLocalChange()
    setStudents(prev => prev.map(student => {
      if (student.id === studentId) {
        return { ...student, linkedUserId: userId }
      }
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

  const addSong = (songData) => {
    if (!isAdmin) return
    markLocalChange()
    
    // Handle both old format (artist, title) and new format (object)
    let newSong
    if (typeof songData === 'string') {
      // Old format: addSong(artist, title) - for backwards compatibility
      const [artist, title] = arguments
      newSong = {
        id: uuidv4(),
        artist: artist || '',
        title: title || '',
        dateAdded: new Date().toISOString()
      }
    } else {
      // New format: addSong({ artist, title, soundsliceUrl, ... })
      newSong = {
        id: uuidv4(),
        artist: songData.artist || '',
        title: songData.title || '',
        soundsliceUrl: songData.soundsliceUrl || '',
        type: songData.type || [],
        tuning: songData.tuning || 'E Standard (E A D G B E)',
        difficulty: songData.difficulty || '',
        techniques: songData.techniques || [],
        theory: songData.theory || [],
        genre: songData.genre || [],
        guitarProUrl: songData.guitarProUrl || '',
        hasBackingTrack: songData.hasBackingTrack || false,
        notes: songData.notes || '',
        openChordsUsed: songData.openChordsUsed || [],
        dateAdded: new Date().toISOString()
      }
    }
    
    setSongs([...songs, newSong])
    return newSong.id
  }

  const editSong = (songId, songData) => {
    if (!isAdmin) return
    markLocalChange()
    
    // Handle both old format (songId, artist, title) and new format (songId, object)
    if (typeof songData === 'string') {
      // Old format for backwards compatibility
      const [, artist, title] = arguments
      setSongs(songs.map(s => 
        s.id === songId ? { ...s, artist, title } : s
      ))
    } else {
      // New format with full song data
      setSongs(songs.map(s => 
        s.id === songId ? { 
          ...s, 
          artist: songData.artist ?? s.artist,
          title: songData.title ?? s.title,
          soundsliceUrl: songData.soundsliceUrl ?? s.soundsliceUrl,
          type: songData.type ?? s.type,
          tuning: songData.tuning ?? s.tuning,
          difficulty: songData.difficulty ?? s.difficulty,
          techniques: songData.techniques ?? s.techniques,
          theory: songData.theory ?? s.theory,
          genre: songData.genre ?? s.genre,
          guitarProUrl: songData.guitarProUrl ?? s.guitarProUrl,
          hasBackingTrack: songData.hasBackingTrack ?? s.hasBackingTrack,
          notes: songData.notes ?? s.notes,
          openChordsUsed: songData.openChordsUsed ?? s.openChordsUsed
        } : s
      ))
    }
  }
  
  // Import songs from CSV data
  const importSongsFromCSV = (csvText) => {
    if (!isAdmin) return
    
    const lines = csvText.split('\n')
    if (lines.length < 2) return { imported: 0, errors: [] }
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    const importedSongs = []
    const errors = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      // Parse CSV line (handle quoted values)
      const values = []
      let current = ''
      let inQuotes = false
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())
      
      // Create song object from row
      const row = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      
      if (!row.title && !row.artist) continue
      
      // Parse type field (can be comma-separated)
      const parseTypes = (typeStr) => {
        if (!typeStr) return []
        return typeStr.split(',').map(t => t.trim()).filter(Boolean)
      }
      
      // Parse genre field
      const parseGenre = (genreStr) => {
        if (!genreStr) return []
        return genreStr.split(',').map(g => g.trim()).filter(Boolean)
      }
      
      // Parse techniques
      const parseTechniques = (techStr) => {
        if (!techStr) return []
        return techStr.split(',').map(t => t.trim()).filter(Boolean)
      }
      
      try {
        const song = {
          id: uuidv4(),
          artist: row.artist || '',
          title: row.title || '',
          soundsliceUrl: row.soundslice || '',
          type: parseTypes(row.type),
          tuning: row.tuning || 'E Standard (E A D G B E)',
          difficulty: row.difficulty || '',
          techniques: parseTechniques(row.techniques),
          theory: parseTechniques(row.theory),
          genre: parseGenre(row.genre),
          guitarProUrl: row['guitar pro & pdf'] || row.guitarpro || '',
          hasBackingTrack: row['backing track?'] === 'true' || row['backing track?'] === 'TRUE',
          notes: row.notes || '',
          openChordsUsed: row['open chords used'] ? row['open chords used'].split(',').map(c => c.trim()).filter(Boolean) : [],
          dateAdded: new Date().toISOString()
        }
        
        // Only add if we have at least a title
        if (song.title || song.artist) {
          importedSongs.push(song)
        }
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`)
      }
    }
    
    if (importedSongs.length > 0) {
      markLocalChange()
      setSongs(prev => [...prev, ...importedSongs])
    }
    
    return { imported: importedSongs.length, errors }
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
    // ONLY admin can toggle progress
    if (!isAdmin) return
    
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

  // Show login screen
  if (!user) {
    return <LoginScreen onLogin={setUser} />
  }

  // Show pending approval screen
  if (userRole === 'pending') {
    return <PendingApproval user={user} />
  }

  // Denied users
  if (userRole === 'denied') {
    return (
      <div className="pending-approval-screen">
        <div className="pending-card denied">
          <div className="pending-icon">🚫</div>
          <h1>Access Denied</h1>
          <p>Your access request was denied.</p>
          <button onClick={handleLogout} className="sign-out-btn">Sign Out</button>
        </div>
      </div>
    )
  }

  // Approved users not linked to a student
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
            <button className="curriculum-btn" onClick={() => setView('curriculum')}>
              📖 View Curriculum
            </button>
            <button className="songs-btn" onClick={() => setView('tabs')}>
              🎸 View Tab Vault
            </button>
          </div>
          <button onClick={handleLogout} className="sign-out-btn" style={{ marginTop: '1rem' }}>
            Sign Out
          </button>
        </div>
        
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
                isAdmin={false}
              />
            </div>
          </div>
        )}
        {view === 'tabs' && (
          <div className="modal-overlay" onClick={() => setView('students')}>
            <div className="modal-content wide" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setView('students')}>×</button>
              <TabManager
                isAdmin={false}
                tabLibrary={tabLibrary}
                tabGenres={tabGenres}
                tabMetadata={tabMetadata}
                lastSyncedTime={tabLastSynced}
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
                className={`nav-tab ${view === 'tabs' ? 'active' : ''}`}
                onClick={() => setView('tabs')}
              >
                🎸 Tab Vault
              </button>
            </>
          )}
          
          <button 
            className={`nav-tab curriculum-tab ${view === 'curriculum' ? 'active' : ''}`}
            onClick={() => setView('curriculum')}
          >
            📖 {!isAdmin && myStudent ? 'My Progress' : 'Curriculum'}
          </button>

          {!isAdmin && (
            <button 
              className={`nav-tab ${view === 'tabs' ? 'active' : ''}`}
              onClick={() => setView('tabs')}
            >
              🎸 Tab Vault
            </button>
          )}

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
          {isAdmin && (
            <>
              <span className="admin-badge">Admin</span>
              <button 
                className="export-import-btn"
                onClick={() => setShowExportImport(!showExportImport)}
                title="Export/Import Data"
              >
                💾
              </button>
            </>
          )}
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

      {/* Export/Import Panel */}
      {showExportImport && isAdmin && (
        <div className="export-import-panel">
          <div className="export-import-content">
            <h3>📦 Backup & Restore</h3>
            <div className="export-import-actions">
              <button className="export-btn" onClick={exportToCSV}>
                📤 Export All Data
              </button>
              <label className="import-btn">
                📥 Import Backup
                <input 
                  type="file" 
                  accept=".json"
                  onChange={importFromJSON}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <p className="export-hint">
              Export downloads 4 files: students.csv, songs.csv, curriculum.csv, and full_backup.json.
              Use the JSON file to restore your data.
            </p>
            <button className="close-panel-btn" onClick={() => setShowExportImport(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Level tabs for admin on students/progress views */}
      {isAdmin && (view === 'students' || view === 'progress') && (
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
            onToggleProgress={isAdmin ? toggleProgress : null}
            onGraduate={isAdmin ? graduateStudent : null}
            calculateCompletion={calculateCompletion}
            levelColors={LEVEL_COLORS}
            levelTextColors={LEVEL_TEXT_COLORS}
            levelOrder={LEVEL_ORDER}
            levelNames={LEVEL_NAMES}
            isAdmin={isAdmin}
          />
        )}

        {view === 'tabs' && (
          <TabManager
            isAdmin={isAdmin}
            tabLibrary={tabLibrary}
            tabGenres={tabGenres}
            tabMetadata={tabMetadata}
            lastSyncedTime={tabLastSynced}
            onSaveLibrary={isAdmin ? saveTabLibrary : null}
            onSaveGenres={isAdmin ? saveTabGenres : null}
            onSaveMetadata={isAdmin ? saveTabMetadata : null}
          />
        )}

        {view === 'curriculum' && (
          <CurriculumView
            checklists={checklists}
            levelColors={LEVEL_COLORS}
            levelTextColors={LEVEL_TEXT_COLORS}
            levelNames={LEVEL_NAMES}
            levelOrder={LEVEL_ORDER}
            isAdmin={isAdmin}
            onAddItem={isAdmin ? addChecklistItem : null}
            onAddSubItem={isAdmin ? addSubItem : null}
            onDeleteItem={isAdmin ? deleteChecklistItem : null}
            onDeleteSubItem={isAdmin ? deleteSubItem : null}
            onReorderItems={isAdmin ? reorderItems : null}
            onReorderSubItems={isAdmin ? reorderSubItems : null}
            onMoveItem={isAdmin ? moveChecklistItem : null}
            onSaveLessonContent={isAdmin ? saveLessonContent : null}
            onLinkSong={isAdmin ? linkSong : null}
            onUnlinkSong={isAdmin ? unlinkSong : null}
            onAddSong={isAdmin ? addSong : null}
            songs={songs}
            studentProgress={!isAdmin && myStudent ? myStudent.progress : null}
            studentName={!isAdmin && myStudent ? myStudent.name : null}
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
