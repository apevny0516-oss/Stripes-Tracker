function LessonViewer({ 
  item, 
  subItem, 
  levelName, 
  levelColor, 
  onClose 
}) {
  const editingItem = subItem || item
  const isSubItem = Boolean(subItem)
  const content = editingItem?.lessonContent || ''

  // Safety check
  if (!item) {
    return null
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="lesson-viewer-overlay" onClick={handleOverlayClick}>
      <div className="lesson-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lesson-viewer-header" style={{ borderBottomColor: levelColor }}>
          <div className="lesson-viewer-header-info">
            <span className="lesson-viewer-badge" style={{ backgroundColor: levelColor }}>
              {levelName}
            </span>
            <div className="lesson-viewer-title-section">
              {isSubItem && (
                <span className="lesson-viewer-parent">{item.text}</span>
              )}
              <h2 className="lesson-viewer-title">
                {isSubItem && <span className="viewer-sub-indicator">↳ </span>}
                {editingItem?.text || 'Untitled'}
              </h2>
            </div>
          </div>
          <button className="lesson-viewer-close" onClick={onClose} type="button">×</button>
        </div>

        <div className="lesson-viewer-content">
          {content ? (
            <div 
              className="lesson-content-rendered"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="lesson-no-content">
              <span className="no-content-icon">📝</span>
              <p>No lesson content available yet.</p>
              <p className="no-content-hint">Check back later for updates!</p>
            </div>
          )}
        </div>

        <div className="lesson-viewer-footer">
          <button className="lesson-viewer-done-btn" onClick={onClose} style={{ backgroundColor: levelColor }}>
            Done Reading
          </button>
        </div>
      </div>
    </div>
  )
}

export default LessonViewer

