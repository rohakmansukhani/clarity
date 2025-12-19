import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
    width: 32,
    height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                }}
            >
                <svg
                    width="32"
                    height="32"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Outer Glow (Simplified for static icon) */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="url(#msg-gradient)"
                        opacity="0.3"
                    />

                    {/* Main Star Shape */}
                    <path
                        d="M50 0L61 39L100 50L61 61L50 100L39 61L0 50L39 39L50 0Z"
                        fill="url(#main-gradient)"
                    />

                    {/* Inner Detail */}
                    <circle cx="50" cy="50" r="10" fill="#fff" fillOpacity="0.9" />

                    <defs>
                        <linearGradient
                            id="main-gradient"
                            x1="0"
                            y1="0"
                            x2="100"
                            y2="100"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop stopColor="#00E5FF" />
                            <stop offset="1" stopColor="#2979FF" />
                        </linearGradient>
                        <radialGradient
                            id="msg-gradient"
                            cx="0"
                            cy="0"
                            r="1"
                            gradientUnits="userSpaceOnUse"
                            gradientTransform="translate(50 50) rotate(90) scale(50)"
                        >
                            <stop stopColor="#00E5FF" />
                            <stop offset="1" stopColor="#00E5FF" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                </svg>
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    )
}
