import React, { useState } from "react";
import { cn } from "@/lib/utils";

export const TextRevealCard = ({
    text,
    revealText,
    children,
    className,
}: {
    text: string;
    revealText: string;
    children?: React.ReactNode;
    className?: string;
}) => {
    const [width, setWidth] = useState(0);

    function mouseMoveHandler(event: React.MouseEvent<HTMLDivElement>) {
        const { clientX } = event;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = clientX - rect.left;
        setWidth(x);
    }

    function mouseLeaveHandler() {
        setWidth(0);
    }

    function touchMoveHandler(event: React.TouchEvent<HTMLDivElement>) {
        const { clientX } = event.touches[0];
        const rect = event.currentTarget.getBoundingClientRect();
        const x = clientX - rect.left;
        setWidth(x);
    }

    return (
        <div
            onMouseMove={mouseMoveHandler}
            onMouseLeave={mouseLeaveHandler}
            onTouchMove={touchMoveHandler}
            onTouchEnd={mouseLeaveHandler}
            className={cn(
                "bg-[#1d1c20] w-full rounded-lg relative overflow-hidden",
                className
            )}
        >
            <div className="h-40 relative flex items-center overflow-hidden">
                <div
                    className="absolute inset-0 bg-[#1d1c20] z-20 w-full h-full select-none pointer-events-none"
                    style={{
                        maskImage: `linear-gradient(to right, transparent ${width}px, black ${width}px)`,
                        WebkitMaskImage: `linear-gradient(to right, transparent ${width}px, black ${width}px)`,
                    }}
                >
                    <p className="text-base sm:text-[3rem] py-10 font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-300 text-center">
                        {text}
                    </p>
                </div>
                <div className="absolute inset-0 bg-yellow-500/20 z-10 w-full h-full select-none pointer-events-none" />

                <p className="text-base sm:text-[3rem] py-10 font-bold bg-clip-text text-transparent bg-gradient-to-b from-yellow-400 to-yellow-600 text-center z-0 w-full">
                    {revealText}
                </p>

            </div>
            {children}
        </div>
    );
};

export const TextRevealCardTitle = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <h2 className={cn("text-white text-lg mb-2", className)}>
            {children}
        </h2>
    );
};

export const TextRevealCardDescription = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <p className={cn("text-[#a9a9a9] text-sm", className)}>{children}</p>
    );
};
