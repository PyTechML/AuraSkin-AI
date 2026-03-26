import { Controller, Get, UseGuards } from "@nestjs/common";
import { SetMetadata } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import type { BackendRole } from "../../../shared/constants/roles";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { getSupabaseClient } from "../../../database/supabase.client";
import { RedisService } from "../../../redis/redis.service";
import { loadEnv } from "../../../config/env";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

export interface SystemHealthResponse {
  api_status: "ok";
  database_status: "ok" | "degraded" | "down";
  redis_status: "ok" | "down";
  worker_status: "healthy" | "idle" | "offline" | "unreachable";
  queue_length: number;
  last_worker_activity: string | null;
  uptime: number;
  total_users: number;
  total_assessments: number;
  total_reports: number;
  total_orders: number;
  dependency_reasons?: string[];
}

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminSystemHealthController {
  constructor(private readonly redis: RedisService) {}

  @Get("system-health")
  async getSystemHealth() {
    const env = loadEnv();
    const [dbStatus, redisOk, queueLength, heartbeat, counts] = await Promise.all([
      this.checkDatabase(),
      this.redis.ping(),
      this.redis.getQueueLength(),
      this.redis.getWorkerHeartbeat(),
      this.getGlobalCounts(),
    ]);

    const workerRunning = await this.redis.getWorkerRunningCount();

    let worker_status: SystemHealthResponse["worker_status"] = "unreachable";
    let last_worker_activity: string | null = heartbeat;

    if (!redisOk) {
      worker_status = "unreachable";
      last_worker_activity = null;
    } else if (workerRunning > 0) {
      worker_status = "healthy";
    } else if (heartbeat) {
      const last = new Date(heartbeat).getTime();
      const now = Date.now();
      const ageSec = Number.isFinite(last) ? (now - last) / 1000 : Number.POSITIVE_INFINITY;
      if (ageSec > env.workerHeartbeatMaxAgeMs / 1000) {
        worker_status = "offline";
      } else {
        worker_status = "idle";
      }
    } else {
      worker_status = "unreachable";
    }

    const body: SystemHealthResponse = {
      api_status: "ok",
      database_status: dbStatus,
      redis_status: redisOk ? "ok" : "down",
      worker_status,
      queue_length: queueLength,
      last_worker_activity,
      uptime: Math.floor(process.uptime()),
      total_users: counts.total_users,
      total_assessments: counts.total_assessments,
      total_reports: counts.total_reports,
      total_orders: counts.total_orders,
      dependency_reasons: [
        ...(dbStatus !== "ok" ? ["DATABASE_UNHEALTHY"] : []),
        ...(!redisOk ? ["REDIS_UNAVAILABLE"] : []),
        ...(worker_status === "offline" || worker_status === "unreachable" ? ["WORKER_UNHEALTHY"] : []),
      ],
    };

    return formatSuccess(body);
  }

  private async getGlobalCounts(): Promise<{
    total_users: number;
    total_assessments: number;
    total_reports: number;
    total_orders: number;
  }> {
    const supabase = getSupabaseClient();
    const defaults = { total_users: 0, total_assessments: 0, total_reports: 0, total_orders: 0 };
    try {
      const [users, assessments, reports, orders] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).limit(1),
        supabase.from("assessments").select("id", { count: "exact", head: true }).limit(1),
        supabase.from("reports").select("id", { count: "exact", head: true }).limit(1),
        supabase.from("orders").select("id", { count: "exact", head: true }).limit(1),
      ]);
      return {
        total_users: typeof users.count === "number" ? users.count : defaults.total_users,
        total_assessments: typeof assessments.count === "number" ? assessments.count : defaults.total_assessments,
        total_reports: typeof reports.count === "number" ? reports.count : defaults.total_reports,
        total_orders: typeof orders.count === "number" ? orders.count : defaults.total_orders,
      };
    } catch {
      return defaults;
    }
  }

  private async checkDatabase(): Promise<SystemHealthResponse["database_status"]> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .limit(1);
      if (!error) return "ok";
      return "degraded";
    } catch {
      return "down";
    }
  }
}

