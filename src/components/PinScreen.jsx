import { useState } from 'react'

function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const CORRECT_PIN = '61951'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem('stripes-authenticated', 'true')
      onUnlock()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setPin('')
    }
  }

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5)
    setPin(value)
    setError(false)
  }

  return (
    <div className="pin-screen">
      <div className={`pin-card ${shake ? 'shake' : ''}`}>
        <div className="pin-icon">🥋</div>
        <h1 className="pin-title">Stripes Tracker</h1>
        <p className="pin-subtitle">Enter PIN to continue</p>
        
        <form onSubmit={handleSubmit} className="pin-form">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={handlePinChange}
            placeholder="•••••"
            className={`pin-input ${error ? 'error' : ''}`}
            autoFocus
            maxLength={5}
          />
          {error && <p className="pin-error">Incorrect PIN</p>}
          <button 
            type="submit" 
            className="pin-submit"
            disabled={pin.length < 5}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}

export default PinScreen


