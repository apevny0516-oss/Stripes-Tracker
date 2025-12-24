import { useState } from 'react'

function ChecklistManager({
  checklists,
  onAddItem,
  onAddSubItem,
  onDeleteItem,
  onDeleteSubItem,
  onReorderItems,
  onReorderSubItems,
  onMoveItem,
  onLinkSong,
  onUnlinkSong,
  onAddSong,
  songs,
  levelColors,
  levelNames,
  levelOrder
}) {
  const [newItemTexts, setNewItemTexts] = useState({})
  const [addingSubItemTo, setAddingSubItemTo] = useState(null) // { level, itemId }
  const [newSubItemText, setNewSubItemText] = useState('')
  const [collapsedLevels, setCollapsedLevels] = useState(new Set())
  const [movingItem, setMovingItem] = useState(null) // { level, itemId }
  const [linkingSongTo, setLinkingSongTo] = useState(null) // { level, itemId, subItemId? }
  const [songSearchTerm, setSongSearchTerm] = useState('')
  const [showCreateSong, setShowCreateSong] = useState(false)
  const [newSongArtist, setNewSongArtist] = useState('')
  const [expandedSongs, setExpandedSongs] = useState(new Set())

  const toggleLevelCollapsed = (level) => {
    setCollapsedLevels(prev => {
      const newSet = new Set(prev)
      if (newSet.has(level)) {
        newSet.delete(level)
      } else {
        newSet.add(level)
      }
      return newSet
    })
  }

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
    if (text) {
      onAddItem(level, text)
      setNewItemTexts(prev => ({ ...prev, [level]: '' }))
    }
  }

  const handleAddSubItem = (level, itemId) => {
    if (newSubItemText.trim()) {
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

  const getSongById = (songId) => songs.find(s => s.id === songId)

  const handleLinkSong = (songId) => {
    if (linkingSongTo) {
      onLinkSong(linkingSongTo.level, linkingSongTo.itemId, linkingSongTo.subItemId, songId)
      setLinkingSongTo(null)
      setSongSearchTerm('')
      setShowCreateSong(false)
      setNewSongArtist('')
    }
  }

  const handleUnlinkSong = (level, itemId, subItemId, songId) => {
    onUnlinkSong(level, itemId, subItemId, songId)
  }

  const handleCreateAndLinkSong = () => {
    if (songSearchTerm.trim() && linkingSongTo) {
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
    if (movingItem && toLevel !== movingItem.level) {
      onMoveItem(movingItem.level, movingItem.itemId, toLevel)
    }
    setMovingItem(null)
  }

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(songSearchTerm.toLowerCase()) ||
    song.artist.toLowerCase().includes(songSearchTerm.toLowerCase())
  )

  const renderLinkedSongsSection = (level, itemId, subItemId = null) => {
    const linkedSongIds = getLinkedSongs(level, itemId, subItemId)
    if (linkedSongIds.length === 0) return null

    const isExpanded = isSongsExpanded(level, itemId, subItemId)

    return (
      <div className={`related-songs-section ${subItemId ? 'sub-item-songs' : ''}`}>
        <button 
          className="related-songs-toggle"
          onClick={() => toggleSongsExpanded(level, itemId, subItemId)}
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
                  <button
                    className="unlink-song-btn"
                    onClick={() => handleUnlinkSong(level, itemId, subItemId, songId)}
                    title="Remove song"
                  >
                    ×
                  </button>
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
      <div className="song-link-dropdown">
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
                  {songs.length === 0 && !hasSearchTerm
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
      <div className="move-item-dropdown">
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

  return (
    <div className="checklist-manager all-levels">
      <div className="manager-header">
        <h2>Manage Checklists</h2>
        <p className="manager-hint">
          All levels shown • Click level header to collapse • Use ↔ to move items between levels
        </p>
      </div>

      <div className="levels-grid">
        {levelOrder.map(level => {
          const items = checklists[level] || []
          const isCollapsed = collapsedLevels.has(level)

          return (
            <div 
              key={level} 
              className={`level-column ${isCollapsed ? 'collapsed' : ''}`}
              style={{ '--level-color': levelColors[level] }}
            >
              <div 
                className="level-column-header"
                onClick={() => toggleLevelCollapsed(level)}
                style={{ backgroundColor: levelColors[level] }}
              >
                <span className={`collapse-arrow ${isCollapsed ? '' : 'expanded'}`}>▶</span>
                <h3>{levelNames[level]}</h3>
                <span className="item-count">{items.length}</span>
              </div>

              {!isCollapsed && (
                <div className="level-column-content">
                  <form onSubmit={(e) => handleAddItem(e, level)} className="level-add-form">
                    <input
                      type="text"
                      value={newItemTexts[level] || ''}
                      onChange={(e) => setNewItemTexts(prev => ({ ...prev, [level]: e.target.value }))}
                      placeholder="Add item..."
                      className="level-item-input"
                    />
                    <button 
                      type="submit" 
                      className="level-add-btn"
                      style={{ backgroundColor: levelColors[level] }}
                    >
                      +
                    </button>
                  </form>

                  {items.length === 0 ? (
                    <div className="level-empty">
                      <span>No items yet</span>
                    </div>
                  ) : (
                    <div className="level-items-list">
                      {items.map((item, index) => (
                        <div key={item.id} className="level-manager-item">
                          <div className="level-item-header">
                            <span className="level-item-number">{index + 1}</span>
                            <span className="level-item-text">{item.text}</span>
                            <div className="level-item-actions">
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
                            <div className="level-sub-items">
                              {item.subItems.map((subItem, subIndex) => (
                                <div key={subItem.id} className="level-sub-item">
                                  <span className="sub-bullet">•</span>
                                  <span className="level-sub-text">{subItem.text}</span>
                                  <div className="level-sub-actions">
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
                                  {renderLinkedSongsSection(level, item.id, subItem.id)}
                                  {renderSongLinkDropdown(level, item.id, subItem.id)}
                                </div>
                              ))}
                            </div>
                          )}

                          {addingSubItemTo?.level === level && addingSubItemTo?.itemId === item.id && (
                            <div className="level-add-sub-form">
                              <input
                                type="text"
                                value={newSubItemText}
                                onChange={(e) => setNewSubItemText(e.target.value)}
                                placeholder="Sub-item..."
                                className="level-sub-input"
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
                                className="level-sub-add-btn"
                                onClick={() => handleAddSubItem(level, item.id)}
                                style={{ backgroundColor: levelColors[level] }}
                              >
                                Add
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ChecklistManager
