function StudentProgress({
  student,
  checklists,
  songs,
  activeLevel,
  onToggleProgress,
  onGraduate,
  calculateCompletion,
  levelColors,
  levelTextColors,
  levelOrder,
  levelNames,
  isAdmin
}) {
  const items = checklists[activeLevel] || []
  const completion = calculateCompletion(student, activeLevel)
  const currentLevelIndex = levelOrder.indexOf(student.currentLevel)
  const activeLevelIndex = levelOrder.indexOf(activeLevel)
  const canGraduate = completion === 100 && activeLevel === student.currentLevel && currentLevelIndex < levelOrder.length - 1 && onGraduate && isAdmin

  const getSongById = (songId) => songs?.find(s => s.id === songId)

  const renderLinkedSongs = (linkedSongIds) => {
    if (!linkedSongIds || linkedSongIds.length === 0) return null
    
    return (
      <div className="progress-linked-songs">
        {linkedSongIds.map(songId => {
          const song = getSongById(songId)
          if (!song) return null
          return (
            <span key={songId} className="progress-song-tag">
              🎵 {song.artist ? `${song.artist} - ` : ''}{song.title}
            </span>
          )
        })}
      </div>
    )
  }

  const handleItemClick = (itemId) => {
    // Only allow toggling if admin and handler exists
    if (isAdmin && onToggleProgress) {
      onToggleProgress(student.id, activeLevel, itemId)
    }
  }

  return (
    <div className="student-progress-container">
      <div className="progress-header">
        <div className="student-info">
          <h2>{student.name}</h2>
          <div 
            className="current-level-badge"
            style={{
              backgroundColor: levelColors[student.currentLevel],
              color: levelTextColors[student.currentLevel]
            }}
          >
            Current: {levelNames[student.currentLevel]}
          </div>
        </div>

        <div className="level-journey">
          {levelOrder.map((level, idx) => (
            <div key={level} className="journey-step">
              <div
                className={`journey-dot ${currentLevelIndex >= idx ? 'achieved' : ''} ${level === activeLevel ? 'viewing' : ''}`}
                style={{
                  backgroundColor: currentLevelIndex >= idx ? levelColors[level] : '#e9ecef',
                  border: level === activeLevel ? `3px solid ${levelColors[level]}` : 'none',
                  boxShadow: level === activeLevel ? `0 0 0 3px ${levelColors[level]}33` : 'none'
                }}
                title={levelNames[level]}
              />
              {idx < levelOrder.length - 1 && (
                <div className={`journey-line ${currentLevelIndex > idx ? 'achieved' : ''}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="viewing-level-header">
        <h3 style={{ color: levelColors[activeLevel] }}>
          {levelNames[activeLevel]} Checklist
          {!isAdmin && <span className="read-only-badge">View Only</span>}
        </h3>
        <div className="completion-badge">
          <div 
            className="completion-ring"
            style={{
              background: `conic-gradient(${levelColors[activeLevel]} ${completion * 3.6}deg, #e9ecef ${completion * 3.6}deg)`
            }}
          >
            <div className="completion-inner">
              {completion}%
            </div>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-checklist">
          <span className="empty-icon">📋</span>
          <p>No checklist items for {levelNames[activeLevel]} yet.</p>
          {isAdmin && <p className="hint">Go to "Curriculum" to add items.</p>}
        </div>
      ) : (
        <div className="checklist">
          {items.map(item => {
            const isChecked = student.progress[activeLevel]?.[item.id] || false
            const hasSubItems = item.subItems && item.subItems.length > 0
            
            return (
              <div key={item.id} className="checklist-item-group">
                <div 
                  className={`checklist-item ${isChecked ? 'checked' : ''} ${isAdmin ? 'clickable' : 'read-only'}`}
                  onClick={() => handleItemClick(item.id)}
                >
                  <div 
                    className="checkbox"
                    style={{
                      borderColor: isChecked ? levelColors[activeLevel] : '#ced4da',
                      backgroundColor: isChecked ? levelColors[activeLevel] : 'transparent'
                    }}
                  >
                    {isChecked && <span className="checkmark">✓</span>}
                  </div>
                  <div className="item-content">
                    <span className="item-text">{item.text}</span>
                    {renderLinkedSongs(item.linkedSongs)}
                  </div>
                </div>
                
                {hasSubItems && (
                  <div className="sub-items">
                    {item.subItems.map(subItem => {
                      const subChecked = student.progress[activeLevel]?.[subItem.id] || false
                      return (
                        <div
                          key={subItem.id}
                          className={`checklist-item sub-item ${subChecked ? 'checked' : ''} ${isAdmin ? 'clickable' : 'read-only'}`}
                          onClick={() => handleItemClick(subItem.id)}
                        >
                          <div 
                            className="checkbox small"
                            style={{
                              borderColor: subChecked ? levelColors[activeLevel] : '#ced4da',
                              backgroundColor: subChecked ? levelColors[activeLevel] : 'transparent'
                            }}
                          >
                            {subChecked && <span className="checkmark">✓</span>}
                          </div>
                          <div className="item-content">
                            <span className="item-text">{subItem.text}</span>
                            {renderLinkedSongs(subItem.linkedSongs)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {canGraduate && (
        <div className="graduate-section">
          <div className="graduate-message">
            🎉 {student.name} has completed all requirements for {levelNames[student.currentLevel]}!
          </div>
          <button
            className="graduate-btn"
            onClick={() => onGraduate(student.id)}
            style={{
              backgroundColor: levelColors[levelOrder[currentLevelIndex + 1]],
              color: levelTextColors[levelOrder[currentLevelIndex + 1]]
            }}
          >
            Advance to {levelNames[levelOrder[currentLevelIndex + 1]]} →
          </button>
        </div>
      )}

      {currentLevelIndex === levelOrder.length - 1 && completion === 100 && activeLevel === student.currentLevel && (
        <div className="graduate-section master">
          <div className="graduate-message">
            🏆 {student.name} has achieved the highest level! Congratulations!
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentProgress
