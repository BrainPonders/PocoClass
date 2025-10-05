import React from 'react'

function App() {
  return (
    <div style={{ padding: '50px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'red', fontSize: '48px' }}>SIMPLE TEST - IF YOU SEE THIS, REACT IS WORKING</h1>
      <p style={{ fontSize: '24px' }}>This is a minimal React component to test if the basic setup works.</p>
      <div style={{ 
        background: 'blue', 
        color: 'white', 
        padding: '20px', 
        marginTop: '20px',
        fontSize: '20px'
      }}>
        React App Status: WORKING ✅
      </div>
    </div>
  )
}

export default App