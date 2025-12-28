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
  const [viewMode, setViewMode] = useState('richtext') // 'richtext', 'html', 'preview'
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const editorRef = useRef(null)
  const htmlTextareaRef = useRef(null)
  const savedSelection = useRef(null)
  const isInitialized = useRef(false)

  const editingItem = subItem || item
  const isSubItem = Boolean(subItem)
  const itemId = editingItem?.id
  const initialContent = editingItem?.lessonContent || ''

  // Initialize content when item changes
  useEffect(() => {
    setContent(initialContent)
    setHasChanges(false)
    isInitialized.current = false
  }, [itemId, initialContent])

  // Initialize editor content ONLY once when switching to richtext mode
  useEffect(() => {
    if (viewMode === 'richtext' && editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = content
      isInitialized.current = true
    }
  }, [viewMode, content])

  // Safety check
  if (!item) {
    return null
  }

  const saveSelection = () => {
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      savedSelection.current = selection.getRangeAt(0).cloneRange()
    }
  }

  const restoreSelection = () => {
    if (savedSelection.current && editorRef.current) {
      editorRef.current.focus()
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(savedSelection.current)
    }
  }

  const handleEditorInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML
      setContent(newContent)
      setHasChanges(newContent !== initialContent)
    }
  }

  const handleHtmlChange = (e) => {
    const value = e.target.value
    setContent(value)
    setHasChanges(value !== initialContent)
  }

  const handleSave = () => {
    // If in richtext mode, get content from editor
    let finalContent = content
    if (viewMode === 'richtext' && editorRef.current) {
      finalContent = editorRef.current.innerHTML
    }
    onSave(finalContent)
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

  // Format commands
  const execCommand = (command, value = null) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    handleEditorInput()
  }

  const formatBold = () => execCommand('bold')
  const formatItalic = () => execCommand('italic')
  const formatUnderline = () => execCommand('underline')
  const formatStrikethrough = () => execCommand('strikeThrough')
  const formatSubscript = () => execCommand('subscript')
  const formatSuperscript = () => execCommand('superscript')
  const formatOrderedList = () => execCommand('insertOrderedList')
  const formatUnorderedList = () => execCommand('insertUnorderedList')
  const formatIndent = () => execCommand('indent')
  const formatOutdent = () => execCommand('outdent')
  const formatAlignLeft = () => execCommand('justifyLeft')
  const formatAlignCenter = () => execCommand('justifyCenter')
  const formatAlignRight = () => execCommand('justifyRight')
  const formatRemoveFormat = () => execCommand('removeFormat')
  const formatHorizontalRule = () => execCommand('insertHorizontalRule')

  const formatHeading = (level) => {
    execCommand('formatBlock', `<h${level}>`)
  }

  const formatParagraph = () => {
    execCommand('formatBlock', '<p>')
  }

  const formatBlockquote = () => {
    execCommand('formatBlock', '<blockquote>')
  }

  const formatCode = () => {
    execCommand('formatBlock', '<pre>')
  }

  // Link handling
  const openLinkModal = () => {
    saveSelection()
    const selection = window.getSelection()
    if (selection.toString()) {
      setLinkText(selection.toString())
    } else {
      setLinkText('')
    }
    setLinkUrl('')
    setShowLinkModal(true)
  }

  const insertLink = () => {
    if (!linkUrl) return
    restoreSelection()
    
    if (linkText && !window.getSelection().toString()) {
      // Insert new link with text
      const link = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`
      document.execCommand('insertHTML', false, link)
    } else {
      // Wrap selected text with link
      document.execCommand('createLink', false, linkUrl)
      // Make it open in new tab
      if (editorRef.current) {
        const links = editorRef.current.querySelectorAll('a')
        links.forEach(link => {
          if (link.href === linkUrl || link.href.includes(linkUrl)) {
            link.target = '_blank'
            link.rel = 'noopener noreferrer'
          }
        })
      }
    }
    
    handleEditorInput()
    setShowLinkModal(false)
    setLinkUrl('')
    setLinkText('')
  }

  const removeLink = () => {
    execCommand('unlink')
    setShowLinkModal(false)
  }

  // Image handling - URL only (no file uploads to avoid huge base64)
  const openImageModal = () => {
    saveSelection()
    setImageUrl('')
    setShowImageModal(true)
  }

  const insertImageFromUrl = () => {
    if (!imageUrl) return
    restoreSelection()
    document.execCommand('insertHTML', false, `<img src="${imageUrl}" alt="Image" style="max-width: 100%;" />`)
    handleEditorInput()
    setShowImageModal(false)
    setImageUrl('')
  }

  // Video/Embed handling
  const openVideoModal = () => {
    saveSelection()
    setVideoUrl('')
    setShowVideoModal(true)
  }

  const parseYouTubeUrl = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const parseVimeoUrl = (url) => {
    const match = url.match(/vimeo\.com\/(\d+)/)
    return match ? match[1] : null
  }

  const insertVideo = () => {
    if (!videoUrl) return
    restoreSelection()

    let embedHtml = ''

    // Check for YouTube
    const youtubeId = parseYouTubeUrl(videoUrl)
    if (youtubeId) {
      embedHtml = `<div class="video-embed" contenteditable="false">
        <iframe width="560" height="315" src="https://www.youtube.com/embed/${youtubeId}" 
          frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen></iframe>
      </div>`
    }

    // Check for Vimeo
    const vimeoId = parseVimeoUrl(videoUrl)
    if (vimeoId) {
      embedHtml = `<div class="video-embed" contenteditable="false">
        <iframe src="https://player.vimeo.com/video/${vimeoId}" width="560" height="315" 
          frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
      </div>`
    }

    // If not a recognized video service, check if it's an iframe or embed code
    if (!embedHtml) {
      if (videoUrl.includes('<iframe') || videoUrl.includes('<embed')) {
        embedHtml = `<div class="video-embed" contenteditable="false">${videoUrl}</div>`
      } else {
        embedHtml = `<div class="video-embed" contenteditable="false">
          <video controls width="560" style="max-width: 100%;">
            <source src="${videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        </div>`
      }
    }

    document.execCommand('insertHTML', false, embedHtml + '<p><br></p>')
    handleEditorInput()
    setShowVideoModal(false)
    setVideoUrl('')
  }

  // Mode switching
  const switchToMode = (mode) => {
    // Sync content before switching
    if (viewMode === 'richtext' && editorRef.current) {
      setContent(editorRef.current.innerHTML)
    }
    // Reset initialization flag so content gets set when switching back to richtext
    if (mode === 'richtext') {
      isInitialized.current = false
    }
    setViewMode(mode)
  }

  // Text color and background color
  const setTextColor = (color) => {
    execCommand('foreColor', color)
  }

  const setBackgroundColor = (color) => {
    execCommand('hiliteColor', color)
  }

  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'
  ]

  return (
    <div className="lesson-editor-overlay" onClick={handleOverlayClick}>
      <div className="lesson-editor-modal rich-text-editor" onClick={(e) => e.stopPropagation()}>
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

        {/* Mode Toggle */}
        <div className="editor-mode-bar">
          <div className="mode-tabs">
            <button 
              className={`mode-tab ${viewMode === 'richtext' ? 'active' : ''}`}
              onClick={() => switchToMode('richtext')}
              type="button"
            >
              <span className="mode-icon">✏️</span>
              Rich Text
            </button>
            <button 
              className={`mode-tab ${viewMode === 'html' ? 'active' : ''}`}
              onClick={() => switchToMode('html')}
              type="button"
            >
              <span className="mode-icon">{'</>'}</span>
              HTML
            </button>
            <button 
              className={`mode-tab ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => switchToMode('preview')}
              type="button"
            >
              <span className="mode-icon">👁️</span>
              Preview
            </button>
          </div>
        </div>

        {/* Rich Text Toolbar */}
        {viewMode === 'richtext' && (
          <div className="rich-text-toolbar">
            {/* Row 1: Main formatting */}
            <div className="toolbar-row">
              <div className="toolbar-group">
                <select 
                  className="toolbar-select"
                  onChange={(e) => {
                    const val = e.target.value
                    if (val.startsWith('h')) formatHeading(val[1])
                    else if (val === 'p') formatParagraph()
                    else if (val === 'blockquote') formatBlockquote()
                    else if (val === 'pre') formatCode()
                    e.target.value = ''
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Format ▾</option>
                  <option value="p">Paragraph</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                  <option value="h4">Heading 4</option>
                  <option value="blockquote">Quote</option>
                  <option value="pre">Code Block</option>
                </select>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-group">
                <button className="toolbar-btn" onClick={formatBold} title="Bold (Ctrl+B)" type="button">
                  <strong>B</strong>
                </button>
                <button className="toolbar-btn" onClick={formatItalic} title="Italic (Ctrl+I)" type="button">
                  <em>I</em>
                </button>
                <button className="toolbar-btn" onClick={formatUnderline} title="Underline (Ctrl+U)" type="button">
                  <u>U</u>
                </button>
                <button className="toolbar-btn" onClick={formatStrikethrough} title="Strikethrough" type="button">
                  <s>S</s>
                </button>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-group">
                <button className="toolbar-btn" onClick={formatSubscript} title="Subscript" type="button">
                  X<sub>2</sub>
                </button>
                <button className="toolbar-btn" onClick={formatSuperscript} title="Superscript" type="button">
                  X<sup>2</sup>
                </button>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-group">
                <div className="color-picker-wrapper">
                  <button className="toolbar-btn color-btn" title="Text Color" type="button">
                    <span className="color-icon">A</span>
                    <span className="color-indicator" style={{ backgroundColor: '#000' }}></span>
                  </button>
                  <div className="color-dropdown">
                    <div className="color-grid">
                      {colors.map(color => (
                        <button 
                          key={color}
                          className="color-swatch"
                          style={{ backgroundColor: color }}
                          onClick={() => setTextColor(color)}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="color-picker-wrapper">
                  <button className="toolbar-btn color-btn" title="Highlight Color" type="button">
                    <span className="highlight-icon">🖍</span>
                  </button>
                  <div className="color-dropdown">
                    <div className="color-grid">
                      {colors.map(color => (
                        <button 
                          key={color}
                          className="color-swatch"
                          style={{ backgroundColor: color }}
                          onClick={() => setBackgroundColor(color)}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-group">
                <button className="toolbar-btn" onClick={formatRemoveFormat} title="Clear Formatting" type="button">
                  🚫
                </button>
              </div>
            </div>

            {/* Row 2: Lists, alignment, media */}
            <div className="toolbar-row">
              <div className="toolbar-group">
                <button className="toolbar-btn" onClick={formatUnorderedList} title="Bullet List" type="button">
                  •≡
                </button>
                <button className="toolbar-btn" onClick={formatOrderedList} title="Numbered List" type="button">
                  1.≡
                </button>
                <button className="toolbar-btn" onClick={formatOutdent} title="Decrease Indent" type="button">
                  ⇤
                </button>
                <button className="toolbar-btn" onClick={formatIndent} title="Increase Indent" type="button">
                  ⇥
                </button>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-group">
                <button className="toolbar-btn" onClick={formatAlignLeft} title="Align Left" type="button">
                  ≡◀
                </button>
                <button className="toolbar-btn" onClick={formatAlignCenter} title="Align Center" type="button">
                  ≡◆
                </button>
                <button className="toolbar-btn" onClick={formatAlignRight} title="Align Right" type="button">
                  ▶≡
                </button>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-group">
                <button className="toolbar-btn" onClick={openLinkModal} title="Insert Link" type="button">
                  🔗
                </button>
                <button className="toolbar-btn" onClick={openImageModal} title="Insert Image (URL only)" type="button">
                  🖼️
                </button>
                <button className="toolbar-btn" onClick={openVideoModal} title="Insert Video/Embed" type="button">
                  🎬
                </button>
                <button className="toolbar-btn" onClick={formatHorizontalRule} title="Horizontal Line" type="button">
                  ―
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Editor Content Area */}
        <div className="lesson-editor-content">
          {viewMode === 'richtext' && (
            <div
              ref={editorRef}
              className="rich-text-area"
              contentEditable
              onInput={handleEditorInput}
              data-placeholder="Start writing your lesson content here..."
            />
          )}

          {viewMode === 'html' && (
            <textarea
              ref={htmlTextareaRef}
              className="html-textarea"
              value={content}
              onChange={handleHtmlChange}
              placeholder="<h1>Your HTML here...</h1>&#10;&#10;You can paste embed codes, iframes, and any HTML content."
              spellCheck={false}
            />
          )}

          {viewMode === 'preview' && (
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

        {/* Link Modal */}
        {showLinkModal && (
          <div className="editor-modal-overlay" onClick={() => setShowLinkModal(false)}>
            <div className="editor-modal" onClick={e => e.stopPropagation()}>
              <h3>Insert Link</h3>
              <div className="modal-field">
                <label>URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  autoFocus
                />
              </div>
              <div className="modal-field">
                <label>Text (optional)</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text"
                />
              </div>
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={removeLink} type="button">
                  Remove Link
                </button>
                <button className="modal-btn secondary" onClick={() => setShowLinkModal(false)} type="button">
                  Cancel
                </button>
                <button className="modal-btn primary" onClick={insertLink} type="button">
                  Insert Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal - URL only */}
        {showImageModal && (
          <div className="editor-modal-overlay" onClick={() => setShowImageModal(false)}>
            <div className="editor-modal" onClick={e => e.stopPropagation()}>
              <h3>Insert Image</h3>
              
              <div className="modal-field">
                <label>Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  autoFocus
                />
                <p className="field-hint">
                  Tip: Upload your image to a service like Imgur, Google Drive (set to public), 
                  or your own hosting, then paste the URL here.
                </p>
              </div>

              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowImageModal(false)} type="button">
                  Cancel
                </button>
                <button 
                  className="modal-btn primary" 
                  onClick={insertImageFromUrl}
                  disabled={!imageUrl}
                  type="button"
                >
                  Insert Image
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Modal */}
        {showVideoModal && (
          <div className="editor-modal-overlay" onClick={() => setShowVideoModal(false)}>
            <div className="editor-modal wide" onClick={e => e.stopPropagation()}>
              <h3>Insert Video or Embed</h3>
              
              <div className="modal-field">
                <label>Video URL or Embed Code</label>
                <textarea
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Paste a YouTube/Vimeo URL or embed code...&#10;&#10;Examples:&#10;• https://www.youtube.com/watch?v=dQw4w9WgXcQ&#10;• https://vimeo.com/123456789&#10;• <iframe src=&quot;...&quot;></iframe>"
                  rows={5}
                  autoFocus
                />
              </div>

              <div className="embed-hints">
                <p>💡 <strong>Supported:</strong></p>
                <ul>
                  <li>YouTube URLs (regular, shorts, or embed links)</li>
                  <li>Vimeo URLs</li>
                  <li>Any iframe or embed code (copy from video site)</li>
                </ul>
              </div>

              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowVideoModal(false)} type="button">
                  Cancel
                </button>
                <button 
                  className="modal-btn primary" 
                  onClick={insertVideo}
                  disabled={!videoUrl}
                  type="button"
                >
                  Insert Video
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LessonEditor
