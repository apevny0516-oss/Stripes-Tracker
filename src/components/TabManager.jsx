import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search,
  Music,
  FileText,
  Guitar,
  ChevronDown,
  LogIn,
  LogOut,
  RefreshCw,
  LayoutGrid,
  List,
  X,
  User,
  Tag,
  Plus,
  Check,
  Settings,
  Trash2,
} from 'lucide-react'
import {
  initializeGapi,
  initializeGis,
  requestAccessToken,
  signOut,
  getLibraryStructure,
  CLIENT_ID,
  API_KEY,
} from '../services/googleDrive'
import {
  getGenres,
  addGenre,
  removeGenre,
  getAllMetadata,
  toggleTabGenre,
} from '../services/tabMetadata'

// Check if API credentials are configured (via environment variables)
const isConfigured = CLIENT_ID && API_KEY && CLIENT_ID.length > 0 && API_KEY.length > 0

function TabManager() {
  const [library, setLibrary] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [loadProgress, setLoadProgress] = useState(null)
  const [lastSynced, setLastSynced] = useState(null)
  const [error, setError] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [filterType, setFilterType] = useState('all')
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [genres, setGenres] = useState(getGenres())
  const [tabMetadata, setTabMetadata] = useState(getAllMetadata())
  const [showGenreManager, setShowGenreManager] = useState(false)
  const searchInputRef = useRef(null)
  const artistListRef = useRef(null)

  // Load from local database on mount
  useEffect(() => {
    loadFromCache()
  }, [])

  // Initialize Google APIs (for syncing capability)
  useEffect(() => {
    if (!isConfigured) return

    const init = async () => {
      try {
        await initializeGapi()
        initializeGis((response) => {
          if (response.error) {
            setError(response.error)
            return
          }
          setAuthenticated(true)
        })
      } catch (err) {
        setError('Failed to initialize Google APIs')
        console.error(err)
      }
    }

    init()
  }, [])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setSearchQuery('')
        searchInputRef.current?.blur()
        setShowGenreManager(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Load library from local cache
  const loadFromCache = () => {
    const cached = localStorage.getItem('tabVaultLibrary')
    const cachedTime = localStorage.getItem('tabVaultLibraryTime')
    
    if (cached) {
      try {
        setLibrary(JSON.parse(cached))
        if (cachedTime) {
          setLastSynced(new Date(parseInt(cachedTime)))
        }
      } catch (e) {
        console.error('Failed to load cache:', e)
      }
    }
  }

  // Sync with Google Drive
  const syncWithDrive = async () => {
    if (!authenticated) {
      requestAccessToken()
      return
    }
    
    setSyncing(true)
    setError(null)
    setLoadProgress(null)
    
    try {
      const data = await getLibraryStructure((progress) => {
        setLibrary(progress)
        if (progress.loadingFiles) {
          setLoadProgress({
            loaded: progress.loadedCount || 0,
            total: progress.totalCount || 0,
          })
        } else {
          setLoadProgress(null)
        }
      })
      
      // Save to local database
      setLibrary(data)
      localStorage.setItem('tabVaultLibrary', JSON.stringify(data))
      const now = Date.now()
      localStorage.setItem('tabVaultLibraryTime', now.toString())
      setLastSynced(new Date(now))
      
    } catch (err) {
      setError('Failed to sync with Google Drive. Please try again.')
      console.error(err)
    } finally {
      setSyncing(false)
      setLoadProgress(null)
    }
  }

  // Format last synced time
  const formatLastSynced = (date) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const handleSignIn = () => {
    requestAccessToken()
  }

  const handleSignOut = () => {
    signOut()
    setAuthenticated(false)
  }

  const handleToggleGenre = (tabId, genre) => {
    toggleTabGenre(tabId, genre)
    setTabMetadata(getAllMetadata())
  }

  const handleAddGenre = (newGenre) => {
    if (newGenre.trim()) {
      const updated = addGenre(newGenre.trim())
      setGenres(updated)
    }
  }

  const handleRemoveGenre = (genre) => {
    const updated = removeGenre(genre)
    setGenres(updated)
    if (selectedGenre === genre) {
      setSelectedGenre(null)
    }
  }

  // Filter and search logic
  const filteredData = useMemo(() => {
    if (!library) return { artists: [], songs: [], totalSongs: 0 }

    let artists = library.artists
    let allSongs = artists.flatMap((a) =>
      a.songs.map((s) => ({
        ...s,
        artistName: a.name,
        artistId: a.id,
        genres: tabMetadata[s.id]?.genres || [],
      }))
    )

    // Filter by file type
    if (filterType === 'pdf') {
      allSongs = allSongs.filter((s) => s.files.pdf)
    } else if (filterType === 'gp') {
      allSongs = allSongs.filter((s) => s.files.gp)
    }

    // Filter by genre
    if (selectedGenre) {
      allSongs = allSongs.filter((s) => s.genres.includes(selectedGenre))
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      allSongs = allSongs.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.artistName.toLowerCase().includes(query)
      )
    }

    // Filter by artist
    if (selectedArtist) {
      allSongs = allSongs.filter((s) => s.artistId === selectedArtist)
    }

    const artistsWithSongs = artists
      .map((a) => ({
        ...a,
        filteredSongs: allSongs.filter((s) => s.artistId === a.id),
      }))
      .filter((a) => a.filteredSongs.length > 0 || !searchQuery)

    return {
      artists: artistsWithSongs,
      songs: allSongs,
      totalSongs: allSongs.length,
    }
  }, [library, searchQuery, selectedArtist, filterType, selectedGenre, tabMetadata])

  // Alphabet index
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')
  const artistsByLetter = useMemo(() => {
    if (!library) return {}
    const grouped = {}
    library.artists.forEach((artist) => {
      const firstChar = artist.name[0]?.toUpperCase() || '#'
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#'
      if (!grouped[letter]) grouped[letter] = []
      grouped[letter].push(artist)
    })
    return grouped
  }, [library])

  const scrollToLetter = (letter) => {
    const element = document.getElementById(`artist-section-${letter}`)
    if (element && artistListRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (!isConfigured) {
    return <SetupScreen />
  }

  return (
    <div className="tab-manager">
      <div className="tab-manager-header">
        <div className="tab-header-top">
          <div className="tab-title-section">
            <Guitar className="tab-icon" />
            <h2>Tab Vault</h2>
            <span className="tab-count-badge">
              {library ? library.artists.reduce((sum, a) => sum + a.songs.length, 0) : 0} tabs
            </span>
          </div>

          <div className="tab-actions">
            {authenticated && (
              <button
                className="tab-icon-btn"
                onClick={() => setShowGenreManager(true)}
                title="Manage genres"
              >
                <Settings size={18} />
              </button>
            )}
            {authenticated ? (
              <>
                <div className="sync-info">
                  <span className="last-synced-text">
                    {lastSynced ? `Synced ${formatLastSynced(lastSynced)}` : 'Not synced'}
                  </span>
                  <button
                    className="sync-btn"
                    onClick={syncWithDrive}
                    disabled={syncing}
                  >
                    <RefreshCw size={16} className={syncing ? 'spinning' : ''} />
                    <span>{syncing ? 'Syncing...' : 'Sync'}</span>
                  </button>
                </div>
                <button className="tab-icon-btn" onClick={handleSignOut} title="Sign out">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button className="connect-drive-btn" onClick={handleSignIn}>
                <LogIn size={18} />
                <span>Connect Google Drive</span>
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        {library && (
          <div className="tab-controls">
            <div className="tab-search-container">
              <Search className="tab-search-icon" size={18} />
              <input
                ref={searchInputRef}
                type="text"
                className="tab-search-input"
                placeholder="Search songs or artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="tab-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={16} />
                </button>
              )}
              <kbd className="tab-search-shortcut">⌘K</kbd>
            </div>

            <div className="tab-filters">
              {/* Genre Filter */}
              <GenreFilter
                genres={genres}
                selectedGenre={selectedGenre}
                onSelectGenre={setSelectedGenre}
              />

              {/* File Type Filter */}
              <div className="tab-filter-group">
                <button
                  className={`tab-filter-btn ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  All
                </button>
                <button
                  className={`tab-filter-btn ${filterType === 'pdf' ? 'active' : ''}`}
                  onClick={() => setFilterType('pdf')}
                >
                  <FileText size={14} />
                  PDF
                </button>
                <button
                  className={`tab-filter-btn ${filterType === 'gp' ? 'active' : ''}`}
                  onClick={() => setFilterType('gp')}
                >
                  <Guitar size={14} />
                  GP
                </button>
              </div>

              {/* View Toggle */}
              <div className="tab-view-toggle">
                <button
                  className={`tab-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <List size={18} />
                </button>
                <button
                  className={`tab-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="tab-content">
        {!authenticated && !library ? (
          <WelcomeScreen onSignIn={handleSignIn} />
        ) : syncing && !library ? (
          <LoadingScreen />
        ) : error && !library ? (
          <ErrorScreen error={error} onRetry={syncWithDrive} />
        ) : !library ? (
          <FirstSyncScreen onSync={syncWithDrive} syncing={syncing} authenticated={authenticated} onSignIn={handleSignIn} />
        ) : library ? (
          <div className="tab-layout">
            {/* Sidebar */}
            <aside className="tab-sidebar">
              <div className="tab-sidebar-header">
                <h3>Artists</h3>
                <span className="artist-badge">{library.artists.length}</span>
              </div>

              <div className="alphabet-nav">
                {alphabet.map((letter) => (
                  <button
                    key={letter}
                    className={`alphabet-btn ${artistsByLetter[letter] ? 'has-artists' : ''}`}
                    onClick={() => scrollToLetter(letter)}
                    disabled={!artistsByLetter[letter]}
                  >
                    {letter}
                  </button>
                ))}
              </div>

              <div className="artist-list" ref={artistListRef}>
                <button
                  className={`artist-item ${!selectedArtist ? 'active' : ''}`}
                  onClick={() => setSelectedArtist(null)}
                >
                  <Music size={16} />
                  <span>All Artists</span>
                  <span className="artist-song-count">
                    {library.artists.reduce((sum, a) => sum + a.songs.length, 0)}
                  </span>
                </button>

                {Object.entries(artistsByLetter)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([letter, artists]) => (
                    <div key={letter} id={`artist-section-${letter}`}>
                      <div className="artist-letter">{letter}</div>
                      {artists.map((artist) => (
                        <button
                          key={artist.id}
                          className={`artist-item ${selectedArtist === artist.id ? 'active' : ''}`}
                          onClick={() => setSelectedArtist(artist.id)}
                        >
                          <User size={16} />
                          <span className="artist-name-text">{artist.name}</span>
                          <span className="artist-song-count">{artist.songs.length}</span>
                        </button>
                      ))}
                    </div>
                  ))}
              </div>
            </aside>

            {/* Tab List */}
            <section className="tab-main">
              <div className="tab-main-header">
                <h3 className="current-view-title">
                  {selectedArtist
                    ? library.artists.find((a) => a.id === selectedArtist)?.name
                    : 'All Songs'}
                </h3>
                <span className="result-count">
                  {filteredData.totalSongs} songs
                  {loadProgress && (
                    <span className="loading-count">
                      · Loading: {loadProgress.loaded}/{loadProgress.total}
                    </span>
                  )}
                </span>
              </div>

              {/* Tab List Content */}
              <div className={`tab-list ${viewMode}`}>
                {filteredData.songs.length === 0 ? (
                  <div className="tab-empty-state">
                    <Music size={48} />
                    <h3>No songs found</h3>
                    <p>
                      {searchQuery || selectedGenre
                        ? 'Try adjusting your filters'
                        : 'No tabs available'}
                    </p>
                  </div>
                ) : viewMode === 'list' ? (
                  <div className="tab-table">
                    <div className="tab-table-header">
                      <div className="col-title">Title</div>
                      <div className="col-artist">Artist</div>
                      <div className="col-genre">Genre</div>
                      <div className="col-files">Files</div>
                    </div>
                    {filteredData.songs.map((song, index) => (
                      <TabRow
                        key={song.id}
                        song={song}
                        index={index}
                        genres={genres}
                        onToggleGenre={handleToggleGenre}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="tab-grid">
                    {filteredData.songs.map((song, index) => (
                      <TabCard
                        key={song.id}
                        song={song}
                        index={index}
                        genres={genres}
                        onToggleGenre={handleToggleGenre}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {/* Genre Manager Modal */}
      {showGenreManager && (
        <GenreManager
          genres={genres}
          onAddGenre={handleAddGenre}
          onRemoveGenre={handleRemoveGenre}
          onClose={() => setShowGenreManager(false)}
        />
      )}
    </div>
  )
}

// Genre Filter Dropdown
function GenreFilter({ genres, selectedGenre, onSelectGenre }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="genre-filter-dropdown" ref={dropdownRef}>
      <button
        className={`genre-filter-trigger ${selectedGenre ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Tag size={14} />
        <span>{selectedGenre || 'Genre'}</span>
        <ChevronDown size={14} className={isOpen ? 'rotated' : ''} />
      </button>
      {isOpen && (
        <div className="genre-dropdown-menu">
          <button
            className={`genre-option ${!selectedGenre ? 'active' : ''}`}
            onClick={() => {
              onSelectGenre(null)
              setIsOpen(false)
            }}
          >
            All Genres
          </button>
          {genres.map((genre) => (
            <button
              key={genre}
              className={`genre-option ${selectedGenre === genre ? 'active' : ''}`}
              onClick={() => {
                onSelectGenre(genre)
                setIsOpen(false)
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Genre Picker for Tabs
function GenrePicker({ tabId, tabGenres, allGenres, onToggleGenre }) {
  const [isOpen, setIsOpen] = useState(false)
  const pickerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="tab-genre-picker" ref={pickerRef}>
      <button className="genre-picker-trigger" onClick={() => setIsOpen(!isOpen)}>
        {tabGenres.length > 0 ? (
          <div className="genre-tag-list">
            {tabGenres.slice(0, 2).map((g) => (
              <span key={g} className="genre-mini-tag">
                {g}
              </span>
            ))}
            {tabGenres.length > 2 && (
              <span className="genre-mini-tag more">+{tabGenres.length - 2}</span>
            )}
          </div>
        ) : (
          <span className="genre-add-placeholder">
            <Plus size={12} />
            Add
          </span>
        )}
      </button>
      {isOpen && (
        <div className="genre-picker-menu">
          {allGenres.map((genre) => (
            <button
              key={genre}
              className={`genre-picker-option ${tabGenres.includes(genre) ? 'selected' : ''}`}
              onClick={() => onToggleGenre(tabId, genre)}
            >
              <span>{genre}</span>
              {tabGenres.includes(genre) && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Genre Manager Modal
function GenreManager({ genres, onAddGenre, onRemoveGenre, onClose }) {
  const [newGenre, setNewGenre] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (newGenre.trim()) {
      onAddGenre(newGenre.trim())
      setNewGenre('')
    }
  }

  return (
    <div className="tab-modal-overlay" onClick={onClose}>
      <div className="tab-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tab-modal-header">
          <h3>Manage Genres</h3>
          <button className="tab-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="tab-modal-content">
          <form onSubmit={handleSubmit} className="add-genre-form">
            <input
              type="text"
              placeholder="Add new genre..."
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
              className="genre-input"
            />
            <button type="submit" className="add-genre-btn">
              <Plus size={16} />
              Add
            </button>
          </form>
          <div className="genre-manage-list">
            {genres.map((genre) => (
              <div key={genre} className="genre-manage-item">
                <Tag size={16} />
                <span>{genre}</span>
                <button
                  className="genre-delete-btn"
                  onClick={() => onRemoveGenre(genre)}
                  title="Remove genre"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Tab Row Component (List View)
function TabRow({ song, index, genres, onToggleGenre }) {
  return (
    <div
      className="tab-row"
      style={{ animationDelay: `${Math.min(index * 20, 300)}ms` }}
    >
      <div className="col-title">
        <Music size={16} className="tab-music-icon" />
        <span className="tab-song-name">{song.name}</span>
      </div>
      <div className="col-artist">
        <span className="tab-artist-name">{song.artistName}</span>
      </div>
      <div className="col-genre">
        <GenrePicker
          tabId={song.id}
          tabGenres={song.genres}
          allGenres={genres}
          onToggleGenre={onToggleGenre}
        />
      </div>
      <div className="col-files">
        {song.loading ? (
          <span className="file-badge loading">
            <RefreshCw size={14} className="spinning" />
            <span>Loading...</span>
          </span>
        ) : (
          <>
            {song.files.pdf && (
              <a
                href={song.files.pdf.link}
                target="_blank"
                rel="noopener noreferrer"
                className="file-badge pdf"
                title={`Open PDF: ${song.files.pdf.name}`}
              >
                <FileText size={14} />
                <span>PDF</span>
              </a>
            )}
            {song.files.gp && (
              <a
                href={song.files.gp.link}
                target="_blank"
                rel="noopener noreferrer"
                className="file-badge gp"
                title={`Open Guitar Pro: ${song.files.gp.name}`}
              >
                <Guitar size={14} />
                <span>GP</span>
              </a>
            )}
            {!song.files.pdf && !song.files.gp && (
              <span className="file-badge empty">No files</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Tab Card Component (Grid View)
function TabCard({ song, index, genres, onToggleGenre }) {
  return (
    <div
      className={`tab-card ${song.loading ? 'loading' : ''}`}
      style={{ animationDelay: `${Math.min(index * 30, 400)}ms` }}
    >
      <div className="tab-card-header">
        <div className="tab-card-icon">
          <Music size={24} />
        </div>
        <div className="tab-card-actions">
          {song.loading ? (
            <RefreshCw size={18} className="spinning" />
          ) : (
            <>
              {song.files.pdf && (
                <a
                  href={song.files.pdf.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tab-card-action pdf"
                  title="Open PDF"
                >
                  <FileText size={18} />
                </a>
              )}
              {song.files.gp && (
                <a
                  href={song.files.gp.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tab-card-action gp"
                  title="Open Guitar Pro"
                >
                  <Guitar size={18} />
                </a>
              )}
            </>
          )}
        </div>
      </div>
      <div className="tab-card-content">
        <h4 className="tab-card-title">{song.name}</h4>
        <p className="tab-card-artist">{song.artistName}</p>
      </div>
      <div className="tab-card-genres">
        <GenrePicker
          tabId={song.id}
          tabGenres={song.genres}
          allGenres={genres}
          onToggleGenre={onToggleGenre}
        />
      </div>
      <div className="tab-card-footer">
        {song.loading ? (
          <span className="tab-card-badge loading">Loading...</span>
        ) : (
          <>
            {song.files.pdf && <span className="tab-card-badge pdf">PDF</span>}
            {song.files.gp && <span className="tab-card-badge gp">GP</span>}
          </>
        )}
      </div>
    </div>
  )
}

// Welcome Screen
function WelcomeScreen({ onSignIn }) {
  return (
    <div className="tab-welcome">
      <div className="tab-welcome-content">
        <div className="tab-welcome-icon">
          <Guitar size={64} />
        </div>
        <h2>Welcome to Tab Vault</h2>
        <p>
          Connect your Google Drive to access your guitar tab collection.
          <br />
          All your tabs, organized and easily accessible.
        </p>
        <button className="connect-drive-btn large" onClick={onSignIn}>
          <LogIn size={20} />
          <span>Connect Google Drive</span>
        </button>
        <p className="tab-welcome-note">
          Your data stays private. We only read your tab files.
        </p>
      </div>

      <div className="tab-features">
        <div className="tab-feature">
          <Search size={24} />
          <h4>Quick Search</h4>
          <p>Find any song instantly with powerful search</p>
        </div>
        <div className="tab-feature">
          <FileText size={24} />
          <h4>PDF Access</h4>
          <p>One-click access to your PDF tabs</p>
        </div>
        <div className="tab-feature">
          <Guitar size={24} />
          <h4>Guitar Pro</h4>
          <p>Quick links to your GP files</p>
        </div>
      </div>
    </div>
  )
}

// Loading Screen
function LoadingScreen() {
  return (
    <div className="tab-loading">
      <div className="tab-loading-content">
        <RefreshCw size={48} className="spinning" />
        <h3>Syncing your library...</h3>
        <p>Scanning your Google Drive for tabs</p>
      </div>
    </div>
  )
}

// First Sync Screen
function FirstSyncScreen({ onSync, syncing, authenticated, onSignIn }) {
  return (
    <div className="tab-welcome">
      <div className="tab-welcome-content">
        <div className="tab-welcome-icon">
          <Guitar size={64} />
        </div>
        <h2>Build Your Library</h2>
        <p>
          {authenticated 
            ? "Click 'Sync' to scan your Google Drive and build your local tab database. This only needs to be done once."
            : "Connect your Google Drive to scan your tabs and build a local database."}
        </p>
        {authenticated ? (
          <button className="sync-btn large" onClick={onSync} disabled={syncing}>
            <RefreshCw size={20} className={syncing ? 'spinning' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync with Google Drive'}</span>
          </button>
        ) : (
          <button className="connect-drive-btn large" onClick={onSignIn}>
            <LogIn size={20} />
            <span>Connect Google Drive</span>
          </button>
        )}
        <p className="tab-welcome-note">
          Your library is stored locally. Sync again anytime to pick up new tabs.
        </p>
      </div>

      <div className="tab-features">
        <div className="tab-feature">
          <RefreshCw size={24} />
          <h4>Local Database</h4>
          <p>Your library is cached locally for instant access</p>
        </div>
        <div className="tab-feature">
          <Tag size={24} />
          <h4>Custom Tags</h4>
          <p>Add genres and organize your collection</p>
        </div>
        <div className="tab-feature">
          <Search size={24} />
          <h4>Fast Search</h4>
          <p>Find songs instantly after syncing</p>
        </div>
      </div>
    </div>
  )
}

// Error Screen
function ErrorScreen({ error, onRetry }) {
  return (
    <div className="tab-error">
      <div className="tab-error-content">
        <span className="tab-error-icon">⚠️</span>
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button className="sync-btn" onClick={onRetry}>
          <RefreshCw size={18} />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  )
}

// Setup Screen
function SetupScreen() {
  return (
    <div className="tab-setup">
      <div className="tab-setup-content">
        <div className="tab-welcome-icon">
          <Guitar size={64} />
        </div>
        <h2>Tab Vault Setup Required</h2>
        <p>Google Drive API credentials need to be configured.</p>
        <p className="tab-welcome-note">
          Contact the administrator to set up Google Drive access.
        </p>
      </div>
    </div>
  )
}

export default TabManager
