import React from 'react';

interface SplitFlapDisplayProps {
    text: string;
    size?: 'xs' | 'sm' | 'lg' | 'xl' | '2xl';
    color?: string;
}

export default function SplitFlapDisplay({ text, size = 'xl', color = 'text-yellow-500' }: SplitFlapDisplayProps) {
    const chars = text.split('');
    return (
        <div className={`split-flap-container split-flap-${size} ${color} flex`}>
            {chars.map((char, idx) => (
                <span
                    key={idx}
                    className={`split-flap-char ${char === ':' ? 'colon' : ''
                        } ${char === ' ' ? 'space' : ''
                        } ${char === '-' ? 'dash' : ''
                        } ${char === "'" ? 'apos' : ''
                        }`}
                >
                    {char}
                </span>
            ))}
        </div>
    );
}
