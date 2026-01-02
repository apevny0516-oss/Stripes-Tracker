import { useState } from 'react'
import LessonViewer from './LessonViewer'
import LessonEditor from './LessonEditor'

function CurriculumView({ 
  checklists, 
  levelColors, 
  levelNames, 
  levelOrder,
  levelTextColors,
  isAdmin,
  onAddItem,
  onAddSubItem,
  onDeleteItem,
  onDeleteSubItem,
  onReorderItems,
  onReorderSubItems,
  onMoveItem,
  onSaveLessonContent,
  onLinkSong,
  onUnlinkSong,
  onAddSong,
  songs,
  studentProgress,  // Student's progress data for showing checkmarks
  studentName       // Student's name for display
}) {
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [expandedLevels, setExpandedLevels] = useState(
    levelOrder.reduce((acc, level, index) => ({ ...acc, [level]: index === 0 }), {})
  )

  // Admin editing state
  const [newItemTexts, setNewItemTexts] = useState({})
  const [addingSubItemTo, setAddingSubItemTo] = useState(null)
  const [newSubItemText, setNewSubItemText] = useState('')
  const [movingItem, setMovingItem] = useState(null)
  const [linkingSongTo, setLinkingSongTo] = useState(null)
  const [songSearchTerm, setSongSearchTerm] = useState('')
  const [showCreateSong, setShowCreateSong] = useState(false)
  const [newSongArtist, setNewSongArtist] = useState('')
  const [expandedSongs, setExpandedSongs] = useState(new Set())
  const [editingLesson, setEditingLesson] = useState(null)

  // Drag state
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)
  const [draggedSubItem, setDraggedSubItem] = useState(null)
  const [dragOverSubItem, setDragOverSubItem] = useState(null)

  const toggleLevel = (level) => {
    setExpandedLevels(prev => ({
      ...prev,
      [level]: !prev[level]
    }))
  }

  const openLesson = (level, item, subItem = null) => {
    setSelectedLesson({
      level,
      item,
      subItem,
      levelName: levelNames[level],
      levelColor: levelColors[level]
    })
  }

  const closeLesson = () => {
    setSelectedLesson(null)
  }

  // Admin functions
  const toggleSongsExpanded = (level, itemId, subItemId = null) => {
    const key = subItemId ? `${level}-${itemId}-${subItemId}` : `${level}-${itemId}`
    setExpandedSongs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const isSongsExpanded = (level, itemId, subItemId = null) => {
    const key = subItemId ? `${level}-${itemId}-${subItemId}` : `${level}-${itemId}`
    return expandedSongs.has(key)
  }

  const handleAddItem = (e, level) => {
    e.preventDefault()
    const text = newItemTexts[level]?.trim()
    if (text && onAddItem) {
      onAddItem(level, text)
      setNewItemTexts(prev => ({ ...prev, [level]: '' }))
    }
  }

  const handleAddSubItem = (level, itemId) => {
    if (newSubItemText.trim() && onAddSubItem) {
      onAddSubItem(level, itemId, newSubItemText.trim())
      setNewSubItemText('')
      setAddingSubItemTo(null)
    }
  }

  const getLinkedSongs = (level, itemId, subItemId = null) => {
    const items = checklists[level] || []
    const item = items.find(i => i.id === itemId)
    if (!item) return []
    
    if (subItemId) {
      const subItem = item.subItems?.find(s => s.id === subItemId)
      return subItem?.linkedSongs || []
    }
    return item.linkedSongs || []
  }

  const getSongById = (songId) => songs?.find(s => s.id === songId)

  // Check if an item is completed in student progress
  const isItemCompleted = (level, itemId) => {
    if (!studentProgress || !studentProgress[level]) return false
    return studentProgress[level][itemId] === true
  }

  const handleLinkSong = (songId) => {
    if (linkingSongTo && onLinkSong) {
      onLinkSong(linkingSongTo.level, linkingSongTo.itemId, linkingSongTo.subItemId, songId)
      setLinkingSongTo(null)
      setSongSearchTerm('')
      setShowCreateSong(false)
      setNewSongArtist('')
    }
  }

  const handleUnlinkSong = (level, itemId, subItemId, songId) => {
    if (onUnlinkSong) {
      onUnlinkSong(level, itemId, subItemId, songId)
    }
  }

  const handleCreateAndLinkSong = () => {
    if (songSearchTerm.trim() && linkingSongTo && onAddSong && onLinkSong) {
      const newSongId = onAddSong(newSongArtist.trim(), songSearchTerm.trim())
      if (newSongId) {
        onLinkSong(linkingSongTo.level, linkingSongTo.itemId, linkingSongTo.subItemId, newSongId)
      }
      setLinkingSongTo(null)
      setSongSearchTerm('')
      setShowCreateSong(false)
      setNewSongArtist('')
    }
  }

  const handleMoveItem = (toLevel) => {
    if (movingItem && toLevel !== movingItem.level && onMoveItem) {
      onMoveItem(movingItem.level, movingItem.itemId, toLevel)
    }
    setMovingItem(null)
  }

  // Drag handlers
  const handleDragStart = (e, level, index) => {
    setDraggedItem({ level, index })
    e.dataTransfer.effectAllowed = 'move'
    e.target.classList.add('dragging')
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging')
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragOver = (e, level, index) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.level !== level || draggedSubItem) return
    setDragOverItem({ level, index })
  }

  const handleDrop = (e, level, toIndex) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.level !== level || draggedSubItem) return
    
    if (draggedItem.index !== toIndex && onReorderItems) {
      onReorderItems(level, draggedItem.index, toIndex)
    }
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleSubDragStart = (e, level, itemId, subIndex) => {
    e.stopPropagation()
    setDraggedSubItem({ level, itemId, subIndex })
    e.dataTransfer.effectAllowed = 'move'
    e.target.classList.add('dragging')
  }

  const handleSubDragEnd = (e) => {
    e.target.classList.remove('dragging')
    setDraggedSubItem(null)
    setDragOverSubItem(null)
  }

  const handleSubDragOver = (e, level, itemId, subIndex) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedSubItem || draggedSubItem.level !== level || draggedSubItem.itemId !== itemId) return
    setDragOverSubItem({ level, itemId, subIndex })
  }

  const handleSubDrop = (e, level, itemId, toIndex) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedSubItem || draggedSubItem.level !== level || draggedSubItem.itemId !== itemId) return
    
    if (draggedSubItem.subIndex !== toIndex && onReorderSubItems) {
      onReorderSubItems(level, itemId, draggedSubItem.subIndex, toIndex)
    }
    setDraggedSubItem(null)
    setDragOverSubItem(null)
  }

  const filteredSongs = (songs || []).filter(song =>
    song.title.toLowerCase().includes(songSearchTerm.toLowerCase()) ||
    song.artist.toLowerCase().includes(songSearchTerm.toLowerCase())
  )

  // Count total items across all levels
  const totalItems = levelOrder.reduce((count, level) => {
    const items = checklists[level] || []
    return count + items.length + items.reduce((subCount, item) => 
      subCount + (item.subItems?.length || 0), 0
    )
  }, 0)

  const itemsWithLessons = levelOrder.reduce((count, level) => {
    const items = checklists[level] || []
    return count + items.filter(item => item.lessonContent).length + 
      items.reduce((subCount, item) => 
        subCount + (item.subItems?.filter(sub => sub.lessonContent).length || 0), 0
      )
  }, 0)

  // Calculate student progress stats
  const calculateProgressStats = () => {
    if (!studentProgress) return null
    
    let completed = 0
    let total = 0
    
    levelOrder.forEach(level => {
      const items = checklists[level] || []
      items.forEach(item => {
        total++
        if (studentProgress[level]?.[item.id]) completed++
        
        item.subItems?.forEach(subItem => {
          total++
          if (studentProgress[level]?.[subItem.id]) completed++
        })
      })
    })
    
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }
  
  const progressStats = calculateProgressStats()

  const renderLinkedSongsSection = (level, itemId, subItemId = null) => {
    const linkedSongIds = getLinkedSongs(level, itemId, subItemId)
    if (linkedSongIds.length === 0) return null

    const isExpanded = isSongsExpanded(level, itemId, subItemId)

    return (
      <div className={`related-songs-section ${subItemId ? 'sub-item-songs' : ''}`}>
        <button 
          className="related-songs-toggle"
          onClick={(e) => {
            e.stopPropagation()
            toggleSongsExpanded(level, itemId, subItemId)
          }}
        >
          <span className={`toggle-arrow ${isExpanded ? 'expanded' : ''}`}>▶</span>
          <span className="related-songs-label">Related Songs</span>
          <span className="song-count-badge">{linkedSongIds.length}</span>
        </button>
        
        {isExpanded && (
          <div className="linked-songs">
            {linkedSongIds.map(songId => {
              const song = getSongById(songId)
              if (!song) return null
              return (
                <div key={songId} className="linked-song-tag">
                  <span className="song-tag-icon">🎵</span>
                  <span className="song-tag-text">
                    {song.artist ? `${song.artist} - ` : ''}{song.title}
                  </span>
                  {isAdmin && (
                    <button
                      className="unlink-song-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnlinkSong(level, itemId, subItemId, songId)
                      }}
                      title="Remove song"
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderSongLinkDropdown = (level, itemId, subItemId = null) => {
    const isActive = linkingSongTo?.level === level && 
                     linkingSongTo?.itemId === itemId && 
                     linkingSongTo?.subItemId === subItemId
    
    if (!isActive) return null

    const linkedSongIds = getLinkedSongs(level, itemId, subItemId)
    const availableSongs = filteredSongs.filter(s => !linkedSongIds.includes(s.id))
    const hasSearchTerm = songSearchTerm.trim().length > 0

    return (
      <div className="song-link-dropdown" onClick={e => e.stopPropagation()}>
        <input
          type="text"
          value={songSearchTerm}
          onChange={(e) => {
            setSongSearchTerm(e.target.value)
            setShowCreateSong(false)
          }}
          placeholder="Search songs or type to create new..."
          className="song-search-input"
          autoFocus
        />
        
        {showCreateSong ? (
          <div className="create-song-form">
            <p className="create-song-title">Create new song:</p>
            <input
              type="text"
              value={newSongArtist}
              onChange={(e) => setNewSongArtist(e.target.value)}
              placeholder="Artist (optional)"
              className="create-song-artist-input"
            />
            <div className="create-song-preview">
              <span className="song-dropdown-icon">🎵</span>
              <span>{newSongArtist ? `${newSongArtist} - ` : ''}{songSearchTerm}</span>
            </div>
            <div className="create-song-actions">
              <button className="create-song-btn" onClick={handleCreateAndLinkSong}>
                Create & Link
              </button>
              <button className="cancel-create-btn" onClick={() => setShowCreateSong(false)}>
                Back
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="song-dropdown-list">
              {availableSongs.length === 0 ? (
                <div className="no-songs-msg">
                  {(songs || []).length === 0 && !hasSearchTerm
                    ? 'No songs in database yet.'
                    : hasSearchTerm
                    ? `No songs matching "${songSearchTerm}"`
                    : 'All songs are already linked'}
                </div>
              ) : (
                availableSongs.map(song => (
                  <button
                    key={song.id}
                    className="song-dropdown-item"
                    onClick={() => handleLinkSong(song.id)}
                  >
                    <span className="song-dropdown-icon">🎵</span>
                    <span className="song-dropdown-text">
                      {song.artist ? `${song.artist} - ` : ''}{song.title}
                    </span>
                  </button>
                ))
              )}
            </div>
            
            {hasSearchTerm && (
              <button className="create-new-song-btn" onClick={() => setShowCreateSong(true)}>
                <span>+</span> Create "{songSearchTerm}" as new song
              </button>
            )}
          </>
        )}
        
        <button
          className="close-dropdown-btn"
          onClick={() => {
            setLinkingSongTo(null)
            setSongSearchTerm('')
            setShowCreateSong(false)
            setNewSongArtist('')
          }}
        >
          Cancel
        </button>
      </div>
    )
  }

  const renderMoveDropdown = (level, itemId) => {
    const isActive = movingItem?.level === level && movingItem?.itemId === itemId
    if (!isActive) return null

    return (
      <div className="move-item-dropdown" onClick={e => e.stopPropagation()}>
        <p className="move-dropdown-title">Move to:</p>
        <div className="move-level-options">
          {levelOrder.filter(l => l !== level).map(targetLevel => (
            <button
              key={targetLevel}
              className="move-level-btn"
              style={{ 
                backgroundColor: levelColors[targetLevel],
                color: '#fff'
              }}
              onClick={() => handleMoveItem(targetLevel)}
            >
              {levelNames[targetLevel]}
            </button>
          ))}
        </div>
        <button className="close-dropdown-btn" onClick={() => setMovingItem(null)}>
          Cancel
        </button>
      </div>
    )
  }

  // Render admin editable item
  const renderAdminItem = (level, item, index) => {
    return (
      <div 
        key={item.id} 
        className={`curriculum-item-group admin-mode ${dragOverItem?.level === level && dragOverItem?.index === index ? 'drag-over' : ''} ${draggedItem?.level === level && draggedItem?.index === index ? 'dragging' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, level, index)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, level, index)}
        onDrop={(e) => handleDrop(e, level, index)}
      >
        <div className="curriculum-item admin-item">
          <div className="admin-drag-handle" title="Drag to reorder">⋮⋮</div>
          <span className="item-index">{index + 1}</span>
          <span 
            className={`item-name clickable ${item.lessonContent ? 'has-lesson' : ''}`}
            onClick={() => item.lessonContent && openLesson(level, item)}
          >
            {item.text}
            {item.lessonContent && <span className="lesson-indicator">📄</span>}
          </span>
          <div className="admin-item-actions">
            <button
              className={`action-btn-mini edit ${item.lessonContent ? 'has-content' : ''}`}
              onClick={() => setEditingLesson({ level, item: { ...item }, subItem: null })}
              title="Edit lesson"
            >
              📝
            </button>
            <button
              className="action-btn-mini move"
              onClick={() => {
                if (movingItem?.itemId === item.id) {
                  setMovingItem(null)
                } else {
                  setMovingItem({ level, itemId: item.id })
                }
              }}
              title="Move to another level"
            >
              ↔
            </button>
            <button
              className="action-btn-mini song"
              onClick={() => {
                if (linkingSongTo?.itemId === item.id && !linkingSongTo?.subItemId) {
                  setLinkingSongTo(null)
                } else {
                  setLinkingSongTo({ level, itemId: item.id, subItemId: null })
                  setSongSearchTerm('')
                }
              }}
              title="Link song"
            >
              🎵
            </button>
            <button
              className="action-btn-mini sub"
              onClick={() => {
                if (addingSubItemTo?.itemId === item.id) {
                  setAddingSubItemTo(null)
                } else {
                  setAddingSubItemTo({ level, itemId: item.id })
                  setNewSubItemText('')
                }
              }}
              title="Add sub-item"
            >
              +
            </button>
            <button
              className="action-btn-mini delete"
              onClick={() => {
                if (confirm('Delete this item?')) {
                  onDeleteItem(level, item.id)
                }
              }}
              title="Delete"
            >
              ×
            </button>
          </div>
        </div>

        {renderMoveDropdown(level, item.id)}
        {renderLinkedSongsSection(level, item.id)}
        {renderSongLinkDropdown(level, item.id)}

        {item.subItems && item.subItems.length > 0 && (
          <ul className="curriculum-sub-items admin-mode">
            {item.subItems.map((subItem, subIndex) => (
              <li 
                key={subItem.id}
                className={`admin-sub-item-wrapper ${dragOverSubItem?.level === level && dragOverSubItem?.itemId === item.id && dragOverSubItem?.subIndex === subIndex ? 'drag-over' : ''} ${draggedSubItem?.level === level && draggedSubItem?.itemId === item.id && draggedSubItem?.subIndex === subIndex ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleSubDragStart(e, level, item.id, subIndex)}
                onDragEnd={handleSubDragEnd}
                onDragOver={(e) => handleSubDragOver(e, level, item.id, subIndex)}
                onDrop={(e) => handleSubDrop(e, level, item.id, subIndex)}
              >
                <div className="curriculum-sub-item admin-sub-item">
                  <div className="admin-sub-drag-handle" title="Drag to reorder">⋮</div>
                  <span className="sub-item-index">{index + 1}.{subIndex + 1}</span>
                  <span 
                    className={`sub-item-name clickable ${subItem.lessonContent ? 'has-lesson' : ''}`}
                    onClick={() => subItem.lessonContent && openLesson(level, item, subItem)}
                  >
                    {subItem.text}
                    {subItem.lessonContent && <span className="lesson-indicator">📄</span>}
                  </span>
                  <div className="admin-sub-actions">
                    <button
                      className={`action-btn-mini edit ${subItem.lessonContent ? 'has-content' : ''}`}
                      onClick={() => setEditingLesson({ level, item: { ...item }, subItem: { ...subItem } })}
                      title="Edit lesson"
                    >
                      📝
                    </button>
                    <button
                      className="action-btn-mini song"
                      onClick={() => {
                        if (linkingSongTo?.itemId === item.id && linkingSongTo?.subItemId === subItem.id) {
                          setLinkingSongTo(null)
                        } else {
                          setLinkingSongTo({ level, itemId: item.id, subItemId: subItem.id })
                          setSongSearchTerm('')
                        }
                      }}
                      title="Link song"
                    >
                      🎵
                    </button>
                    <button
                      className="action-btn-mini delete"
                      onClick={() => {
                        if (confirm('Delete this sub-item?')) {
                          onDeleteSubItem(level, item.id, subItem.id)
                        }
                      }}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {renderLinkedSongsSection(level, item.id, subItem.id)}
                {renderSongLinkDropdown(level, item.id, subItem.id)}
              </li>
            ))}
          </ul>
        )}

        {addingSubItemTo?.level === level && addingSubItemTo?.itemId === item.id && (
          <div className="add-sub-item-inline">
            <input
              type="text"
              value={newSubItemText}
              onChange={(e) => setNewSubItemText(e.target.value)}
              placeholder="Add sub-item..."
              className="sub-item-input-inline"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddSubItem(level, item.id)
                }
                if (e.key === 'Escape') {
                  setAddingSubItemTo(null)
                }
              }}
            />
            <button
              className="add-sub-btn-inline"
              onClick={() => handleAddSubItem(level, item.id)}
              style={{ backgroundColor: levelColors[level] }}
            >
              Add
            </button>
            <button
              className="cancel-sub-btn"
              onClick={() => setAddingSubItemTo(null)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    )
  }

  // Render read-only item for students
  const renderReadOnlyItem = (level, item, index) => {
    const itemCompleted = isItemCompleted(level, item.id)
    
    return (
      <li key={item.id} className="curriculum-item-group">
        <button
          className={`curriculum-item ${item.lessonContent ? 'has-lesson' : ''} ${itemCompleted ? 'completed' : ''}`}
          onClick={() => item.lessonContent && openLesson(level, item)}
          disabled={!item.lessonContent}
        >
          {studentProgress && (
            <span className={`completion-indicator ${itemCompleted ? 'checked' : ''}`}>
              {itemCompleted ? '✓' : '○'}
            </span>
          )}
          <span className="item-index">{index + 1}</span>
          <span className="item-name">{item.text}</span>
          {item.lessonContent && (
            <span className="lesson-indicator" title="View Lesson">📄</span>
          )}
        </button>

        {item.subItems && item.subItems.length > 0 && (
          <ul className="curriculum-sub-items">
            {item.subItems.map((subItem, subIndex) => {
              const subItemCompleted = isItemCompleted(level, subItem.id)
              return (
                <li key={subItem.id}>
                  <button
                    className={`curriculum-sub-item ${subItem.lessonContent ? 'has-lesson' : ''} ${subItemCompleted ? 'completed' : ''}`}
                    onClick={() => subItem.lessonContent && openLesson(level, item, subItem)}
                    disabled={!subItem.lessonContent}
                  >
                    {studentProgress && (
                      <span className={`completion-indicator ${subItemCompleted ? 'checked' : ''}`}>
                        {subItemCompleted ? '✓' : '○'}
                      </span>
                    )}
                    <span className="sub-item-index">{index + 1}.{subIndex + 1}</span>
                    <span className="sub-item-name">{subItem.text}</span>
                    {subItem.lessonContent && (
                      <span className="lesson-indicator" title="View Lesson">📄</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className={`curriculum-view ${isAdmin ? 'admin-mode' : ''}`}>
      <div className="curriculum-header">
        <div className="curriculum-title-section">
          <span className="curriculum-icon">📖</span>
          <div>
            <h2>{studentName ? `${studentName}'s Progress` : 'Curriculum'}</h2>
            <p className="curriculum-subtitle">
              {isAdmin 
                ? 'Manage curriculum content and lessons' 
                : studentProgress 
                  ? 'Track your learning progress'
                  : 'Browse lessons and learning materials'
              }
            </p>
          </div>
        </div>
        <div className="curriculum-stats">
          {progressStats ? (
            <>
              <div className="stat-item progress-stat">
                <span className="stat-number">{progressStats.completed}/{progressStats.total}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item progress-percentage">
                <div className="progress-ring-container">
                  <svg className="progress-ring" width="48" height="48">
                    <circle 
                      className="progress-ring-bg"
                      cx="24" 
                      cy="24" 
                      r="20" 
                      fill="none" 
                      strokeWidth="4"
                    />
                    <circle 
                      className="progress-ring-fill"
                      cx="24" 
                      cy="24" 
                      r="20" 
                      fill="none" 
                      strokeWidth="4"
                      strokeDasharray={`${progressStats.percentage * 1.256} 125.6`}
                      transform="rotate(-90 24 24)"
                    />
                  </svg>
                  <span className="progress-ring-text">{progressStats.percentage}%</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="stat-item">
                <span className="stat-number">{totalItems}</span>
                <span className="stat-label">Topics</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{itemsWithLessons}</span>
                <span className="stat-label">Lessons</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="curriculum-levels">
        {levelOrder.map((level, levelIndex) => {
          const items = checklists[level] || []
          const isExpanded = expandedLevels[level]
          const levelLessonCount = items.filter(item => item.lessonContent).length +
            items.reduce((count, item) => 
              count + (item.subItems?.filter(sub => sub.lessonContent).length || 0), 0
            )
          
          // Calculate level-specific progress
          let levelCompleted = 0
          let levelTotal = 0
          if (studentProgress) {
            items.forEach(item => {
              levelTotal++
              if (studentProgress[level]?.[item.id]) levelCompleted++
              item.subItems?.forEach(subItem => {
                levelTotal++
                if (studentProgress[level]?.[subItem.id]) levelCompleted++
              })
            })
          }
          const levelProgress = levelTotal > 0 ? Math.round((levelCompleted / levelTotal) * 100) : 0

          return (
            <div 
              key={level} 
              className={`curriculum-level ${isExpanded ? 'expanded' : ''}`}
              style={{ '--level-color': levelColors[level] }}
            >
              <button 
                className="curriculum-level-header"
                onClick={() => toggleLevel(level)}
                style={{ backgroundColor: levelColors[level] }}
              >
                <div className="level-header-content">
                  <span className="level-number">{levelIndex + 1}</span>
                  <h3>{levelNames[level]}</h3>
                </div>
                <div className="level-header-meta">
                  {studentProgress ? (
                    <span className="level-progress-info">
                      <span className="level-progress-count">{levelCompleted}/{levelTotal}</span>
                      <span className="level-progress-bar">
                        <span 
                          className="level-progress-fill" 
                          style={{ width: `${levelProgress}%` }}
                        />
                      </span>
                      <span className="level-progress-percent">{levelProgress}%</span>
                    </span>
                  ) : (
                    <span className="level-topic-count">
                      {items.length} topics
                      {levelLessonCount > 0 && ` • ${levelLessonCount} lessons`}
                    </span>
                  )}
                  <span className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>
                    ▶
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="curriculum-level-content">
                  {isAdmin && (
                    <form onSubmit={(e) => handleAddItem(e, level)} className="curriculum-add-form">
                      <input
                        type="text"
                        value={newItemTexts[level] || ''}
                        onChange={(e) => setNewItemTexts(prev => ({ ...prev, [level]: e.target.value }))}
                        placeholder="Add new topic..."
                        className="curriculum-add-input"
                      />
                      <button 
                        type="submit" 
                        className="curriculum-add-btn"
                        style={{ backgroundColor: levelColors[level] }}
                      >
                        + Add
                      </button>
                    </form>
                  )}

                  {items.length === 0 ? (
                    <div className="curriculum-empty">
                      <span className="empty-icon">📋</span>
                      <p>No topics added yet</p>
                      {isAdmin && <p className="hint">Add topics using the form above</p>}
                    </div>
                  ) : (
                    <ul className="curriculum-items">
                      {items.map((item, itemIndex) => 
                        isAdmin 
                          ? renderAdminItem(level, item, itemIndex)
                          : renderReadOnlyItem(level, item, itemIndex)
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedLesson && (
        <LessonViewer
          item={selectedLesson.item}
          subItem={selectedLesson.subItem}
          levelName={selectedLesson.levelName}
          levelColor={selectedLesson.levelColor}
          onClose={closeLesson}
        />
      )}

      {editingLesson && editingLesson.item && editingLesson.level && (
        <LessonEditor
          key={`${editingLesson.level}-${editingLesson.item.id}-${editingLesson.subItem?.id || 'main'}`}
          item={editingLesson.item}
          subItem={editingLesson.subItem}
          levelName={levelNames[editingLesson.level] || 'Unknown Level'}
          levelColor={levelColors[editingLesson.level] || '#666'}
          onSave={(content) => {
            if (onSaveLessonContent && editingLesson.item?.id) {
              onSaveLessonContent(
                editingLesson.level,
                editingLesson.item.id,
                editingLesson.subItem?.id || null,
                content
              )
            }
            setEditingLesson(null)
          }}
          onClose={() => setEditingLesson(null)}
        />
      )}
    </div>
  )
}

export default CurriculumView
