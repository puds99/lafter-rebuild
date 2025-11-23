import * as tf from '@tensorflow/tfjs';

// "Laughter" is index 16 in the official AudioSet ontology used by YAMNet.
const LAUGHTER_INDEX = 16;
const BABY_LAUGHTER_INDEX = 17;
const GIGGLE_INDEX = 18;
const SNICKER_INDEX = 19;
const BELLY_LAUGH_INDEX = 20;
const CHUCKLE_INDEX = 21;

export class YamnetService {
    private static instance: YamnetService;
    private model: tf.GraphModel | null = null;
    private isLoading: boolean = false;

    private constructor() { }

    static getInstance(): YamnetService {
        if (!YamnetService.instance) {
            YamnetService.instance = new YamnetService();
        }
        return YamnetService.instance;
    }

    async loadModel(): Promise<void> {
        if (this.model || this.isLoading) return;

        try {
            this.isLoading = true;
            console.log('🧠 Loading YAMNet model...');

            this.model = await tf.loadGraphModel('https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1', { fromTFHub: true });
            console.log('✅ YAMNet model loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load YAMNet model:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    async predict(audioData: Float32Array): Promise<number> {
        if (!this.model) {
            return 0;
        }

        try {
            return tf.tidy(() => {
                const waveform = tf.tensor1d(audioData);

                const [scores] = this.model!.predict(waveform) as tf.Tensor[];
                const meanScores = scores.mean(0);
                const scoreValues = meanScores.dataSync();

                const laughterScore =
                    scoreValues[LAUGHTER_INDEX] +
                    scoreValues[BABY_LAUGHTER_INDEX] +
                    scoreValues[GIGGLE_INDEX] +
                    scoreValues[SNICKER_INDEX] +
                    scoreValues[BELLY_LAUGH_INDEX] +
                    scoreValues[CHUCKLE_INDEX];

                return laughterScore;
            });
        } catch (error) {
            console.error('❌ Prediction failed:', error);
            return 0;
        }
    }
}
