import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SessionRecorder } from '../components/session/SessionRecorder';
import { LaughStarterModal } from '../components/onboarding/LaughStarterModal';
import { ShareLaughDialog } from '../components/session/ShareLaughDialog';

export function SessionPage() {
    const { user } = useAuth();

    // Laugh Starter Modal (for first-time users)
    const [showLaughStarter, setShowLaughStarter] = useState(false);

    // Share Dialog (post-session)
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareDialogData, setShareDialogData] = useState<{
        sessionBlob: Blob | null;
        laughTimestamps: Array<{ time: number; duration: number }>;
        sessionId: string;
        laughCount: number;
        yamnetScore?: number;
    } | null>(null);

    // Check if user has seen Laugh Starter before
    useEffect(() => {
        const hasSeenStarter = localStorage.getItem('hasSeenLaughStarter');
        if (!hasSeenStarter) {
            setShowLaughStarter(true);
        }
    }, []);

    const handleCloseLaughStarter = () => {
        localStorage.setItem('hasSeenLaughStarter', 'true');
        setShowLaughStarter(false);
    };

    const handleStartRecording = () => {
        handleCloseLaughStarter();
        // SessionRecorder will handle the actual recording start
    };

    // Callback from SessionRecorder when session ends
    const handleSessionComplete = (data: {
        sessionBlob: Blob | null;
        laughTimestamps: Array<{ time: number; duration: number }>;
        sessionId: string;
        laughCount: number;
        yamnetScore?: number;
    }) => {
        // Only show share dialog if user laughed 3+ times
        if (data.laughCount >= 3) {
            setShareDialogData(data);
            setShowShareDialog(true);
        }
    };

    if (!user) return <Navigate to="/login" />;

    return (
        <div className="py-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold text-white">Laughter Gym</h2>
                <p className="mt-2 text-stitch-muted">Focus on your breathing and let it flow.</p>
            </div>

            <SessionRecorder
                userId={user.id}
                onSessionComplete={handleSessionComplete}
            />

            {/* First-Time User: Laugh Starter Modal */}
            <LaughStarterModal
                isOpen={showLaughStarter}
                onClose={handleCloseLaughStarter}
                onStart={handleStartRecording}
            />

            {/* Post-Session: Share Laugh Dialog */}
            {shareDialogData && (
                <ShareLaughDialog
                    isOpen={showShareDialog}
                    onClose={() => setShowShareDialog(false)}
                    sessionBlob={shareDialogData.sessionBlob}
                    laughTimestamps={shareDialogData.laughTimestamps}
                    sessionId={shareDialogData.sessionId}
                    userId={user.id}
                    laughCount={shareDialogData.laughCount}
                    yamnetScore={shareDialogData.yamnetScore}
                />
            )}
        </div>
    );
}
