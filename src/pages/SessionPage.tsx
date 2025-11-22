import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SessionRecorder } from '../components/session/SessionRecorder';

export function SessionPage() {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" />;

    return (
        <div className="py-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900">Laughter Gym</h2>
                <p className="mt-2 text-gray-600">Focus on your breathing and let it flow.</p>
            </div>
            <SessionRecorder userId={user.id} />
        </div>
    );
}
