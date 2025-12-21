import { useMemo, memo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { VehiclePosition } from '@/hooks/useVehiclePositions';
import { Bus } from 'lucide-react';

interface BusMarkerProps {
    vehicle: VehiclePosition;
}

const BusMarker = memo(function BusMarker({ vehicle }: BusMarkerProps) {
    // Determine bus color based on direction
    // direction 0 = From Gerzat towards Aubière/Romagnat (blue)
    // direction 1 = Towards Gerzat (green)
    const iconColor = vehicle.direction === 1 ? '#22c55e' : '#3b82f6';

    // Determine pulse class based on delay
    const delayMinutes = Math.round(vehicle.delay / 60);
    const getPulseClass = () => {
        if (delayMinutes > 10) return 'bus-icon-pulse bus-icon-pulse-red';
        if (delayMinutes >= 5) return 'bus-icon-pulse bus-icon-pulse-orange';
        return 'bus-icon-pulse bus-icon-pulse-green';
    };
    const pulseClass = getPulseClass();

    // Create custom bus icon with SVG that rotates properly
    const busIcon = useMemo(() => {
        if (typeof window === 'undefined') return null;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const L = require('leaflet');

        // SVG bus icon pointing up (will be rotated by bearing)
        const svgIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="${iconColor}" style="transform: rotate(${vehicle.bearing || 0}deg); filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
                <path d="M12 2C8 2 4 2.5 4 6v9.5c0 .95.38 1.81 1 2.44V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-2.06c.62-.63 1-1.49 1-2.44V6c0-3.5-4-4-8-4zm-3.5 15c-.83 0-1.5-.67-1.5-1.5S7.67 14 8.5 14s1.5.67 1.5 1.5S9.33 17 8.5 17zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H7V7h10v4z"/>
            </svg>
        `;

        return L.divIcon({
            className: 'bus-marker',
            html: `
                <div class="bus-icon-container">
                    <div class="${pulseClass}"></div>
                    <div class="bus-icon">
                        ${svgIcon}
                    </div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20],
        });
    }, [vehicle.bearing, iconColor, pulseClass]);

    if (!busIcon) return null;

    return (
        <Marker
            position={[vehicle.lat, vehicle.lon]}
            icon={busIcon}
        >
            <Popup>
                <div className="p-1">
                    <div className="font-bold text-lg flex items-center gap-2 text-white mb-2">
                        <Bus className="w-5 h-5 text-green-400" />
                        <span>Ligne E1</span>
                    </div>

                    {/* Direction indicator */}
                    <div className="bg-green-500/20 border border-green-500/30 rounded px-2 py-1 mb-2 text-center">
                        <span className="text-green-400 font-medium text-sm">
                            → {vehicle.headsign}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Prochain arrêt</div>
                            <div className="font-medium text-white">{vehicle.nextStopName}</div>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1 bg-white/5 rounded p-2 border border-white/10 text-center">
                                <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Retard</div>
                                <div className={`font-bold ${vehicle.delay > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                                    {vehicle.delay > 0 ? `+${Math.round(vehicle.delay / 60)} min` : 'À l\'heure'}
                                </div>
                            </div>
                            <div className="flex-1 bg-white/5 rounded p-2 border border-white/10 text-center">
                                <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Arrivée</div>
                                <div className="font-bold text-white">
                                    {new Date(vehicle.estimatedArrival * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>

                        {/* Terminus ETA */}
                        <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Terminus</div>
                            <div className="font-medium text-yellow-400">
                                ETA: {new Date(vehicle.terminusEta * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                </div>
            </Popup>
        </Marker>
    );
});

export default BusMarker;
