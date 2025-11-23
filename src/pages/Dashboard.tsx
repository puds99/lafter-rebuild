import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Leaderboard } from '../components/social/Leaderboard';

export function Dashboard() {
    const { user } = useAuth();
    const { sessions, loading, streak } = useAnalytics(user?.id);

    // Format data for chart
    const chartData = sessions.map(session => ({
        date: new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        laughs: session.laugh_count || 0,
    })).reverse(); // Show oldest to newest

    // Calculate Metrics
    const totalLaughs = sessions.reduce((acc, session) => acc + (session.laugh_count || 0), 0);
    const totalDurationMins = sessions.reduce((acc, session) => acc + session.duration, 0) / 60;
    const laughsPerMinute = totalDurationMins > 0 ? Math.round((totalLaughs / totalDurationMins) * 10) / 10 : 0;
    const sessionCount = sessions.length;

    return (
        <div className="space-y-8 pt-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-display font-bold text-white">
                    Dashboard
                </h1>
                <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="text-stitch-muted text-sm">Current Streak:</span>
                    <span className="text-stitch-accent font-bold">{streak} Days 🔥</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-stitch-muted text-sm font-medium uppercase tracking-wider mb-2">Total Laughs</h3>
                    <p className="text-4xl font-display font-bold text-white">{totalLaughs}</p>
                </div>
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-stitch-muted text-sm font-medium uppercase tracking-wider mb-2">Laughs / Min</h3>
                    <p className="text-4xl font-display font-bold text-stitch-primary">{laughsPerMinute}</p>
                </div>
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-stitch-muted text-sm font-medium uppercase tracking-wider mb-2">Session Count</h3>
                    <p className="text-4xl font-display font-bold text-stitch-secondary">{sessionCount}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-panel p-6 rounded-xl">
                    <h2 className="text-xl font-display font-bold text-white mb-6">Activity History</h2>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center text-stitch-muted">Loading...</div>
                    ) : (
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#94A3B8"
                                        tick={{ fill: '#94A3B8', fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#94A3B8"
                                        tick={{ fill: '#94A3B8', fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1E293B',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            color: '#F8FAFC'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="laughs"
                                        stroke="#6366F1"
                                        strokeWidth={3}
                                        dot={{ fill: '#6366F1', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#8B5CF6' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="glass-panel p-6 rounded-xl">
                    <Leaderboard />
                </div>
            </div>

            <div className="flex justify-center pt-4">
                <Link
                    to="/session"
                    className="btn-primary text-lg px-8 py-4 shadow-xl shadow-stitch-primary/30 hover:shadow-stitch-primary/50 transform hover:-translate-y-1 transition-all duration-200"
                >
                    Start New Session
                </Link>
            </div>
        </div>
    );
}
