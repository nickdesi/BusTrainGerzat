#!/usr/bin/env python3
"""
Start one or more servers, wait for them to be ready, run a command, then clean up.
Designed for robustness in CI/CD and local testing environments.
"""

import subprocess
import socket
import time
import sys
import argparse
import signal
import os

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def log(msg, color=RESET):
    print(f"{color}{msg}{RESET}")

def is_server_ready(port, timeout=30):
    """Wait for server to be ready by polling the port."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection(('localhost', port), timeout=1):
                return True
        except (socket.error, ConnectionRefusedError):
            time.sleep(0.5)
    return False

def main():
    parser = argparse.ArgumentParser(description='Run command with one or more servers')
    parser.add_argument('--server', action='append', dest='servers', required=True, help='Server command (can be repeated)')
    parser.add_argument('--port', action='append', dest='ports', type=int, required=True, help='Port for each server (must match --server count)')
    parser.add_argument('--timeout', type=int, default=30, help='Timeout in seconds per server (default: 30)')
    parser.add_argument('command', nargs=argparse.REMAINDER, help='Command to run after server(s) ready')

    args = parser.parse_args()

    # Validations
    if args.command and args.command[0] == '--':
        args.command = args.command[1:]

    if not args.command:
        log("Error: No command specified to run", RED)
        sys.exit(1)

    if len(args.servers) != len(args.ports):
        log("Error: Number of --server and --port arguments must match", RED)
        sys.exit(1)

    servers = [{'cmd': c, 'port': p} for c, p in zip(args.servers, args.ports)]
    server_processes = []

    try:
        # Start all servers
        for i, server in enumerate(servers):
            log(f"🚀 Starting server {i+1}/{len(servers)}: {server['cmd']}", YELLOW)

            # Use shell=True to support commands with cd and &&
            # On Unix, setsid creates a new process group for easier cleanup of children
            preexec_fn = os.setsid if sys.platform != 'win32' else None
            
            process = subprocess.Popen(
                server['cmd'],
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=preexec_fn
            )
            server_processes.append(process)

            # Wait for this server
            log(f"⏳ Waiting for server on port {server['port']}...", YELLOW)
            if not is_server_ready(server['port'], timeout=args.timeout):
                raise RuntimeError(f"Server failed to start on port {server['port']} within {args.timeout}s")
            
            log(f"✅ Server ready on port {server['port']}", GREEN)

        log(f"\n✨ All {len(servers)} server(s) ready. Running command...", GREEN)
        
        # Run the command
        log(f"🏃 Running: {' '.join(args.command)}", GREEN)
        result = subprocess.run(args.command)
        sys.exit(result.returncode)

    except KeyboardInterrupt:
        log("\n🛑 Interrupted by user", RED)
        sys.exit(130)
    except Exception as e:
        log(f"\n❌ Error: {e}", RED)
        sys.exit(1)
    finally:
        # Clean up all servers
        log(f"\n🧹 Stopping {len(server_processes)} server(s)...", YELLOW)
        for i, process in enumerate(server_processes):
            try:
                if sys.platform != 'win32':
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                else:
                    process.terminate()
                
                process.wait(timeout=5)
            except Exception:
                # Force kill if needed
                try: 
                    process.kill() 
                except: 
                    pass
            log(f"Server {i+1} stopped", GREEN)

if __name__ == '__main__':
    main()