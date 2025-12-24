import { useState } from 'react'

function ChecklistManager({
  checklists,
  activeStripe,
  onAddItem,
  onAddSubItem,
  onDeleteItem,
  onDeleteSubItem,
  onReorderItems,
  onReorderSubItems,
  onLinkSong,
  onUnlinkSong,
  onAddSong,
  songs,
  stripeColors
}) {
  const [newItemText, setNewItemText] = useState('')
  const [addingSubItemTo, setAddingSubItemTo] = useState(null)
  const [newSubItemText, setNewSubItemText] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)
  const [draggedSubItem, setDraggedSubItem] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [dragOverSubIndex, setDragOverSubIndex] = useState(null)
  const [linkingSongTo, setLinkingSongTo] = useState(null) // { itemId, subItemId? }
  const [songSearchTerm, setSongSearchTerm] = useState('')
  const [showCreateSong, setShowCreateSong] = useState(false)
  const [newSongArtist, setNewSongArtist] = useState('')

  const items = checklists[activeStripe] || []

  const handleAddItem = (e) => {
    e.preventDefault()
    if (newItemText.trim()) {
      onAddItem(activeStripe, newItemText.trim())
      setNewItemText('')
    }
  }

  const handleAddSubItem = (itemId) => {
    if (newSubItemText.trim()) {
      onAddSubItem(activeStripe, itemId, newSubItemText.trim())
      setNewSubItemText('')
      setAddingSubItemTo(null)
    }
  }

  // Get linked songs for an item or subitem
  const getLinkedSongs = (itemId, subItemId = null) => {
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
      onLinkSong(activeStripe, linkingSongTo.itemId, linkingSongTo.subItemId, songId)
      setLinkingSongTo(null)
      setSongSearchTerm('')
      setShowCreateSong(false)
      setNewSongArtist('')
    }
  }

  const handleUnlinkSong = (itemId, subItemId, songId) => {
    onUnlinkSong(activeStripe, itemId, subItemId, songId)
  }

  const handleCreateAndLinkSong = () => {
    if (songSearchTerm.trim() && linkingSongTo) {
      // Create the song and get its ID
      const newSongId = onAddSong(newSongArtist.trim(), songSearchTerm.trim())
      // Link it immediately
      if (newSongId) {
        onLinkSong(activeStripe, linkingSongTo.itemId, linkingSongTo.subItemId, newSongId)
      }
      // Reset state
      setLinkingSongTo(null)
      setSongSearchTerm('')
      setShowCreateSong(false)
      setNewSongArtist('')
    }
  }

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(songSearchTerm.toLowerCase()) ||
    song.artist.toLowerCase().includes(songSearchTerm.toLowerCase())
  )

  // Drag handlers for main items
  const handleDragStart = (e, index) => {
    setDraggedItem(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index)
    e.target.classList.add('dragging')
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging')
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedItem === null || draggedSubItem !== null) return
    setDragOverIndex(index)
  }

  const handleDrop = (e, toIndex) => {
    e.preventDefault()
    if (draggedItem === null || draggedSubItem !== null) return
    
    if (draggedItem !== toIndex) {
      onReorderItems(activeStripe, draggedItem, toIndex)
    }
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  // Drag handlers for sub-items
  const handleSubDragStart = (e, itemId, subIndex) => {
    e.stopPropagation()
    setDraggedSubItem({ itemId, subIndex })
    e.dataTransfer.effectAllowed = 'move'
    e.target.classList.add('dragging')
  }

  const handleSubDragEnd = (e) => {
    e.target.classList.remove('dragging')
    setDraggedSubItem(null)
    setDragOverSubIndex(null)
  }

  const handleSubDragOver = (e, itemId, subIndex) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedSubItem || draggedSubItem.itemId !== itemId) return
    setDragOverSubIndex(subIndex)
  }

  const handleSubDrop = (e, itemId, toIndex) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedSubItem || draggedSubItem.itemId !== itemId) return
    
    if (draggedSubItem.subIndex !== toIndex) {
      onReorderSubItems(activeStripe, itemId, draggedSubItem.subIndex, toIndex)
    }
    setDraggedSubItem(null)
    setDragOverSubIndex(null)
  }

  const renderLinkedSongs = (itemId, subItemId = null) => {
    const linkedSongIds = getLinkedSongs(itemId, subItemId)
    if (linkedSongIds.length === 0) return null

    return (
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
                onClick={() => handleUnlinkSong(itemId, subItemId, songId)}
                title="Remove song"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  const renderSongLinkDropdown = (itemId, subItemId = null) => {
    const isActive = linkingSongTo?.itemId === itemId && linkingSongTo?.subItemId === subItemId
    
    if (!isActive) return null

    const linkedSongIds = getLinkedSongs(itemId, subItemId)
    const availableSongs = filteredSongs.filter(s => !linkedSongIds.includes(s.id))
    const hasSearchTerm = songSearchTerm.trim().length > 0
    const noResults = availableSongs.length === 0 && hasSearchTerm

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
              <button
                className="create-song-btn"
                onClick={handleCreateAndLinkSong}
              >
                Create & Link
              </button>
              <button
                className="cancel-create-btn"
                onClick={() => setShowCreateSong(false)}
              >
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
              <button
                className="create-new-song-btn"
                onClick={() => setShowCreateSong(true)}
              >
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

  return (
    <div className="checklist-manager">
      <div className="manager-header">
        <h2>
          Manage <span style={{ color: stripeColors[activeStripe] }}>
            {activeStripe.charAt(0).toUpperCase() + activeStripe.slice(1)}
          </span> Stripe Checklist
        </h2>
        <p className="manager-hint">
          Items added here will appear in all students' checklists • Drag items to reorder • Link songs with 🎵
        </p>
      </div>

      <form onSubmit={handleAddItem} className="add-item-form">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Add a new checklist item..."
          className="item-input"
        />
        <button 
          type="submit" 
          className="add-btn"
          style={{ backgroundColor: stripeColors[activeStripe] }}
        >
          <span>+</span> Add Item
        </button>
      </form>

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <p>No items in this checklist yet.</p>
          <p className="hint">Add items above to create requirements for this stripe level.</p>
        </div>
      ) : (
        <div className="items-list">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className={`manager-item ${dragOverIndex === index ? 'drag-over' : ''} ${draggedItem === index ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="item-header">
                <div className="drag-handle" title="Drag to reorder">
                  <span>⋮⋮</span>
                </div>
                <span className="item-number">{index + 1}</span>
                <span className="item-text">{item.text}</span>
                <div className="item-actions">
                  <button
                    className="action-btn link-song"
                    onClick={() => {
                      if (linkingSongTo?.itemId === item.id && !linkingSongTo?.subItemId) {
                        setLinkingSongTo(null)
                      } else {
                        setLinkingSongTo({ itemId: item.id, subItemId: null })
                        setSongSearchTerm('')
                        setShowCreateSong(false)
                        setNewSongArtist('')
                      }
                    }}
                    title="Link song"
                  >
                    🎵
                  </button>
                  <button
                    className="action-btn add-sub"
                    onClick={() => {
                      setAddingSubItemTo(addingSubItemTo === item.id ? null : item.id)
                      setNewSubItemText('')
                    }}
                    title="Add sub-item"
                  >
                    + Sub
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => {
                      if (confirm('Delete this item and all its sub-items?')) {
                        onDeleteItem(activeStripe, item.id)
                      }
                    }}
                    title="Delete item"
                  >
                    ×
                  </button>
                </div>
              </div>

              {renderLinkedSongs(item.id)}
              {renderSongLinkDropdown(item.id)}

              {item.subItems && item.subItems.length > 0 && (
                <div className="sub-items-list">
                  {item.subItems.map((subItem, subIndex) => (
                    <div 
                      key={subItem.id} 
                      className={`sub-item-container ${dragOverSubIndex === subIndex && draggedSubItem?.itemId === item.id ? 'drag-over' : ''}`}
                    >
                      <div 
                        className="sub-item"
                        draggable
                        onDragStart={(e) => handleSubDragStart(e, item.id, subIndex)}
                        onDragEnd={handleSubDragEnd}
                        onDragOver={(e) => handleSubDragOver(e, item.id, subIndex)}
                        onDrop={(e) => handleSubDrop(e, item.id, subIndex)}
                      >
                        <div className="sub-drag-handle" title="Drag to reorder">⋮</div>
                        <span className="sub-bullet">•</span>
                        <span className="sub-text">{subItem.text}</span>
                        <button
                          className="action-btn link-song small"
                          onClick={() => {
                            if (linkingSongTo?.itemId === item.id && linkingSongTo?.subItemId === subItem.id) {
                              setLinkingSongTo(null)
                            } else {
                              setLinkingSongTo({ itemId: item.id, subItemId: subItem.id })
                              setSongSearchTerm('')
                              setShowCreateSong(false)
                              setNewSongArtist('')
                            }
                          }}
                          title="Link song"
                        >
                          🎵
                        </button>
                        <button
                          className="action-btn delete small"
                          onClick={() => {
                            if (confirm('Delete this sub-item?')) {
                              onDeleteSubItem(activeStripe, item.id, subItem.id)
                            }
                          }}
                          title="Delete sub-item"
                        >
                          ×
                        </button>
                      </div>
                      {renderLinkedSongs(item.id, subItem.id)}
                      {renderSongLinkDropdown(item.id, subItem.id)}
                    </div>
                  ))}
                </div>
              )}

              {addingSubItemTo === item.id && (
                <div className="add-sub-item-form">
                  <input
                    type="text"
                    value={newSubItemText}
                    onChange={(e) => setNewSubItemText(e.target.value)}
                    placeholder="Enter sub-item..."
                    className="sub-item-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSubItem(item.id)
                      }
                      if (e.key === 'Escape') {
                        setAddingSubItemTo(null)
                        setNewSubItemText('')
                      }
                    }}
                  />
                  <button
                    className="add-sub-btn"
                    onClick={() => handleAddSubItem(item.id)}
                    style={{ backgroundColor: stripeColors[activeStripe] }}
                  >
                    Add
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setAddingSubItemTo(null)
                      setNewSubItemText('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChecklistManager
