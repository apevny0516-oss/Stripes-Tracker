import { useState } from 'react'

function ChecklistManager({
  checklists,
  activeStripe,
  onAddItem,
  onAddSubItem,
  onDeleteItem,
  onDeleteSubItem,
  onReorderItems,
  onReorderSubItems,
  stripeColors
}) {
  const [newItemText, setNewItemText] = useState('')
  const [addingSubItemTo, setAddingSubItemTo] = useState(null)
  const [newSubItemText, setNewSubItemText] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)
  const [draggedSubItem, setDraggedSubItem] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [dragOverSubIndex, setDragOverSubIndex] = useState(null)

  const items = checklists[activeStripe] || []

  const handleAddItem = (e) => {
    e.preventDefault()
    if (newItemText.trim()) {
      onAddItem(activeStripe, newItemText.trim())
      setNewItemText('')
    }
  }

  const handleAddSubItem = (itemId) => {
    if (newSubItemText.trim()) {
      onAddSubItem(activeStripe, itemId, newSubItemText.trim())
      setNewSubItemText('')
      setAddingSubItemTo(null)
    }
  }

  // Drag handlers for main items
  const handleDragStart = (e, index) => {
    setDraggedItem(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index)
    e.target.classList.add('dragging')
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging')
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedItem === null || draggedSubItem !== null) return
    setDragOverIndex(index)
  }

  const handleDrop = (e, toIndex) => {
    e.preventDefault()
    if (draggedItem === null || draggedSubItem !== null) return
    
    if (draggedItem !== toIndex) {
      onReorderItems(activeStripe, draggedItem, toIndex)
    }
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  // Drag handlers for sub-items
  const handleSubDragStart = (e, itemId, subIndex) => {
    e.stopPropagation()
    setDraggedSubItem({ itemId, subIndex })
    e.dataTransfer.effectAllowed = 'move'
    e.target.classList.add('dragging')
  }

  const handleSubDragEnd = (e) => {
    e.target.classList.remove('dragging')
    setDraggedSubItem(null)
    setDragOverSubIndex(null)
  }

  const handleSubDragOver = (e, itemId, subIndex) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedSubItem || draggedSubItem.itemId !== itemId) return
    setDragOverSubIndex(subIndex)
  }

  const handleSubDrop = (e, itemId, toIndex) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedSubItem || draggedSubItem.itemId !== itemId) return
    
    if (draggedSubItem.subIndex !== toIndex) {
      onReorderSubItems(activeStripe, itemId, draggedSubItem.subIndex, toIndex)
    }
    setDraggedSubItem(null)
    setDragOverSubIndex(null)
  }

  return (
    <div className="checklist-manager">
      <div className="manager-header">
        <h2>
          Manage <span style={{ color: stripeColors[activeStripe] }}>
            {activeStripe.charAt(0).toUpperCase() + activeStripe.slice(1)}
          </span> Stripe Checklist
        </h2>
        <p className="manager-hint">
          Items added here will appear in all students' checklists • Drag items to reorder
        </p>
      </div>

      <form onSubmit={handleAddItem} className="add-item-form">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Add a new checklist item..."
          className="item-input"
        />
        <button 
          type="submit" 
          className="add-btn"
          style={{ backgroundColor: stripeColors[activeStripe] }}
        >
          <span>+</span> Add Item
        </button>
      </form>

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <p>No items in this checklist yet.</p>
          <p className="hint">Add items above to create requirements for this stripe level.</p>
        </div>
      ) : (
        <div className="items-list">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className={`manager-item ${dragOverIndex === index ? 'drag-over' : ''} ${draggedItem === index ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="item-header">
                <div className="drag-handle" title="Drag to reorder">
                  <span>⋮⋮</span>
                </div>
                <span className="item-number">{index + 1}</span>
                <span className="item-text">{item.text}</span>
                <div className="item-actions">
                  <button
                    className="action-btn add-sub"
                    onClick={() => {
                      setAddingSubItemTo(addingSubItemTo === item.id ? null : item.id)
                      setNewSubItemText('')
                    }}
                    title="Add sub-item"
                  >
                    + Sub
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => {
                      if (confirm('Delete this item and all its sub-items?')) {
                        onDeleteItem(activeStripe, item.id)
                      }
                    }}
                    title="Delete item"
                  >
                    ×
                  </button>
                </div>
              </div>

              {item.subItems && item.subItems.length > 0 && (
                <div className="sub-items-list">
                  {item.subItems.map((subItem, subIndex) => (
                    <div 
                      key={subItem.id} 
                      className={`sub-item ${dragOverSubIndex === subIndex && draggedSubItem?.itemId === item.id ? 'drag-over' : ''}`}
                      draggable
                      onDragStart={(e) => handleSubDragStart(e, item.id, subIndex)}
                      onDragEnd={handleSubDragEnd}
                      onDragOver={(e) => handleSubDragOver(e, item.id, subIndex)}
                      onDrop={(e) => handleSubDrop(e, item.id, subIndex)}
                    >
                      <div className="sub-drag-handle" title="Drag to reorder">⋮</div>
                      <span className="sub-bullet">•</span>
                      <span className="sub-text">{subItem.text}</span>
                      <button
                        className="action-btn delete small"
                        onClick={() => {
                          if (confirm('Delete this sub-item?')) {
                            onDeleteSubItem(activeStripe, item.id, subItem.id)
                          }
                        }}
                        title="Delete sub-item"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {addingSubItemTo === item.id && (
                <div className="add-sub-item-form">
                  <input
                    type="text"
                    value={newSubItemText}
                    onChange={(e) => setNewSubItemText(e.target.value)}
                    placeholder="Enter sub-item..."
                    className="sub-item-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSubItem(item.id)
                      }
                      if (e.key === 'Escape') {
                        setAddingSubItemTo(null)
                        setNewSubItemText('')
                      }
                    }}
                  />
                  <button
                    className="add-sub-btn"
                    onClick={() => handleAddSubItem(item.id)}
                    style={{ backgroundColor: stripeColors[activeStripe] }}
                  >
                    Add
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setAddingSubItemTo(null)
                      setNewSubItemText('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChecklistManager
