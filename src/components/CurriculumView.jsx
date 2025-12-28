import { useState } from 'react'
import LessonViewer from './LessonViewer'

function CurriculumView({ 
  checklists, 
  levelColors, 
  levelNames, 
  levelOrder,
  levelTextColors 
}) {
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [expandedLevels, setExpandedLevels] = useState(
    // Start with first level expanded
    levelOrder.reduce((acc, level, index) => ({ ...acc, [level]: index === 0 }), {})
  )

  const toggleLevel = (level) => {
    setExpandedLevels(prev => ({
      ...prev,
      [level]: !prev[level]
    }))
  }

  const openLesson = (level, item, subItem = null) => {
    setSelectedLesson({
      level,
      item,
      subItem,
      levelName: levelNames[level],
      levelColor: levelColors[level]
    })
  }

  const closeLesson = () => {
    setSelectedLesson(null)
  }

  // Count total items across all levels
  const totalItems = levelOrder.reduce((count, level) => {
    const items = checklists[level] || []
    return count + items.length + items.reduce((subCount, item) => 
      subCount + (item.subItems?.length || 0), 0
    )
  }, 0)

  // Count items with lessons
  const itemsWithLessons = levelOrder.reduce((count, level) => {
    const items = checklists[level] || []
    return count + items.filter(item => item.lessonContent).length + 
      items.reduce((subCount, item) => 
        subCount + (item.subItems?.filter(sub => sub.lessonContent).length || 0), 0
      )
  }, 0)

  return (
    <div className="curriculum-view">
      <div className="curriculum-header">
        <div className="curriculum-title-section">
          <span className="curriculum-icon">📖</span>
          <div>
            <h2>Curriculum</h2>
            <p className="curriculum-subtitle">
              Browse lessons and learning materials
            </p>
          </div>
        </div>
        <div className="curriculum-stats">
          <div className="stat-item">
            <span className="stat-number">{totalItems}</span>
            <span className="stat-label">Topics</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{itemsWithLessons}</span>
            <span className="stat-label">Lessons</span>
          </div>
        </div>
      </div>

      <div className="curriculum-levels">
        {levelOrder.map((level, levelIndex) => {
          const items = checklists[level] || []
          const isExpanded = expandedLevels[level]
          const levelLessonCount = items.filter(item => item.lessonContent).length +
            items.reduce((count, item) => 
              count + (item.subItems?.filter(sub => sub.lessonContent).length || 0), 0
            )

          return (
            <div 
              key={level} 
              className={`curriculum-level ${isExpanded ? 'expanded' : ''}`}
              style={{ '--level-color': levelColors[level] }}
            >
              <button 
                className="curriculum-level-header"
                onClick={() => toggleLevel(level)}
                style={{ backgroundColor: levelColors[level] }}
              >
                <div className="level-header-content">
                  <span className="level-number">{levelIndex + 1}</span>
                  <h3>{levelNames[level]}</h3>
                </div>
                <div className="level-header-meta">
                  <span className="level-topic-count">
                    {items.length} topics
                    {levelLessonCount > 0 && ` • ${levelLessonCount} lessons`}
                  </span>
                  <span className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>
                    ▶
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="curriculum-level-content">
                  {items.length === 0 ? (
                    <div className="curriculum-empty">
                      <span className="empty-icon">📋</span>
                      <p>No topics added yet</p>
                    </div>
                  ) : (
                    <ul className="curriculum-items">
                      {items.map((item, itemIndex) => (
                        <li key={item.id} className="curriculum-item-group">
                          <button
                            className={`curriculum-item ${item.lessonContent ? 'has-lesson' : ''}`}
                            onClick={() => item.lessonContent && openLesson(level, item)}
                            disabled={!item.lessonContent}
                          >
                            <span className="item-index">{itemIndex + 1}</span>
                            <span className="item-name">{item.text}</span>
                            {item.lessonContent && (
                              <span className="lesson-indicator" title="View Lesson">
                                📄
                              </span>
                            )}
                          </button>

                          {item.subItems && item.subItems.length > 0 && (
                            <ul className="curriculum-sub-items">
                              {item.subItems.map((subItem, subIndex) => (
                                <li key={subItem.id}>
                                  <button
                                    className={`curriculum-sub-item ${subItem.lessonContent ? 'has-lesson' : ''}`}
                                    onClick={() => subItem.lessonContent && openLesson(level, item, subItem)}
                                    disabled={!subItem.lessonContent}
                                  >
                                    <span className="sub-item-index">
                                      {itemIndex + 1}.{subIndex + 1}
                                    </span>
                                    <span className="sub-item-name">{subItem.text}</span>
                                    {subItem.lessonContent && (
                                      <span className="lesson-indicator" title="View Lesson">
                                        📄
                                      </span>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedLesson && (
        <LessonViewer
          item={selectedLesson.item}
          subItem={selectedLesson.subItem}
          levelName={selectedLesson.levelName}
          levelColor={selectedLesson.levelColor}
          onClose={closeLesson}
        />
      )}
    </div>
  )
}

export default CurriculumView


