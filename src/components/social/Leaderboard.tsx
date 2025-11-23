import { useAuth } from '../../context/AuthContext';
import { useLeaderboard } from '../../hooks/useLeaderboard';

export function Leaderboard() {
    const { user } = useAuth();
    const { leaderboard, loading, error } = useLeaderboard();

    if (loading) {
        return (
            <div className="bg-white shadow rounded-lg p-6 h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Streaks</h3>
                <p className="text-red-500 text-sm">Failed to load leaderboard.</p>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                    <span className="mr-2">🏆</span> Top Laughers
                </h3>
            </div>
            <ul className="divide-y divide-gray-200">
                {leaderboard.length === 0 ? (
                    <li className="px-4 py-4 text-center text-gray-500 text-sm">
                        No streaks yet. Be the first!
                    </li>
                ) : (
                    leaderboard.map((entry, index) => {
                        const isCurrentUser = user?.id === entry.user_id;
                        const rank = index + 1;
                        let rankIcon = <span className="text-gray-500 font-mono w-6 text-center">{rank}</span>;

                        if (rank === 1) rankIcon = <span className="text-2xl w-6 text-center">🥇</span>;
                        if (rank === 2) rankIcon = <span className="text-2xl w-6 text-center">🥈</span>;
                        if (rank === 3) rankIcon = <span className="text-2xl w-6 text-center">🥉</span>;

                        return (
                            <li
                                key={entry.user_id}
                                className={`px-4 py-4 flex items-center justify-between ${isCurrentUser ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                        {rankIcon}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${isCurrentUser ? 'text-indigo-700' : 'text-gray-900'}`}>
                                            {entry.display_name}
                                            {isCurrentUser && <span className="ml-2 text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">You</span>}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {entry.total_laughs} total laughs
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-lg font-bold text-orange-500 mr-1">{entry.current_streak}</span>
                                    <span className="text-xl">🔥</span>
                                </div>
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );
}
