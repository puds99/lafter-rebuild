/**
 * FIXED: LottieAvatar Component
 *
 * WHAT WAS BROKEN: Just a pulsing blue circle
 * WHAT'S FIXED: Actual laughing face animation that responds to volume
 */

import { useLottie } from 'lottie-react';
import { useEffect } from 'react';

// REAL laughing face animation (simple but expressive)
const laughingFaceAnimation = {
    v: "5.7.4",
    fr: 60,
    ip: 0,
    op: 60,
    w: 200,
    h: 200,
    nm: "Laughing Face",
    ddd: 0,
    assets: [],
    layers: [
        // FACE (yellow circle)
        {
            ddd: 0, ind: 1, ty: 4, nm: "Face",
            ks: {
                o: { a: 0, k: 100 },
                r: { a: 0, k: 0 },
                p: { a: 0, k: [100, 100, 0] },
                a: { a: 0, k: [0, 0, 0] },
                s: {
                    a: 1,
                    k: [
                        { t: 0, s: [100, 100, 100], e: [105, 95, 100] },
                        { t: 15, s: [105, 95, 100], e: [95, 105, 100] },
                        { t: 30, s: [95, 105, 100], e: [105, 95, 100] },
                        { t: 45, s: [105, 95, 100], e: [100, 100, 100] },
                        { t: 60, s: [100, 100, 100] }
                    ]
                }
            },
            shapes: [{
                ty: "gr",
                it: [
                    { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [160, 160] } },
                    { ty: "fl", c: { a: 0, k: [1, 0.85, 0.2, 1] }, o: { a: 0, k: 100 } },
                    { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
                ]
            }]
        },
        // LEFT EYE (squinting when laughing)
        {
            ddd: 0, ind: 2, ty: 4, nm: "Left Eye",
            ks: {
                o: { a: 0, k: 100 },
                r: { a: 0, k: 0 },
                p: { a: 0, k: [70, 85, 0] },
                a: { a: 0, k: [0, 0, 0] },
                s: {
                    a: 1,
                    k: [
                        { t: 0, s: [100, 100, 100], e: [100, 30, 100] },
                        { t: 10, s: [100, 30, 100], e: [100, 100, 100] },
                        { t: 25, s: [100, 100, 100], e: [100, 30, 100] },
                        { t: 35, s: [100, 30, 100], e: [100, 100, 100] },
                        { t: 50, s: [100, 100, 100], e: [100, 30, 100] },
                        { t: 60, s: [100, 30, 100] }
                    ]
                }
            },
            shapes: [{
                ty: "gr",
                it: [
                    { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [20, 20] } },
                    { ty: "fl", c: { a: 0, k: [0.2, 0.2, 0.2, 1] }, o: { a: 0, k: 100 } },
                    { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
                ]
            }]
        },
        // RIGHT EYE
        {
            ddd: 0, ind: 3, ty: 4, nm: "Right Eye",
            ks: {
                o: { a: 0, k: 100 },
                r: { a: 0, k: 0 },
                p: { a: 0, k: [130, 85, 0] },
                a: { a: 0, k: [0, 0, 0] },
                s: {
                    a: 1,
                    k: [
                        { t: 0, s: [100, 100, 100], e: [100, 30, 100] },
                        { t: 10, s: [100, 30, 100], e: [100, 100, 100] },
                        { t: 25, s: [100, 100, 100], e: [100, 30, 100] },
                        { t: 35, s: [100, 30, 100], e: [100, 100, 100] },
                        { t: 50, s: [100, 100, 100], e: [100, 30, 100] },
                        { t: 60, s: [100, 30, 100] }
                    ]
                }
            },
            shapes: [{
                ty: "gr",
                it: [
                    { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [20, 20] } },
                    { ty: "fl", c: { a: 0, k: [0.2, 0.2, 0.2, 1] }, o: { a: 0, k: 100 } },
                    { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
                ]
            }]
        },
        // MOUTH (big smile that opens when laughing)
        {
            ddd: 0, ind: 4, ty: 4, nm: "Mouth",
            ks: {
                o: { a: 0, k: 100 },
                r: { a: 0, k: 0 },
                p: { a: 0, k: [100, 125, 0] },
                a: { a: 0, k: [0, 0, 0] },
                s: {
                    a: 1,
                    k: [
                        { t: 0, s: [100, 100, 100], e: [120, 150, 100] },
                        { t: 15, s: [120, 150, 100], e: [100, 80, 100] },
                        { t: 30, s: [100, 80, 100], e: [130, 160, 100] },
                        { t: 45, s: [130, 160, 100], e: [100, 100, 100] },
                        { t: 60, s: [100, 100, 100] }
                    ]
                }
            },
            shapes: [{
                ty: "gr",
                it: [
                    {
                        ty: "rc",
                        p: { a: 0, k: [0, 0] },
                        s: { a: 0, k: [50, 25] },
                        r: { a: 0, k: 12 }
                    },
                    { ty: "fl", c: { a: 0, k: [0.8, 0.2, 0.2, 1] }, o: { a: 0, k: 100 } },
                    { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
                ]
            }]
        },
        // BLUSH LEFT
        {
            ddd: 0, ind: 5, ty: 4, nm: "Blush L",
            ks: {
                o: { a: 1, k: [{ t: 0, s: [40], e: [70] }, { t: 30, s: [70], e: [40] }, { t: 60, s: [40] }] },
                r: { a: 0, k: 0 },
                p: { a: 0, k: [55, 110, 0] },
                a: { a: 0, k: [0, 0, 0] },
                s: { a: 0, k: [100, 100, 100] }
            },
            shapes: [{
                ty: "gr",
                it: [
                    { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [25, 15] } },
                    { ty: "fl", c: { a: 0, k: [1, 0.5, 0.5, 1] }, o: { a: 0, k: 100 } },
                    { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
                ]
            }]
        },
        // BLUSH RIGHT
        {
            ddd: 0, ind: 6, ty: 4, nm: "Blush R",
            ks: {
                o: { a: 1, k: [{ t: 0, s: [40], e: [70] }, { t: 30, s: [70], e: [40] }, { t: 60, s: [40] }] },
                r: { a: 0, k: 0 },
                p: { a: 0, k: [145, 110, 0] },
                a: { a: 0, k: [0, 0, 0] },
                s: { a: 0, k: [100, 100, 100] }
            },
            shapes: [{
                ty: "gr",
                it: [
                    { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [25, 15] } },
                    { ty: "fl", c: { a: 0, k: [1, 0.5, 0.5, 1] }, o: { a: 0, k: 100 } },
                    { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
                ]
            }]
        }
    ]
};

interface LottieAvatarProps {
    speed?: number;
    animationData?: any;
}

export function LottieAvatar({ speed = 1, animationData }: LottieAvatarProps) {
    const options = {
        animationData: animationData || laughingFaceAnimation,
        loop: true,
        autoplay: true,
    };

    const { View, setSpeed } = useLottie(options);

    useEffect(() => {
        // Clamp speed between 0.3 and 3 for reasonable animation
        const clampedSpeed = Math.max(0.3, Math.min(3, speed));
        setSpeed(clampedSpeed);
    }, [speed, setSpeed]);

    return (
        <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
            {View}
        </div>
    );
}
