function StudentProgress({
  student,
  checklists,
  songs,
  activeStripe,
  onToggleProgress,
  onGraduate,
  calculateCompletion,
  stripeColors,
  stripeTextColors,
  stripeOrder
}) {
  const items = checklists[activeStripe] || []
  const completion = calculateCompletion(student, activeStripe)
  const currentStripeIndex = stripeOrder.indexOf(student.currentStripe)
  const activeStripeIndex = stripeOrder.indexOf(activeStripe)
  const canGraduate = completion === 100 && activeStripe === student.currentStripe && currentStripeIndex < stripeOrder.length - 1

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

  return (
    <div className="student-progress-container">
      <div className="progress-header">
        <div className="student-info">
          <h2>{student.name}</h2>
          <div 
            className="current-stripe-badge"
            style={{
              backgroundColor: stripeColors[student.currentStripe],
              color: stripeTextColors[student.currentStripe]
            }}
          >
            Current: {student.currentStripe} stripe
          </div>
        </div>

        <div className="stripe-journey">
          {stripeOrder.map((stripe, idx) => (
            <div key={stripe} className="journey-step">
              <div
                className={`journey-dot ${currentStripeIndex >= idx ? 'achieved' : ''} ${stripe === activeStripe ? 'viewing' : ''}`}
                style={{
                  backgroundColor: currentStripeIndex >= idx ? stripeColors[stripe] : '#e9ecef',
                  border: stripe === 'white' ? '2px solid #dee2e6' : stripe === activeStripe ? `3px solid ${stripeColors[stripe]}` : 'none',
                  boxShadow: stripe === activeStripe ? `0 0 0 3px ${stripeColors[stripe]}33` : 'none'
                }}
              />
              {idx < stripeOrder.length - 1 && (
                <div className={`journey-line ${currentStripeIndex > idx ? 'achieved' : ''}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="viewing-stripe-header">
        <h3 style={{ color: stripeColors[activeStripe] }}>
          {activeStripe.charAt(0).toUpperCase() + activeStripe.slice(1)} Stripe Checklist
        </h3>
        <div className="completion-badge">
          <div 
            className="completion-ring"
            style={{
              background: `conic-gradient(${stripeColors[activeStripe]} ${completion * 3.6}deg, #e9ecef ${completion * 3.6}deg)`
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
          <p>No checklist items for {activeStripe} stripe yet.</p>
          <p className="hint">Go to "Manage Checklists" to add items.</p>
        </div>
      ) : (
        <div className="checklist">
          {items.map(item => {
            const isChecked = student.progress[activeStripe]?.[item.id] || false
            const hasSubItems = item.subItems && item.subItems.length > 0
            
            return (
              <div key={item.id} className="checklist-item-group">
                <div 
                  className={`checklist-item ${isChecked ? 'checked' : ''}`}
                  onClick={() => onToggleProgress(student.id, activeStripe, item.id)}
                >
                  <div 
                    className="checkbox"
                    style={{
                      borderColor: isChecked ? stripeColors[activeStripe] : '#ced4da',
                      backgroundColor: isChecked ? stripeColors[activeStripe] : 'transparent'
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
                      const subChecked = student.progress[activeStripe]?.[subItem.id] || false
                      return (
                        <div
                          key={subItem.id}
                          className={`checklist-item sub-item ${subChecked ? 'checked' : ''}`}
                          onClick={() => onToggleProgress(student.id, activeStripe, subItem.id)}
                        >
                          <div 
                            className="checkbox small"
                            style={{
                              borderColor: subChecked ? stripeColors[activeStripe] : '#ced4da',
                              backgroundColor: subChecked ? stripeColors[activeStripe] : 'transparent'
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
            🎉 {student.name} has completed all requirements for {student.currentStripe} stripe!
          </div>
          <button
            className="graduate-btn"
            onClick={() => onGraduate(student.id)}
            style={{
              backgroundColor: stripeColors[stripeOrder[currentStripeIndex + 1]],
              color: stripeTextColors[stripeOrder[currentStripeIndex + 1]]
            }}
          >
            Graduate to {stripeOrder[currentStripeIndex + 1]} stripe →
          </button>
        </div>
      )}

      {currentStripeIndex === stripeOrder.length - 1 && completion === 100 && activeStripe === student.currentStripe && (
        <div className="graduate-section master">
          <div className="graduate-message">
            🏆 {student.name} has achieved the highest stripe level! Congratulations!
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentProgress
