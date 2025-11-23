import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Header() {
    const { user, signOut } = useAuth();

    return (
        <header className="fixed w-full top-0 z-50 glass-panel border-b-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stitch-primary to-stitch-secondary flex items-center justify-center">
                                <span className="text-xl">😂</span>
                            </div>
                            <span className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-stitch-accent">
                                Lafter.org
                            </span>
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <Link to="/dashboard" className="text-stitch-muted hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Dashboard
                                </Link>
                                <Link to="/settings" className="text-stitch-muted hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Settings
                                </Link>
                                <button
                                    onClick={signOut}
                                    className="text-stitch-muted hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="btn-primary"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
