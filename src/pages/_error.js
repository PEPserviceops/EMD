function Error({ statusCode }) {
  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '40px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '500px'
      }}>
        <h1 style={{
          color: '#dc3545',
          fontSize: '72px',
          margin: '0 0 20px 0',
          fontWeight: 'bold'
        }}>
          {statusCode || 'Error'}
        </h1>
        <h2 style={{
          color: '#6c757d',
          fontSize: '24px',
          margin: '0 0 20px 0',
          fontWeight: 'normal'
        }}>
          Something went wrong
        </h2>
        <p style={{
          color: '#6c757d',
          fontSize: '16px',
          margin: '0 0 30px 0',
          lineHeight: '1.5'
        }}>
          We apologize for the inconvenience. Please try refreshing the page or contact support if the problem persists.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
