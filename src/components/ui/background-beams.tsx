"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
    return (
        <div
            className={cn(
                "absolute top-0 left-0 w-full h-full overflow-hidden bg-neutral-950 flex flex-col items-center justify-center pointer-events-none z-0",
                className
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950/80 to-neutral-950 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />

            <div className="absolute top-0 left-0 w-full h-full z-10 opacity-30">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 h-full w-full"
                >
                    {/* Abstract grid/beams representation */}
                    <svg
                        className="absolute inset-0 w-full h-full"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 1000 1000"
                        preserveAspectRatio="none"
                    >
                        <path
                            d="M0,1000 L1000,0"
                            stroke="url(#gradient1)"
                            strokeWidth="0.5"
                            fill="none"
                            className="animate-pulse"
                        />
                        <path
                            d="M0,0 L1000,1000"
                            stroke="url(#gradient2)"
                            strokeWidth="0.5"
                            fill="none"
                            className="animate-pulse delay-700"
                        />

                        <defs>
                            <linearGradient id="gradient1" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(234, 179, 8, 0)" />
                                <stop offset="50%" stopColor="rgba(234, 179, 8, 0.5)" />
                                <stop offset="100%" stopColor="rgba(234, 179, 8, 0)" />
                            </linearGradient>
                            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="rgba(168, 85, 247, 0)" />
                                <stop offset="50%" stopColor="rgba(168, 85, 247, 0.5)" />
                                <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
                            </linearGradient>
                        </defs>
                    </svg>
                </motion.div>
            </div>

            <div className="absolute inset-0 z-0 bg-neutral-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        </div>
    );
};
