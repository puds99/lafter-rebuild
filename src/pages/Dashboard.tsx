import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
    const { user } = useAuth();
    const { sessions, loading, streak } = useAnalytics(user?.id);

    // Format data for chart
    const chartData = sessions.map(session => ({
        date: new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        duration: Math.round(session.duration / 60), // in minutes
    }));

    // Calculate Metrics
    const totalLaughs = sessions.reduce((acc, session) => acc + (session.laugh_count || 0), 0);
    const totalDurationMins = sessions.reduce((acc, session) => acc + session.duration, 0) / 60;
    const averageLPM = totalDurationMins > 0 ? Math.round((totalLaughs / totalDurationMins) * 10) / 10 : 0;

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-white shadow rounded-lg p-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {user?.email?.split('@')[0]}!
                </h1>
                <p className="mt-2 text-gray-600">
                    Ready to train your laughter muscles today?
                </p>
                <div className="mt-6">
                    <Link
                        to="/session"
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Start New Session
                    </Link>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Sessions</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">{sessions.length}</dd>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Laughs</dt>
                        <dd className="mt-1 text-3xl font-semibold text-indigo-600">{totalLaughs}</dd>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Avg. Laughs / Min</dt>
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Your Progress
                        </h3>

                        {loading ? (
                            <div className="h-64 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : sessions.length > 0 ? (
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip />
                                        <Bar dataKey="duration" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <p>No sessions recorded yet. Start your first one to see your stats!</p>
                            </div>
                        )}
                    </div>
                </div>
                );
}
