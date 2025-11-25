'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        Something went wrong!
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          borderRadius: '8px',
          fontWeight: '500',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}







