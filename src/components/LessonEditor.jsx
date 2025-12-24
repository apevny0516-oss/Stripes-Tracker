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
  const [viewMode, setViewMode] = useState('edit') // 'edit' or 'preview'
  const textareaRef = useRef(null)

  // Get the current item being edited (either main item or sub-item)
  const editingItem = subItem || item
  const isSubItem = !!subItem

  useEffect(() => {
    if (editingItem) {
      setContent(editingItem.lessonContent || '')
      setHasChanges(false)
    }
  }, [editingItem])

  // Safety check - if no item, don't render
  if (!item) {
    return null
  }

  const handleContentChange = (e) => {
    const value = e.target.value
    setContent(value)
    setHasChanges(value !== (editingItem?.lessonContent || ''))
  }

  const handleSave = () => {
    onSave(content)
    setHasChanges(false)
  }

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  // Helper functions for inserting formatting
  const insertFormatting = (before, after = '') => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end)
    
    setContent(newText)
    setHasChanges(true)
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }

  const toolbarButtons = [
    { label: 'H1', action: () => insertFormatting('<h1>', '</h1>'), title: 'Heading 1' },
    { label: 'H2', action: () => insertFormatting('<h2>', '</h2>'), title: 'Heading 2' },
    { label: 'H3', action: () => insertFormatting('<h3>', '</h3>'), title: 'Heading 3' },
    { label: 'B', action: () => insertFormatting('<strong>', '</strong>'), title: 'Bold', style: { fontWeight: 'bold' } },
    { label: 'I', action: () => insertFormatting('<em>', '</em>'), title: 'Italic', style: { fontStyle: 'italic' } },
    { label: 'U', action: () => insertFormatting('<u>', '</u>'), title: 'Underline', style: { textDecoration: 'underline' } },
    { label: '•', action: () => insertFormatting('<ul>\n  <li>', '</li>\n</ul>'), title: 'Bullet List' },
    { label: '1.', action: () => insertFormatting('<ol>\n  <li>', '</li>\n</ol>'), title: 'Numbered List' },
    { label: '❝', action: () => insertFormatting('<blockquote>', '</blockquote>'), title: 'Quote' },
    { label: '🔗', action: () => insertFormatting('<a href="">', '</a>'), title: 'Link' },
    { label: '🖼️', action: () => insertFormatting('<img src="', '" alt="image" />'), title: 'Image' },
    { label: '▶️', action: () => insertFormatting('<iframe src="', '" width="560" height="315"></iframe>'), title: 'Video Embed' },
  ]

  return (
    <div className="lesson-editor-overlay" onClick={handleClose}>
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
                {editingItem?.text}
              </h2>
            </div>
          </div>
          <button className="lesson-close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="lesson-editor-toolbar">
          <div className="toolbar-buttons">
            {toolbarButtons.map((btn, idx) => (
              <button
                key={idx}
                className="toolbar-btn"
                onClick={btn.action}
                title={btn.title}
                style={btn.style}
                type="button"
              >
                {btn.label}
              </button>
            ))}
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

You can use HTML tags for formatting:
• <h1>, <h2>, <h3> for headings
• <strong> or <b> for bold
• <em> or <i> for italic
• <ul> and <li> for bullet lists
• <ol> and <li> for numbered lists
• <a href='url'>text</a> for links
• <img src='url' /> for images

Use the toolbar buttons above to insert formatting."
            />
          ) : (
            <div 
              className="lesson-preview"
              dangerouslySetInnerHTML={{ __html: content || '<p style="color: #6b7280; font-style: italic;">No content yet. Switch to Edit mode to add content.</p>' }}
            />
          )}
        </div>

        <div className="lesson-editor-footer">
          <div className="lesson-footer-info">
            {hasChanges ? (
              <span className="unsaved-indicator">● Unsaved changes</span>
            ) : (
              <span className="saved-indicator">✓ All changes saved</span>
            )}
          </div>
          <div className="lesson-footer-actions">
            <button className="lesson-cancel-btn" onClick={handleClose} type="button">
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
