// The socket.io client script (/socket.io/socket.io.js, served by the game server) defines `io`.
interface IoSocket {
  connected: boolean;
  on(event: string, fn: (...args: any[]) => void): unknown;
  emit(event: string, ...args: any[]): unknown;
  disconnect(): unknown;
}

declare function io(opts?: { auth?: Record<string, unknown>; transports?: string[] }): IoSocket;
