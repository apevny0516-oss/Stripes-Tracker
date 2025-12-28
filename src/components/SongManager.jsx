import { useState, useMemo } from 'react'

const LEVEL_COLORS = {
  level1: '#64748b',
  level2: '#f59e0b',
  level3: '#ef4444',
  level4: '#22c55e',
  level5: '#3b82f6',
  level6: '#8b5cf6'
}

const DIFFICULTY_COLORS = {
  'Beginner': '#22c55e',
  'Intermediate': '#f59e0b',
  'Advanced': '#ef4444'
}

const TUNINGS = [
  'E Standard (E A D G B E)',
  'Eb Standard (Eb Ab Db Gb Bb Eb)',
  'D Standard (D G C F A D)',
  'C# Standard (C# F# B E G# C#)',
  'C Standard (C F Bb Eb G C)',
  'B Standard (B E A D F# B)',
  'Drop D (D A D G B E)',
  'Drop C (C G C F A D)',
  'Drop B (B F# B E G# C#)',
  'Drop Bb (Bb F Bb Eb G C)',
  'Drop Db (Db Ab Db Gb Bb Eb)',
  'Karnivool Tuning (B F# B G B E)',
  'Other'
]

const TYPES = ['Full Song', 'Solo', 'Chord Chart', 'EZ Guitar', 'Riff']
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']
const GENRES = ['Rock', 'Metal', 'Pop', 'Blues', 'Jazz/Funk/Fusion', 'Country', 'Acoustic', 'R&B', 'Hip-Hop/Rap', 'Classical']

function SongManager({
  songs,
  checklists,
  onAddSong,
  onEditSong,
  onDeleteSong,
  onImportSongs,
  levelNames,
  isReadOnly
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [newSong, setNewSong] = useState({
    artist: '',
    title: '',
    soundsliceUrl: '',
    type: [],
    tuning: 'E Standard (E A D G B E)',
    difficulty: '',
    techniques: '',
    theory: '',
    genre: [],
    guitarProUrl: '',
    hasBackingTrack: false,
    notes: '',
    openChordsUsed: ''
  })
  const [editingId, setEditingId] = useState(null)
  const [editSong, setEditSong] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSong, setSelectedSong] = useState(null)
  
  // Filters
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterTuning, setFilterTuning] = useState('')
  const [sortBy, setSortBy] = useState('artist')
  const [showFilters, setShowFilters] = useState(false)

  // Extract unique values for filters
  const uniqueValues = useMemo(() => {
    const genres = new Set()
    const techniques = new Set()
    const tunings = new Set()
    
    songs.forEach(song => {
      song.genre?.forEach(g => genres.add(g))
      song.techniques?.forEach(t => techniques.add(t))
      if (song.tuning) tunings.add(song.tuning)
    })
    
    return {
      genres: Array.from(genres).sort(),
      techniques: Array.from(techniques).sort(),
      tunings: Array.from(tunings).sort()
    }
  }, [songs])

  // Find all concepts that a song is linked to
  const getLinkedConcepts = (songId) => {
    const linkedConcepts = []
    if (!checklists) return linkedConcepts
    
    Object.entries(checklists).forEach(([level, items]) => {
      items.forEach(item => {
        if (item.linkedSongs?.includes(songId)) {
          linkedConcepts.push({ level, text: item.text, isSubItem: false })
        }
        item.subItems?.forEach(subItem => {
          if (subItem.linkedSongs?.includes(songId)) {
            linkedConcepts.push({ level, text: subItem.text, parentText: item.text, isSubItem: true })
          }
        })
      })
    })
    return linkedConcepts
  }

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    let result = songs.filter(song => {
      // Search filter
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = !searchTerm || 
        song.title?.toLowerCase().includes(searchLower) ||
        song.artist?.toLowerCase().includes(searchLower) ||
        song.techniques?.some(t => t.toLowerCase().includes(searchLower)) ||
        song.theory?.some(t => t.toLowerCase().includes(searchLower))
      
      // Other filters
      const matchesDifficulty = !filterDifficulty || song.difficulty === filterDifficulty
      const matchesGenre = !filterGenre || song.genre?.includes(filterGenre)
      const matchesType = !filterType || song.type?.includes(filterType)
      const matchesTuning = !filterTuning || song.tuning === filterTuning
      
      return matchesSearch && matchesDifficulty && matchesGenre && matchesType && matchesTuning
    })
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'artist':
          return (a.artist || '').localeCompare(b.artist || '')
        case 'title':
          return (a.title || '').localeCompare(b.title || '')
        case 'difficulty':
          const diffOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 }
          return (diffOrder[a.difficulty] || 0) - (diffOrder[b.difficulty] || 0)
        case 'recent':
          return new Date(b.dateAdded) - new Date(a.dateAdded)
        default:
          return 0
      }
    })
    
    return result
  }, [songs, searchTerm, filterDifficulty, filterGenre, filterType, filterTuning, sortBy])

  const handleAddSong = (e) => {
    e.preventDefault()
    if (newSong.title.trim() && onAddSong) {
      onAddSong({
        ...newSong,
        artist: newSong.artist.trim(),
        title: newSong.title.trim(),
        techniques: newSong.techniques ? newSong.techniques.split(',').map(t => t.trim()).filter(Boolean) : [],
        theory: newSong.theory ? newSong.theory.split(',').map(t => t.trim()).filter(Boolean) : [],
        openChordsUsed: newSong.openChordsUsed ? newSong.openChordsUsed.split(',').map(c => c.trim()).filter(Boolean) : []
      })
      setNewSong({
        artist: '', title: '', soundsliceUrl: '', type: [], tuning: 'E Standard (E A D G B E)',
        difficulty: '', techniques: '', theory: '', genre: [], guitarProUrl: '',
        hasBackingTrack: false, notes: '', openChordsUsed: ''
      })
      setShowAddForm(false)
    }
  }

  const startEditing = (song) => {
    if (!onEditSong) return
    setEditingId(song.id)
    setEditSong({
      ...song,
      techniques: song.techniques?.join(', ') || '',
      theory: song.theory?.join(', ') || '',
      openChordsUsed: song.openChordsUsed?.join(', ') || ''
    })
  }

  const saveEdit = () => {
    if (editSong?.title?.trim() && onEditSong) {
      onEditSong(editingId, {
        ...editSong,
        techniques: editSong.techniques ? editSong.techniques.split(',').map(t => t.trim()).filter(Boolean) : [],
        theory: editSong.theory ? editSong.theory.split(',').map(t => t.trim()).filter(Boolean) : [],
        openChordsUsed: editSong.openChordsUsed ? editSong.openChordsUsed.split(',').map(c => c.trim()).filter(Boolean) : []
      })
    }
    setEditingId(null)
    setEditSong(null)
  }

  const toggleType = (type, isEdit = false) => {
    if (isEdit) {
      setEditSong(prev => ({
        ...prev,
        type: prev.type?.includes(type) 
          ? prev.type.filter(t => t !== type)
          : [...(prev.type || []), type]
      }))
    } else {
      setNewSong(prev => ({
        ...prev,
        type: prev.type.includes(type) 
          ? prev.type.filter(t => t !== type)
          : [...prev.type, type]
      }))
    }
  }

  const toggleGenre = (genre, isEdit = false) => {
    if (isEdit) {
      setEditSong(prev => ({
        ...prev,
        genre: prev.genre?.includes(genre)
          ? prev.genre.filter(g => g !== genre)
          : [...(prev.genre || []), genre]
      }))
    } else {
      setNewSong(prev => ({
        ...prev,
        genre: prev.genre.includes(genre)
          ? prev.genre.filter(g => g !== genre)
          : [...prev.genre, genre]
      }))
    }
  }

  const clearFilters = () => {
    setFilterDifficulty('')
    setFilterGenre('')
    setFilterType('')
    setFilterTuning('')
    setSearchTerm('')
  }

  const hasActiveFilters = filterDifficulty || filterGenre || filterType || filterTuning || searchTerm

  return (
    <div className="song-manager enhanced">
      <div className="manager-header">
        <div className="manager-title-section">
          <h2>🎵 Song Database</h2>
          <span className="song-count-badge">{songs.length} songs</span>
        </div>
        <p className="manager-hint">
          {isReadOnly 
            ? 'View songs and transcriptions used in the curriculum'
            : 'Manage your song database with detailed metadata'
          }
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="song-controls">
        <div className="search-row">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search songs, artists, techniques..."
              className="search-input"
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
            )}
          </div>
          
          <button 
            className={`filter-toggle ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <span>⚙️</span> Filters {hasActiveFilters && `(${[filterDifficulty, filterGenre, filterType, filterTuning].filter(Boolean).length})`}
          </button>

          {!isReadOnly && onAddSong && (
            <button className="add-song-toggle" onClick={() => setShowAddForm(!showAddForm)}>
              <span>+</span> Add Song
            </button>
          )}
          
          {!isReadOnly && onImportSongs && (
            <button className="import-song-toggle" onClick={() => setShowImportModal(true)}>
              <span>📥</span> Import
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-row">
              <div className="filter-group">
                <label>Difficulty</label>
                <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)}>
                  <option value="">All Levels</option>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Genre</label>
                <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)}>
                  <option value="">All Genres</option>
                  {uniqueValues.genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Type</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="">All Types</option>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Tuning</label>
                <select value={filterTuning} onChange={(e) => setFilterTuning(e.target.value)}>
                  <option value="">All Tunings</option>
                  {uniqueValues.tunings.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="artist">Artist A-Z</option>
                  <option value="title">Title A-Z</option>
                  <option value="difficulty">Difficulty</option>
                  <option value="recent">Recently Added</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <button className="clear-filters" onClick={clearFilters}>
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Song Form */}
      {showAddForm && !isReadOnly && (
        <form onSubmit={handleAddSong} className="add-song-form expanded">
          <div className="form-header">
            <h3>Add New Song</h3>
            <button type="button" className="close-form" onClick={() => setShowAddForm(false)}>×</button>
          </div>
          
          <div className="form-grid">
            <div className="form-row">
              <div className="form-field">
                <label>Artist</label>
                <input
                  type="text"
                  value={newSong.artist}
                  onChange={(e) => setNewSong(prev => ({ ...prev, artist: e.target.value }))}
                  placeholder="e.g., Metallica"
                />
              </div>
              <div className="form-field required">
                <label>Title *</label>
                <input
                  type="text"
                  value={newSong.title}
                  onChange={(e) => setNewSong(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Enter Sandman"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Soundslice URL</label>
                <input
                  type="url"
                  value={newSong.soundsliceUrl}
                  onChange={(e) => setNewSong(prev => ({ ...prev, soundsliceUrl: e.target.value }))}
                  placeholder="https://www.soundslice.com/..."
                />
              </div>
              <div className="form-field">
                <label>Guitar Pro / PDF URL</label>
                <input
                  type="url"
                  value={newSong.guitarProUrl}
                  onChange={(e) => setNewSong(prev => ({ ...prev, guitarProUrl: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Tuning</label>
                <select
                  value={newSong.tuning}
                  onChange={(e) => setNewSong(prev => ({ ...prev, tuning: e.target.value }))}
                >
                  {TUNINGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Difficulty</label>
                <select
                  value={newSong.difficulty}
                  onChange={(e) => setNewSong(prev => ({ ...prev, difficulty: e.target.value }))}
                >
                  <option value="">Select difficulty...</option>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Type (select all that apply)</label>
              <div className="tag-select">
                {TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`tag-btn ${newSong.type.includes(type) ? 'selected' : ''}`}
                    onClick={() => toggleType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label>Genre (select all that apply)</label>
              <div className="tag-select">
                {GENRES.map(genre => (
                  <button
                    key={genre}
                    type="button"
                    className={`tag-btn ${newSong.genre.includes(genre) ? 'selected' : ''}`}
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Techniques (comma-separated)</label>
                <input
                  type="text"
                  value={newSong.techniques}
                  onChange={(e) => setNewSong(prev => ({ ...prev, techniques: e.target.value }))}
                  placeholder="e.g., Hammer-Ons, Bending, Alternate Picking"
                />
              </div>
              <div className="form-field">
                <label>Theory (comma-separated)</label>
                <input
                  type="text"
                  value={newSong.theory}
                  onChange={(e) => setNewSong(prev => ({ ...prev, theory: e.target.value }))}
                  placeholder="e.g., Pentatonic Scale, Harmonic Minor"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Open Chords Used (comma-separated)</label>
                <input
                  type="text"
                  value={newSong.openChordsUsed}
                  onChange={(e) => setNewSong(prev => ({ ...prev, openChordsUsed: e.target.value }))}
                  placeholder="e.g., Am, C, G, D"
                />
              </div>
              <div className="form-field checkbox-field">
                <label>
                  <input
                    type="checkbox"
                    checked={newSong.hasBackingTrack}
                    onChange={(e) => setNewSong(prev => ({ ...prev, hasBackingTrack: e.target.checked }))}
                  />
                  Has Backing Track
                </label>
              </div>
            </div>

            <div className="form-field">
              <label>Notes</label>
              <textarea
                value={newSong.notes}
                onChange={(e) => setNewSong(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about this song..."
                rows={2}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button type="submit" className="submit-btn">Add Song</button>
          </div>
        </form>
      )}

      {/* Results Info */}
      {(hasActiveFilters || searchTerm) && (
        <div className="results-info">
          Showing {filteredSongs.length} of {songs.length} songs
        </div>
      )}

      {/* Songs List */}
      {songs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🎸</span>
          <p>No songs in the database yet.</p>
          {!isReadOnly && <p className="hint">Add songs to build your curriculum library.</p>}
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>No songs match your filters.</p>
          <button className="clear-filters-btn" onClick={clearFilters}>Clear Filters</button>
        </div>
      ) : (
        <div className="songs-grid">
          {filteredSongs.map(song => (
            <div 
              key={song.id} 
              className="song-card"
              onClick={() => setSelectedSong(song)}
            >
              <div className="song-card-header">
                <div className="song-main-info">
                  {song.artist && <span className="song-artist">{song.artist}</span>}
                  <span className="song-title">{song.title}</span>
                </div>
                {song.difficulty && (
                  <span 
                    className="difficulty-badge"
                    style={{ backgroundColor: DIFFICULTY_COLORS[song.difficulty] }}
                  >
                    {song.difficulty}
                  </span>
                )}
              </div>

              <div className="song-card-meta">
                {song.type?.length > 0 && (
                  <div className="song-types">
                    {song.type.map(t => (
                      <span key={t} className="type-tag">{t}</span>
                    ))}
                  </div>
                )}
                
                {song.genre?.length > 0 && (
                  <div className="song-genres">
                    {song.genre.slice(0, 2).map(g => (
                      <span key={g} className="genre-tag">{g}</span>
                    ))}
                    {song.genre.length > 2 && (
                      <span className="more-tag">+{song.genre.length - 2}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="song-card-footer">
                <div className="song-links">
                  {song.soundsliceUrl && (
                    <span className="link-indicator" title="Has Soundslice">▶️</span>
                  )}
                  {song.guitarProUrl && (
                    <span className="link-indicator" title="Has Guitar Pro/PDF">📁</span>
                  )}
                  {song.hasBackingTrack && (
                    <span className="link-indicator" title="Has Backing Track">🎵</span>
                  )}
                </div>
                
                {!isReadOnly && (
                  <div className="song-card-actions" onClick={e => e.stopPropagation()}>
                    {onEditSong && (
                      <button
                        className="action-btn-small edit"
                        onClick={() => startEditing(song)}
                        title="Edit"
                      >
                        ✎
                      </button>
                    )}
                    {onDeleteSong && (
                      <button
                        className="action-btn-small delete"
                        onClick={() => {
                          if (confirm(`Delete "${song.artist ? song.artist + ' - ' : ''}${song.title}"?`)) {
                            onDeleteSong(song.id)
                          }
                        }}
                        title="Delete"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Song Details Modal */}
      {selectedSong && !editingId && (
        <div className="song-modal-overlay" onClick={() => setSelectedSong(null)}>
          <div className="song-modal enhanced" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedSong(null)}>×</button>
            
            <div className="song-modal-header">
              <div className="song-modal-title-section">
                {selectedSong.artist && (
                  <span className="song-modal-artist">{selectedSong.artist}</span>
                )}
                <h2 className="song-modal-title">{selectedSong.title}</h2>
                <div className="song-modal-badges">
                  {selectedSong.difficulty && (
                    <span 
                      className="difficulty-badge large"
                      style={{ backgroundColor: DIFFICULTY_COLORS[selectedSong.difficulty] }}
                    >
                      {selectedSong.difficulty}
                    </span>
                  )}
                  {selectedSong.type?.map(t => (
                    <span key={t} className="type-badge">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Links */}
            {(selectedSong.soundsliceUrl || selectedSong.guitarProUrl) && (
              <div className="song-modal-links">
                {selectedSong.soundsliceUrl && (
                  <a 
                    href={selectedSong.soundsliceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="resource-link soundslice"
                  >
                    <span>▶️</span> Open in Soundslice
                  </a>
                )}
                {selectedSong.guitarProUrl && (
                  <a 
                    href={selectedSong.guitarProUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="resource-link guitarpro"
                  >
                    <span>📁</span> Guitar Pro / PDF
                  </a>
                )}
              </div>
            )}

            <div className="song-modal-body">
              {/* Details Grid */}
              <div className="details-grid">
                {selectedSong.tuning && (
                  <div className="detail-item">
                    <span className="detail-label">🎸 Tuning</span>
                    <span className="detail-value">{selectedSong.tuning}</span>
                  </div>
                )}
                
                {selectedSong.genre?.length > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">🎭 Genre</span>
                    <div className="detail-tags">
                      {selectedSong.genre.map(g => (
                        <span key={g} className="genre-tag">{g}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSong.techniques?.length > 0 && (
                  <div className="detail-item full-width">
                    <span className="detail-label">🎯 Techniques</span>
                    <div className="detail-tags">
                      {selectedSong.techniques.map(t => (
                        <span key={t} className="technique-tag">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSong.theory?.length > 0 && (
                  <div className="detail-item full-width">
                    <span className="detail-label">📖 Theory Concepts</span>
                    <div className="detail-tags">
                      {selectedSong.theory.map(t => (
                        <span key={t} className="theory-tag">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSong.openChordsUsed?.length > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">🎹 Open Chords</span>
                    <div className="detail-tags">
                      {selectedSong.openChordsUsed.map(c => (
                        <span key={c} className="chord-tag">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSong.hasBackingTrack && (
                  <div className="detail-item">
                    <span className="detail-label">🎵 Backing Track</span>
                    <span className="detail-value available">Available</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedSong.notes && (
                <div className="song-notes">
                  <h4>📝 Notes</h4>
                  <p>{selectedSong.notes}</p>
                </div>
              )}

              {/* Linked Concepts */}
              <div className="linked-concepts-section">
                <h4>📚 Linked Curriculum Items</h4>
                {(() => {
                  const linkedConcepts = getLinkedConcepts(selectedSong.id)
                  
                  if (linkedConcepts.length === 0) {
                    return (
                      <div className="no-linked-concepts">
                        <p>This song is not linked to any curriculum items yet.</p>
                      </div>
                    )
                  }

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
                            style={{ backgroundColor: LEVEL_COLORS[level] }}
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
            </div>

            <div className="song-modal-footer">
              <span className="song-date-added">
                Added: {new Date(selectedSong.dateAdded).toLocaleDateString()}
              </span>
              {!isReadOnly && onEditSong && (
                <button 
                  className="edit-song-btn"
                  onClick={() => {
                    setSelectedSong(null)
                    startEditing(selectedSong)
                  }}
                >
                  ✎ Edit Song
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Song Modal */}
      {editingId && editSong && (
        <div className="song-modal-overlay" onClick={() => { setEditingId(null); setEditSong(null); }}>
          <div className="song-modal edit-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => { setEditingId(null); setEditSong(null); }}>×</button>
            
            <div className="edit-modal-header">
              <h3>Edit Song</h3>
            </div>

            <div className="edit-form-content">
              <div className="form-grid">
                <div className="form-row">
                  <div className="form-field">
                    <label>Artist</label>
                    <input
                      type="text"
                      value={editSong.artist || ''}
                      onChange={(e) => setEditSong(prev => ({ ...prev, artist: e.target.value }))}
                    />
                  </div>
                  <div className="form-field required">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={editSong.title || ''}
                      onChange={(e) => setEditSong(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Soundslice URL</label>
                    <input
                      type="url"
                      value={editSong.soundsliceUrl || ''}
                      onChange={(e) => setEditSong(prev => ({ ...prev, soundsliceUrl: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Guitar Pro / PDF URL</label>
                    <input
                      type="url"
                      value={editSong.guitarProUrl || ''}
                      onChange={(e) => setEditSong(prev => ({ ...prev, guitarProUrl: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Tuning</label>
                    <select
                      value={editSong.tuning || 'E Standard (E A D G B E)'}
                      onChange={(e) => setEditSong(prev => ({ ...prev, tuning: e.target.value }))}
                    >
                      {TUNINGS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Difficulty</label>
                    <select
                      value={editSong.difficulty || ''}
                      onChange={(e) => setEditSong(prev => ({ ...prev, difficulty: e.target.value }))}
                    >
                      <option value="">Select difficulty...</option>
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Type</label>
                  <div className="tag-select">
                    {TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        className={`tag-btn ${editSong.type?.includes(type) ? 'selected' : ''}`}
                        onClick={() => toggleType(type, true)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-field">
                  <label>Genre</label>
                  <div className="tag-select">
                    {GENRES.map(genre => (
                      <button
                        key={genre}
                        type="button"
                        className={`tag-btn ${editSong.genre?.includes(genre) ? 'selected' : ''}`}
                        onClick={() => toggleGenre(genre, true)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Techniques</label>
                    <input
                      type="text"
                      value={editSong.techniques || ''}
                      onChange={(e) => setEditSong(prev => ({ ...prev, techniques: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Theory</label>
                    <input
                      type="text"
                      value={editSong.theory || ''}
                      onChange={(e) => setEditSong(prev => ({ ...prev, theory: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Open Chords Used</label>
                    <input
                      type="text"
                      value={editSong.openChordsUsed || ''}
                      onChange={(e) => setEditSong(prev => ({ ...prev, openChordsUsed: e.target.value }))}
                    />
                  </div>
                  <div className="form-field checkbox-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={editSong.hasBackingTrack || false}
                        onChange={(e) => setEditSong(prev => ({ ...prev, hasBackingTrack: e.target.checked }))}
                      />
                      Has Backing Track
                    </label>
                  </div>
                </div>

                <div className="form-field">
                  <label>Notes</label>
                  <textarea
                    value={editSong.notes || ''}
                    onChange={(e) => setEditSong(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="cancel-btn" onClick={() => { setEditingId(null); setEditSong(null); }}>
                Cancel
              </button>
              <button className="save-btn" onClick={saveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Songs Modal */}
      {showImportModal && (
        <div className="song-modal-overlay" onClick={() => { setShowImportModal(false); setImportResult(null); }}>
          <div className="song-modal import-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => { setShowImportModal(false); setImportResult(null); }}>×</button>
            
            <div className="import-modal-header">
              <h3>📥 Import Songs from CSV</h3>
            </div>

            <div className="import-modal-body">
              <p className="import-instructions">
                Paste your CSV data below. The first row should contain headers.
              </p>
              <p className="import-hint">
                Supported columns: Artist, Title, Soundslice, Type, Tuning, Difficulty, Techniques, Theory, Genre, Guitar Pro & PDF, Backing Track?, Notes, Open Chords Used
              </p>
              
              <textarea
                className="import-textarea"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Artist,Title,Soundslice,Type,Tuning,Difficulty,Techniques,Theory,Genre
Metallica,Enter Sandman,,Full Song,E Standard (E A D G B E),Beginner,Power Chords,Major Modes - Aeolian,Metal
..."
                rows={12}
              />

              {importResult && (
                <div className={`import-result ${importResult.imported > 0 ? 'success' : 'error'}`}>
                  {importResult.imported > 0 ? (
                    <p>✅ Successfully imported {importResult.imported} songs!</p>
                  ) : (
                    <p>⚠️ No songs were imported.</p>
                  )}
                  {importResult.errors?.length > 0 && (
                    <details>
                      <summary>{importResult.errors.length} errors</summary>
                      <ul>
                        {importResult.errors.slice(0, 10).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li>...and {importResult.errors.length - 10} more</li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="import-modal-footer">
              <button 
                className="cancel-btn" 
                onClick={() => { setShowImportModal(false); setImportResult(null); setImportText(''); }}
              >
                Cancel
              </button>
              <button 
                className="import-btn"
                onClick={() => {
                  const result = onImportSongs(importText)
                  setImportResult(result)
                  if (result.imported > 0) {
                    setImportText('')
                  }
                }}
                disabled={!importText.trim()}
              >
                Import Songs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SongManager
