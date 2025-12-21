import { CircleMarker, Popup } from 'react-leaflet';
import { Stop } from '@/hooks/useLineE1Data';

interface StopMarkerProps {
    stop: Stop;
    isTerminus: boolean;
    routeColor: string;
}

export default function StopMarker({ stop, isTerminus, routeColor }: StopMarkerProps) {
    return (
        <CircleMarker
            center={[stop.lat, stop.lon]}
            radius={isTerminus ? 10 : 6}
            fillColor={isTerminus ? routeColor : '#ffffff'}
            fillOpacity={isTerminus ? 1 : 0.9}
            color={isTerminus ? '#ffffff' : routeColor}
            weight={isTerminus ? 3 : 2}
        >
            <Popup>
                <div className="text-white">
                    <div className="font-bold text-lg mb-1">{stop.stopName}</div>
                    {isTerminus && (
                        <span className="inline-block px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs border border-green-500/50">
                            Terminus
                        </span>
                    )}
                </div>
            </Popup>
        </CircleMarker>
    );
}
