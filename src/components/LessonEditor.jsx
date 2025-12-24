import { useState, useEffect, useRef } from 'react'

function LessonEditor({ 
  item, 
  subItem,
  levelName, 
  levelColor, 
  onSave, 
  onClose 
}) {
  const [content, setContent] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [viewMode, setViewMode] = useState('edit')
  const textareaRef = useRef(null)

  const editingItem = subItem || item
  const isSubItem = Boolean(subItem)
  const itemId = editingItem?.id
  const initialContent = editingItem?.lessonContent || ''

  useEffect(() => {
    setContent(initialContent)
    setHasChanges(false)
  }, [itemId, initialContent])

  // Safety check - render nothing if no item
  if (!item) {
    return null
  }

  const handleContentChange = (e) => {
    const value = e.target.value
    setContent(value)
    setHasChanges(value !== initialContent)
  }

  const handleSave = () => {
    onSave(content)
    setHasChanges(false)
  }

  const handleCloseClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseClick(e)
    }
  }

  const insertFormatting = (before, after = '') => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end)
    
    setContent(newText)
    setHasChanges(true)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }

  return (
    <div className="lesson-editor-overlay" onClick={handleOverlayClick}>
      <div className="lesson-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lesson-editor-header" style={{ borderBottomColor: levelColor }}>
          <div className="lesson-header-info">
            <span className="lesson-level-badge" style={{ backgroundColor: levelColor }}>
              {levelName}
            </span>
            <div className="lesson-title-section">
              {isSubItem && (
                <span className="lesson-parent-item">{item.text}</span>
              )}
              <h2 className="lesson-item-title">
                {isSubItem && <span className="sub-indicator">↳ </span>}
                {editingItem?.text || 'Untitled'}
              </h2>
            </div>
          </div>
          <button className="lesson-close-btn" onClick={handleCloseClick} type="button">×</button>
        </div>

        <div className="lesson-editor-toolbar">
          <div className="toolbar-buttons">
            <button className="toolbar-btn" onClick={() => insertFormatting('<h1>', '</h1>')} title="Heading 1" type="button">H1</button>
            <button className="toolbar-btn" onClick={() => insertFormatting('<h2>', '</h2>')} title="Heading 2" type="button">H2</button>
            <button className="toolbar-btn" onClick={() => insertFormatting('<h3>', '</h3>')} title="Heading 3" type="button">H3</button>
            <button className="toolbar-btn" onClick={() => insertFormatting('<strong>', '</strong>')} title="Bold" type="button" style={{ fontWeight: 'bold' }}>B</button>
            <button className="toolbar-btn" onClick={() => insertFormatting('<em>', '</em>')} title="Italic" type="button" style={{ fontStyle: 'italic' }}>I</button>
            <button className="toolbar-btn" onClick={() => insertFormatting('<u>', '</u>')} title="Underline" type="button" style={{ textDecoration: 'underline' }}>U</button>
            <button className="toolbar-btn" onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')} title="Bullet List" type="button">•</button>
            <button className="toolbar-btn" onClick={() => insertFormatting('<ol>\n  <li>', '</li>\n</ol>')} title="Numbered List" type="button">1.</button>
            <button className="toolbar-btn" onClick={() => insertFormatting('<blockquote>', '</blockquote>')} title="Quote" type="button">❝</button>
            <button className="toolbar-btn" onClick={() => insertFormatting('<a href="">', '</a>')} title="Link" type="button">🔗</button>
          </div>
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'edit' ? 'active' : ''}`}
              onClick={() => setViewMode('edit')}
              type="button"
            >
              Edit
            </button>
            <button 
              className={`view-btn ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => setViewMode('preview')}
              type="button"
            >
              Preview
            </button>
          </div>
        </div>

        <div className="lesson-editor-content">
          {viewMode === 'edit' ? (
            <textarea
              ref={textareaRef}
              className="lesson-textarea"
              value={content}
              onChange={handleContentChange}
              placeholder="Start writing your lesson content here...

Use HTML tags for formatting:
• <h1>, <h2>, <h3> for headings
• <strong> for bold, <em> for italic
• <ul><li>item</li></ul> for bullet lists
• <a href='url'>text</a> for links"
            />
          ) : (
            <div 
              className="lesson-preview"
              dangerouslySetInnerHTML={{ 
                __html: content || '<p style="color: #6b7280;">No content yet.</p>' 
              }}
            />
          )}
        </div>

        <div className="lesson-editor-footer">
          <div className="lesson-footer-info">
            {hasChanges ? (
              <span className="unsaved-indicator">● Unsaved changes</span>
            ) : (
              <span className="saved-indicator">✓ Saved</span>
            )}
          </div>
          <div className="lesson-footer-actions">
            <button className="lesson-cancel-btn" onClick={handleCloseClick} type="button">
              Cancel
            </button>
            <button 
              className="lesson-save-btn" 
              onClick={handleSave}
              disabled={!hasChanges}
              style={{ backgroundColor: hasChanges ? levelColor : undefined }}
              type="button"
            >
              Save Lesson
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LessonEditor
