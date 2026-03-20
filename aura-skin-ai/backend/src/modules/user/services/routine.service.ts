import { Injectable } from "@nestjs/common";
import type { DbRoutineLog } from "../../../database/models";
import { RoutineRepository } from "../repositories/routine.repository";
import { RoutineLogsRepository } from "../repositories/routineLogs.repository";
import { AnalyticsService } from "../../analytics/analytics.service";

export interface CurrentRoutineSummary {
  plan: {
    id: string;
    morningRoutine: string[];
    nightRoutine: string[];
    lifestyle: {
      foodAdvice: string[];
      hydration: string[];
      sleep: string[];
    };
  } | null;
  adherence: {
    percentLast7Days: number;
    currentStreakDays: number;
  };
}

@Injectable()
export class RoutineService {
  constructor(
    private readonly routineRepository: RoutineRepository,
    private readonly routineLogsRepository: RoutineLogsRepository,
    private readonly analytics: AnalyticsService
  ) {}

  async getCurrentRoutine(userId: string): Promise<CurrentRoutineSummary> {
    const plan = await this.routineRepository.getCurrentRoutinePlan(userId);
    if (!plan) {
      return {
        plan: null,
        adherence: {
          percentLast7Days: 0,
          currentStreakDays: 0,
        },
      };
    }

    const today = new Date();
    const from7 = new Date(today);
    from7.setDate(today.getDate() - 6);
    const from7Str = from7.toISOString().slice(0, 10);

    const from30 = new Date(today);
    from30.setDate(today.getDate() - 29);
    const from30Str = from30.toISOString().slice(0, 10);

    const logsLast7 = await this.routineLogsRepository.findByUserAndPlanSince(
      userId,
      plan.id,
      from7Str
    );
    const logsLast30 = await this.routineLogsRepository.findByUserAndPlanSince(
      userId,
      plan.id,
      from30Str
    );

    const expectedEntries = 7 * 2;
    const completedEntries = logsLast7.filter((l) => l.status === "completed").length;
    const percentLast7Days =
      expectedEntries > 0 ? Math.round((completedEntries / expectedEntries) * 100) : 0;

    const currentStreakDays = this.computeStreak(today, logsLast30);

    return {
      plan: {
        id: plan.id,
        morningRoutine: plan.morning_routine ?? [],
        nightRoutine: plan.night_routine ?? [],
        lifestyle: {
          foodAdvice: plan.lifestyle_food_advice ?? [],
          hydration: plan.lifestyle_hydration ?? [],
          sleep: plan.lifestyle_sleep ?? [],
        },
      },
      adherence: {
        percentLast7Days,
        currentStreakDays,
      },
    };
  }

  async getLogsForUser(
    userId: string,
    days: number
  ): Promise<{ planId: string | null; logs: DbRoutineLog[] }> {
    const plan = await this.routineRepository.getCurrentRoutinePlan(userId);
    if (!plan) {
      return { planId: null, logs: [] };
    }
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - (days - 1));
    const fromStr = from.toISOString().slice(0, 10);
    const logs = await this.routineLogsRepository.findByUserAndPlanSince(
      userId,
      plan.id,
      fromStr
    );
    return { planId: plan.id, logs };
  }

  async upsertLog(
    userId: string,
    params: { date: string; timeOfDay: "morning" | "night"; status: "completed" | "skipped" }
  ): Promise<void> {
    const plan = await this.routineRepository.getCurrentRoutinePlan(userId);
    if (!plan) {
      return;
    }
    await this.routineLogsRepository.upsertLog({
      user_id: userId,
      routine_plan_id: plan.id,
      date: params.date,
      time_of_day: params.timeOfDay,
      status: params.status,
    });

    await this.analytics.track("routine_logged", {
      user_id: userId,
      entity_type: "routine_log",
      entity_id: plan.id,
      metadata: {
        date: params.date,
        time_of_day: params.timeOfDay,
        status: params.status,
      },
    });
  }

  private computeStreak(today: Date, logs: DbRoutineLog[]): number {
    if (!logs.length) return 0;
    const completedDates = new Set(
      logs.filter((l) => l.status === "completed").map((l) => l.date)
    );
    if (!completedDates.size) return 0;

    let streak = 0;
    const cursor = new Date(today);
    // normalize to date only
    cursor.setHours(0, 0, 0, 0);

    while (true) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (!completedDates.has(dateStr)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
}

