import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup as signupAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function SignUp() {
    const navigate = useNavigate();
    const { signup } = useAuth();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const data = await signupAPI(form);
            signup(data.user, data.token);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <div style={s.card}>
                <div style={s.header}>
                    <div style={s.logo}>🎤</div>
                    <h1 style={s.title}>Create Account</h1>
                    <p style={s.sub}>Join PitchPerfect to practice your presentation</p>
                </div>

                <form onSubmit={handleSubmit} style={s.form}>
                    <div style={s.field}>
                        <label style={s.label}>Full Name</label>
                        <input
                            name="name"
                            type="text"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            style={s.input}
                            required
                        />
                    </div>

                    <div style={s.field}>
                        <label style={s.label}>Email</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            style={s.input}
                            required
                        />
                    </div>

                    <div style={s.field}>
                        <label style={s.label}>Password</label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="At least 6 characters"
                            style={s.input}
                            required
                        />
                    </div>

                    {error && <div style={s.error}>{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}
                    >
                        {loading ? 'Creating Account...' : 'Sign up →'}
                    </button>
                </form>

                <p style={s.switch}>
                    Already have an account?{' '}
                    <Link to="/login" style={s.link}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}

const s = {
    page: { minHeight: '100vh', background: '#0f0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    card: { background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' },
    header: { textAlign: 'center', marginBottom: '2rem' },
    logo: { fontSize: '2.5rem', marginBottom: '8px' },
    title: { fontSize: '1.5rem', fontWeight: '600', color: '#fff', margin: '0 0 6px' },
    sub: { fontSize: '13px', color: '#888', margin: 0 },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '500', color: '#aaa' },
    input: { padding: '10px 14px', background: '#111115', border: '1px solid #2a2a30', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' },
    error: { padding: '10px 14px', background: '#2a1515', border: '1px solid #5a2020', borderRadius: '8px', color: '#f87171', fontSize: '13px' },
    btn: { padding: '12px', background: '#7c6fe0', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s' },
    switch: { textAlign: 'center', marginTop: '1.25rem', fontSize: '13px', color: '#888' },
    link: { color: '#7c6fe0', textDecoration: 'none', fontWeight: '500' },
};
