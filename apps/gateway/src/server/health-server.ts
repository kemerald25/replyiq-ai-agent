import * as http from "node:http";
import { MessagingTransport } from "../transport/interface.js";

export interface HealthServerConfig {
  host?: string;
  port?: number;
  gatewayVersion?: string;
  transport: MessagingTransport;
  getLastHeartbeat?: () => number | null;
}

export class HealthServer {
  private server: http.Server | null = null;
  private host: string;
  private port: number;
  private gatewayVersion: string;
  private transport: MessagingTransport;
  private getLastHeartbeat: () => number | null;
  private startedAt: number = Date.now();

  constructor(config: HealthServerConfig) {
    this.host = config.host || process.env.HEALTH_HOST || "127.0.0.1";
    this.port = config.port ?? (parseInt(process.env.HEALTH_PORT || "8789", 10));
    this.gatewayVersion = config.gatewayVersion || "1.0.0";
    this.transport = config.transport;
    this.getLastHeartbeat = config.getLastHeartbeat || (() => null);
  }

  async start(): Promise<void> {
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://${this.host}:${this.port}`);

      if (url.pathname === "/health" || url.pathname === "/") {
        const transportState = this.transport.getState();
        const isHealthy = transportState === "connected" || transportState === "authenticated";

        const payload = {
          status: isHealthy ? "ok" : "degraded",
          gatewayVersion: this.gatewayVersion,
          transport: this.transport.transportName,
          transportState,
          lastHeartbeat: this.getLastHeartbeat(),
          uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
          timestamp: Date.now(),
        };

        res.writeHead(isHealthy ? 200 : 503, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(JSON.stringify(payload));
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(this.port, this.host, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }
  }

  getPort(): number {
    const addr = this.server?.address();
    if (addr && typeof addr === "object") {
      return addr.port;
    }
    return this.port;
  }
}
