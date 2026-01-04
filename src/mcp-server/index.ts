#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fetchVehiclePositions } from '@/lib/gtfs-rt';
import { getBusData, getTrainData } from '@/lib/data-source';
import gtfsConfig from '@/data/gtfs_config.json';

// --- CRITICAL: Protect JSON-RPC Transport ---
// MCP uses stdout for protocol messages. Any application log written to stdout
// will break the client parser. We redirect console.log to stderr.
const originalLog = console.log;
console.log = console.error;

// Initialize Server
// "bus-train-gerzat-mcp" matches previous configuration
const server = new McpServer({
    name: 'bus-train-gerzat-mcp',
    version: '1.0.0',
});

// --- Resources ---

server.resource(
    'config-stops',
    'transport://config/stops',
    async (uri) => ({
        contents: [{
            uri: uri.href,
            text: JSON.stringify(gtfsConfig.stopIds, null, 2),
            mimeType: 'application/json'
        }]
    })
);

// --- Tools ---

server.tool(
    'get_bus_positions',
    'Get real-time GPS positions of active buses on Line E1. Returns lat/lon and bearing for each vehicle.',
    {}, // No input arguments
    async () => {
        const positionsMap = await fetchVehiclePositions();
        const positions = Array.from(positionsMap.values()).map(p => ({
            tripId: p.tripId,
            lat: p.lat,
            lon: p.lon,
            bearing: p.bearing,
            timestamp: new Date(p.timestamp * 1000).toISOString()
        }));

        return {
            content: [{ type: 'text', text: JSON.stringify(positions, null, 2) }]
        };
    }
);

server.tool(
    'get_departures',
    'Get upcoming departures (bus and train) for the Gerzat hub. Includes real-time delays.',
    {
        type: z.enum(['BUS', 'TRAIN', 'ALL']).optional().describe('Filter by transport type. Defaults to ALL.')
    },
    async ({ type } = { type: 'ALL' }) => {
        const filterType = type || 'ALL';
        const departurePromises = [];

        if (filterType === 'ALL' || filterType === 'BUS') {
            departurePromises.push(getBusData().then(d => ({ type: 'BUS', data: d.updates })));
        }

        if (filterType === 'ALL' || filterType === 'TRAIN') {
            departurePromises.push(getTrainData().then(d => ({ type: 'TRAIN', data: d.updates })));
        }

        const results = await Promise.all(departurePromises);
        const flatResults = results.flatMap(r => r.data.map(d => ({ ...d, type: r.type })));

        return {
            content: [{ type: 'text', text: JSON.stringify(flatResults, null, 2) }]
        };
    }
);

server.tool(
    'get_line_status',
    'Get a summary of the current status of Line E1 (number of buses, average delay, disruption alerts).',
    {},
    async () => {
        const positionsMap = await fetchVehiclePositions();
        const busData = await getBusData();

        const vehicleCount = positionsMap.size;

        // Calculate average delay from bus updates
        const delays = busData.updates
            .filter(u => u.isRealtime)
            .map(u => u.delay);

        const avgDelaySeconds = delays.length > 0
            ? delays.reduce((a, b) => a + b, 0) / delays.length
            : 0;

        const status = {
            active_vehicles: vehicleCount,
            next_departures_count: busData.updates.length,
            average_delay_minutes: Math.round(avgDelaySeconds / 60),
            traffic_condition: avgDelaySeconds > 300 ? 'HEAVY_DELAYS' : (avgDelaySeconds > 120 ? 'MODERATE_DELAYS' : 'FLUID'),
            timestamp: new Date().toISOString()
        };

        return {
            content: [{ type: 'text', text: JSON.stringify(status, null, 2) }]
        };
    }
);

// --- Main Execution ---

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Server running on stdio');
}

main().catch((error) => {
    console.error("Fatal error in main:", error);
    process.exit(1);
});
