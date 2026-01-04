#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';


// Import project functions
// Note: We assume ts-node with tsconfig-paths is used to run this
import { fetchVehiclePositions } from '@/lib/gtfs-rt';
import { getBusData, getTrainData } from '@/lib/data-source';
import gtfsConfig from '@/data/gtfs_config.json';

const server = new Server(
    {
        name: 'bus-train-gerzat-mcp',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
            resources: {},
        },
    }
);

// --- Resources ---

server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
        resources: [
            {
                uri: 'transport://config/stops',
                name: 'Monitored Stops Configuration',
                mimeType: 'application/json',
                description: 'List of all stops monitored by the application (ids and groups)',
            },
        ],
    };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === 'transport://config/stops') {
        return {
            contents: [
                {
                    uri: 'transport://config/stops',
                    mimeType: 'application/json',
                    text: JSON.stringify(gtfsConfig.stopIds, null, 2),
                },
            ],
        };
    }
    throw new Error('Resource not found');
});

// --- Tools ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'get_bus_positions',
                description: 'Get real-time GPS positions of active buses on Line E1. Returns lat/lon, bearing, and delay for each vehicle.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_departures',
                description: 'Get upcoming departures (bus and train) for the Gerzat hub. Includes real-time delays.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['BUS', 'TRAIN', 'ALL'],
                            description: 'Filter by transport type. Defaults to ALL.',
                        },
                    },
                },
            },
            {
                name: 'get_line_status',
                description: 'Get a summary of the current status of Line E1 (number of buses, average delay, disruption alerts).',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        if (request.params.name === 'get_bus_positions') {
            const positionsMap = await fetchVehiclePositions();
            // Convert Map to Array for JSON response
            const positions = Array.from(positionsMap.values()).map(p => ({
                tripId: p.tripId,
                lat: p.lat,
                lon: p.lon,
                bearing: p.bearing,
                timestamp: new Date(p.timestamp * 1000).toISOString()
            }));

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(positions, null, 2),
                    },
                ],
            };
        }

        if (request.params.name === 'get_departures') {
            const { type = 'ALL' } = request.params.arguments as { type?: string } || {};

            const departurePromises = [];
            if (type === 'ALL' || type === 'BUS') departurePromises.push(getBusData().then(d => ({ type: 'BUS', data: d.updates })));
            if (type === 'ALL' || type === 'TRAIN') departurePromises.push(getTrainData().then(d => ({ type: 'TRAIN', data: d.updates })));

            const results = await Promise.all(departurePromises);
            const flatResults = results.flatMap(r => r.data.map(d => ({ ...d, type: r.type })));

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(flatResults, null, 2),
                    },
                ],
            };
        }

        if (request.params.name === 'get_line_status') {
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
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(status, null, 2),
                    },
                ],
            };
        }

        throw new Error('Tool not found');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error executing tool: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});


async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Server running on stdio');
}

main().catch((error) => {
    console.error("Fatal error in main:", error);
    process.exit(1);
});
