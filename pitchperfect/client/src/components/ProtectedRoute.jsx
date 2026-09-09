import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Authenticating...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
}

const styles = {
    loadingContainer: {
        minHeight: '100vh',
        background: '#0f0f11',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyInContent: 'center',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid rgba(124, 110, 224, 0.2)',
        borderTop: '3px solid #7c6fe0',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '1rem',
    },
    loadingText: {
        fontSize: '14px',
        color: '#888',
    },
};
