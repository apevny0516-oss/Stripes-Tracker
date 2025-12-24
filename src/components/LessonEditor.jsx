import { useState, useEffect, useMemo } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

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

  // Get the current item being edited (either main item or sub-item)
  const editingItem = subItem || item
  const isSubItem = !!subItem

  useEffect(() => {
    setContent(editingItem?.lessonContent || '')
    setHasChanges(false)
  }, [editingItem])

  const handleContentChange = (value) => {
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

  // Quill editor configuration
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  }), [])

  const formats = [
    'header', 'font',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
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

        <div className="lesson-editor-toolbar-hint">
          <span>📝</span> Create your lesson content below. Use the toolbar to format text, add images, embed videos, and more.
        </div>

        <div className="lesson-editor-content">
          <ReactQuill
            theme="snow"
            value={content}
            onChange={handleContentChange}
            modules={modules}
            formats={formats}
            placeholder="Start writing your lesson content here...

You can include:
• Detailed explanations of the concept
• Step-by-step instructions
• Tips and common mistakes to avoid
• Practice exercises
• Related concepts to review"
          />
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
            <button className="lesson-cancel-btn" onClick={handleClose}>
              Cancel
            </button>
            <button 
              className="lesson-save-btn" 
              onClick={handleSave}
              disabled={!hasChanges}
              style={{ backgroundColor: hasChanges ? levelColor : undefined }}
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

