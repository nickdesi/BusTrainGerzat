import { Map } from 'lucide-react';

export default function BusMapSkeleton() {
    return (
        <div className="relative w-full h-full bg-gray-900 overflow-hidden animate-pulse">
            {/* Map Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 border-4 border-gray-700 rounded-full" />
                <div className="absolute bottom-1/3 right-1/3 w-64 h-64 border-4 border-gray-700 transform rotate-45" />
                <div className="absolute top-1/2 left-1/2 w-full h-1 bg-gray-700 transform -translate-y-1/2 rotate-12" />
            </div>

            {/* Center Icon */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-800">
                <Map size={64} strokeWidth={1} />
            </div>

            {/* Simulated UI Elements */}
            <div className="absolute top-4 right-4 h-10 w-32 bg-gray-800 rounded-full" />
            <div className="absolute top-20 right-4 h-[300px] w-64 bg-gray-800 rounded-lg hidden md:block" />
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 h-10 w-48 bg-gray-800 rounded-full" />
        </div>
    );
}
