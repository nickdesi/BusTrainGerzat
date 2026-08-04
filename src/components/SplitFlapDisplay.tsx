import React, { memo } from 'react';

interface SplitFlapDisplayProps {
    text: string;
    size?: 'xs' | 'sm' | 'lg' | 'xl' | '2xl';
    color?: string;
}

// ⚡ Bolt: Removed text.split('').map() which creates an intermediate array of strings
// on every render. Replaced with a single-pass loop over the string characters to reduce
// memory allocation and garbage collection overhead, especially important as this component
// is rendered heavily in lists and tables.
const SplitFlapDisplay = memo(function SplitFlapDisplay({ text, size = 'xl', color = 'text-yellow-500' }: SplitFlapDisplayProps) {
    const chars = [];
    for (let idx = 0; idx < text.length; idx++) {
        // eslint-disable-next-line security/detect-object-injection
        const char = text[idx];
        chars.push(
            <span
                key={`${idx}-${char}`}
                className={`split-flap-char ${char === ':' ? 'colon' : ''
                    } ${char === ' ' ? 'space' : ''
                    } ${char === '-' ? 'dash' : ''
                    } ${char === "'" ? 'apos' : ''
                    }`}
            >
                {char}
            </span>
        );
    }

    return (
        <div className={`split-flap-container split-flap-${size} ${color} flex`}>
            {chars}
        </div>
    );
});

export default SplitFlapDisplay;
