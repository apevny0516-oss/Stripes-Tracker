import { useState } from 'react'

function SongManager({
  songs,
  onAddSong,
  onEditSong,
  onDeleteSong
}) {
  const [newArtist, setNewArtist] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editArtist, setEditArtist] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

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
                  <div className="song-info">
                    <span className="song-icon">🎵</span>
                    <div className="song-details">
                      {song.artist && <span className="song-artist">{song.artist}</span>}
                      <span className="song-title">{song.title}</span>
                    </div>
                  </div>
                  <div className="song-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => startEditing(song)}
                      title="Edit song"
                    >
                      ✎
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => {
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
    </div>
  )
}

export default SongManager

