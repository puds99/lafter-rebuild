import { useLottie } from 'lottie-react';
import { useEffect } from 'react';

// Placeholder animation (simple circle pulse) to prevent crash if JSON missing
const placeholderAnimation = {
    v: "5.5.7",
    fr: 60,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: "Placeholder",
    ddd: 0,
    assets: [],
    layers: [{
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Circle",
        sr: 1,
        ks: {
            o: { a: 0, k: 100, ix: 11 },
            r: { a: 0, k: 0, ix: 10 },
            p: { a: 0, k: [50, 50, 0], ix: 2 },
            a: { a: 0, k: [0, 0, 0], ix: 1 },
            s: { a: 1, k: [{ i: { x: [0.667, 0.667, 0.667], y: [1, 1, 1] }, o: { x: [0.333, 0.333, 0.333], y: [0, 0, 0] }, t: 0, s: [50, 50, 100] }, { t: 30, s: [80, 80, 100] }, { t: 60, s: [50, 50, 100] }], ix: 6 }
        },
        ao: 0,
        shapes: [{
            ty: "gr",
            it: [{
                ty: "el",
                p: { a: 0, k: [0, 0], ix: 2 },
                s: { a: 0, k: [100, 100], ix: 3 }
            }, {
                ty: "fl",
                c: { a: 0, k: [0.2, 0.6, 1, 1], ix: 4 },
                o: { a: 0, k: 100, ix: 5 },
                r: 1,
                bm: 0
            }, {
                ty: "tr",
                p: { a: 0, k: [0, 0], ix: 2 },
                a: { a: 0, k: [0, 0], ix: 1 },
                s: { a: 0, k: [100, 100], ix: 3 },
                r: { a: 0, k: 0, ix: 6 },
                o: { a: 0, k: 100, ix: 7 },
                sk: { a: 0, k: 0, ix: 4 },
                sa: { a: 0, k: 0, ix: 5 }
            }]
        }]
    }]
};

interface LottieAvatarProps {
    speed?: number;
    animationData?: any; // Allow passing custom JSON later
}

export function LottieAvatar({ speed = 1, animationData = placeholderAnimation }: LottieAvatarProps) {
    const options = {
        animationData: animationData,
        loop: true,
        autoplay: true,
    };

    const { View, setSpeed } = useLottie(options);

    useEffect(() => {
        setSpeed(speed);
    }, [speed, setSpeed]);

    return <div className="w-64 h-64">{View}</div>;
}
