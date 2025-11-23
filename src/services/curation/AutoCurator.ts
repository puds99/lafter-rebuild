import { getLaughClips, saveLaughClip } from '../../lib/db';

/**
 * AutoCurator Service
 * 
 * Responsible for automatically approving high-quality laugh clips
 * so they appear in the public feed without manual intervention.
 * 
 * Criteria for Auto-Approval:
 * - YAMNet Score > 0.75 (High confidence it's a laugh)
 * - Duration > 1500ms (Not too short/accidental)
 * - Status is currently 'pending'
 */
export class AutoCurator {
    private static instance: AutoCurator;

    private constructor() { }

    public static getInstance(): AutoCurator {
        if (!AutoCurator.instance) {
            AutoCurator.instance = new AutoCurator();
        }
        return AutoCurator.instance;
    }

    /**
     * Run the curation process
     * Should be called on app startup
     */
    public async runAutoCuration(): Promise<number> {
        console.log('🤖 AutoCurator: Starting analysis...');

        try {
            const allClips = await getLaughClips();

            // Filter for pending clips that meet criteria
            const eligibleClips = allClips.filter(clip =>
                (clip.approval_status === 'pending' || !clip.approval_status) &&
                clip.yamnet_score > 0.75 &&
                clip.duration > 1500
            );

            if (eligibleClips.length === 0) {
                console.log('🤖 AutoCurator: No new clips eligible for approval.');
                return 0;
            }

            console.log(`🤖 AutoCurator: Found ${eligibleClips.length} eligible clips. Approving...`);

            // Approve them
            let approvedCount = 0;
            for (const clip of eligibleClips) {
                await saveLaughClip({
                    ...clip,
                    approval_status: 'approved'
                });
                approvedCount++;
            }

            console.log(`✅ AutoCurator: Successfully approved ${approvedCount} clips.`);
            return approvedCount;

        } catch (error) {
            console.error('❌ AutoCurator: Failed to run curation process', error);
            return 0;
        }
    }
}
