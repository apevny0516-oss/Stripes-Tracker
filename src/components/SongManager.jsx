import { useState } from 'react'

const LEVEL_COLORS = {
  level1: '#64748b',
  level2: '#f59e0b',
  level3: '#ef4444',
  level4: '#22c55e',
  level5: '#3b82f6',
  level6: '#8b5cf6'
}

function SongManager({
  songs,
  checklists,
  onAddSong,
  onEditSong,
  onDeleteSong,
  levelNames
}) {
  const [newArtist, setNewArtist] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editArtist, setEditArtist] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSong, setSelectedSong] = useState(null)

  // Find all concepts (checklist items/subitems) that a song is linked to
  const getLinkedConcepts = (songId) => {
    const linkedConcepts = []
    
    if (!checklists) return linkedConcepts
    
    Object.entries(checklists).forEach(([level, items]) => {
      items.forEach(item => {
        // Check if song is linked to main item
        if (item.linkedSongs?.includes(songId)) {
          linkedConcepts.push({
            level,
            text: item.text,
            isSubItem: false
          })
        }
        // Check subitems
        item.subItems?.forEach(subItem => {
          if (subItem.linkedSongs?.includes(songId)) {
            linkedConcepts.push({
              level,
              text: subItem.text,
              parentText: item.text,
              isSubItem: true
            })
          }
        })
      })
    })
    
    return linkedConcepts
  }

  const handleAddSong = (e) => {
    e.preventDefault()
    if (newTitle.trim()) {
      onAddSong(newArtist.trim(), newTitle.trim())
      setNewArtist('')
      setNewTitle('')
    }
  }

  const startEditing = (song) => {
    setEditingId(song.id)
    setEditArtist(song.artist)
    setEditTitle(song.title)
  }

  const saveEdit = () => {
    if (editTitle.trim()) {
      onEditSong(editingId, editArtist.trim(), editTitle.trim())
    }
    setEditingId(null)
  }

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="song-manager">
      <div className="manager-header">
        <h2>🎵 Song Database</h2>
        <p className="manager-hint">
          Add songs here, then link them to checklist items in "Manage Checklists"
        </p>
      </div>

      <form onSubmit={handleAddSong} className="add-song-form">
        <input
          type="text"
          value={newArtist}
          onChange={(e) => setNewArtist(e.target.value)}
          placeholder="Artist (optional)"
          className="artist-input"
        />
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Song title *"
          className="title-input"
        />
        <button type="submit" className="add-btn song-add-btn">
          <span>+</span> Add Song
        </button>
      </form>

      {songs.length > 5 && (
        <div className="search-container">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search songs..."
            className="search-input"
          />
        </div>
      )}

      {songs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🎸</span>
          <p>No songs in your database yet.</p>
          <p className="hint">Add songs above to link them to curriculum items.</p>
        </div>
      ) : (
        <div className="songs-list">
          {filteredSongs.map(song => (
            <div key={song.id} className="song-item">
              {editingId === song.id ? (
                <div className="song-edit-form">
                  <input
                    type="text"
                    value={editArtist}
                    onChange={(e) => setEditArtist(e.target.value)}
                    placeholder="Artist"
                    className="edit-artist-input"
                  />
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title"
                    className="edit-title-input"
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button className="save-edit-btn" onClick={saveEdit}>Save</button>
                    <button className="cancel-edit-btn" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    className="song-info clickable"
                    onClick={() => setSelectedSong(song)}
                    title="Click to view song details"
                  >
                    <span className="song-icon">🎵</span>
                    <div className="song-details">
                      {song.artist && <span className="song-artist">{song.artist}</span>}
                      <span className="song-title">{song.title}</span>
                    </div>
                    <span className="song-view-hint">View details →</span>
                  </div>
                  <div className="song-actions">
                    <button
                      className="action-btn edit"
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditing(song)
                      }}
                      title="Edit song"
                    >
                      ✎
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete "${song.artist ? song.artist + ' - ' : ''}${song.title}"?`)) {
                          onDeleteSong(song.id)
                        }
                      }}
                      title="Delete song"
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="song-count">
        {songs.length} song{songs.length !== 1 ? 's' : ''} in database
      </div>

      {/* Song Details Modal */}
      {selectedSong && (
        <div className="song-modal-overlay" onClick={() => setSelectedSong(null)}>
          <div className="song-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedSong(null)}>×</button>
            
            <div className="song-modal-header">
              <span className="song-modal-icon">🎵</span>
              <div className="song-modal-title-section">
                {selectedSong.artist && (
                  <span className="song-modal-artist">{selectedSong.artist}</span>
                )}
                <h2 className="song-modal-title">{selectedSong.title}</h2>
              </div>
            </div>

            <div className="song-modal-section">
              <h3>📚 Linked Concepts</h3>
              {(() => {
                const linkedConcepts = getLinkedConcepts(selectedSong.id)
                
                if (linkedConcepts.length === 0) {
                  return (
                    <div className="no-linked-concepts">
                      <span className="no-concepts-icon">🔗</span>
                      <p>This song is not linked to any checklist concepts yet.</p>
                      <p className="hint">Link songs to checklist items in "Manage Checklists"</p>
                    </div>
                  )
                }

                // Group by level
                const groupedByLevel = linkedConcepts.reduce((acc, concept) => {
                  if (!acc[concept.level]) acc[concept.level] = []
                  acc[concept.level].push(concept)
                  return acc
                }, {})

                return (
                  <div className="linked-concepts-list">
                    {Object.entries(groupedByLevel).map(([level, concepts]) => (
                      <div key={level} className="level-concept-group">
                        <div 
                          className="level-concept-header"
                          style={{ 
                            backgroundColor: LEVEL_COLORS[level],
                            color: '#ffffff'
                          }}
                        >
                          {levelNames?.[level] || level}
                        </div>
                        <div className="level-concept-items">
                          {concepts.map((concept, idx) => (
                            <div key={idx} className="concept-item">
                              {concept.isSubItem ? (
                                <>
                                  <span className="concept-parent">{concept.parentText}</span>
                                  <span className="concept-sub-indicator">→</span>
                                  <span className="concept-text">{concept.text}</span>
                                </>
                              ) : (
                                <span className="concept-text main">{concept.text}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            <div className="song-modal-footer">
              <span className="song-date-added">
                Added: {new Date(selectedSong.dateAdded).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SongManager
