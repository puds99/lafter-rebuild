import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Leaderboard } from '../components/social/Leaderboard';

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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                        <dd className="mt-1 text-3xl font-semibold text-green-600">{averageLPM}</dd>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Current Streak</dt>
                        <dd className="mt-1 flex items-center justify-between">
                            <div className="flex items-center text-3xl font-semibold text-orange-500">
                                {streak} {streak >= 3 && <span className="ml-2 text-2xl animate-pulse">🔥</span>}
                                <span className="ml-1 text-sm text-gray-400 font-normal self-end mb-1">days</span>
                            </div>
                            <a
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm on a ${streak} day laugh streak on Lafter.org! 😂🔥\n\nTrain your laughter muscles today! 💪\n\n#Lafter #MentalHealth`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-[#1DA1F2] hover:bg-[#1a91da] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1DA1F2]"
                                title="Share on Twitter"
                            >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                </svg>
                            </a>
                        </dd>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Analytics Chart */}
                <div className="lg:col-span-2 bg-white shadow rounded-lg overflow-hidden p-6">
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

                {/* Leaderboard */}
                <div className="lg:col-span-1">
                    <Leaderboard />
                </div>
            </div>
        </div>
    );
}
