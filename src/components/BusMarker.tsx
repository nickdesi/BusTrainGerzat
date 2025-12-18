import { useMemo, memo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { VehiclePosition } from '@/hooks/useVehiclePositions';
import { Bus } from 'lucide-react';

interface BusMarkerProps {
    vehicle: VehiclePosition;
}

const BusMarker = memo(function BusMarker({ vehicle }: BusMarkerProps) {
    // Create custom bus icon
    const busIcon = useMemo(() => {
        if (typeof window === 'undefined') return null;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const L = require('leaflet');
        return L.divIcon({
            className: 'bus-marker',
            html: `
                <div class="bus-icon-container">
                    <div class="bus-icon-pulse"></div>
                    <div class="bus-icon">
                        <div style="transform: rotate(${vehicle.bearing || 0}deg);">
                            🚌
                        </div>
                    </div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20],
        });
    }, [vehicle.bearing]);

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
                        <span>Ligne 20</span>
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
                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Terminus ({vehicle.headsign.split(' ')[0]})</div>
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
