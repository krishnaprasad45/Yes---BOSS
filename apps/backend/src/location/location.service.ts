import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { DistanceSummary } from "@yes-boss/shared";
import { PrismaService } from "../prisma/prisma.service";
import { DistanceQueryDto, SyncLocationDto } from "./dto";

const EARTH_RADIUS_M = 6_371_000;
// Ignore GPS jitter below this between consecutive points.
const MIN_SEGMENT_M = 10;

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  /** Idempotent batch insert of GPS points (dedupe by dedupeKey). */
  async sync(dto: SyncLocationDto): Promise<{ inserted: number; skipped: number }> {
    if (dto.points.length === 0) return { inserted: 0, skipped: 0 };
    const result = await this.prisma.locationPoint.createMany({
      data: dto.points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        recordedAt: new Date(p.recordedAt),
        dedupeKey: p.dedupeKey,
      })),
      skipDuplicates: true,
    });
    return { inserted: result.count, skipped: dto.points.length - result.count };
  }

  /** Total distance travelled over a range (default last 30 days). */
  async distance(query: DistanceQueryDto): Promise<DistanceSummary> {
    const toDate = query.to ? new Date(query.to) : new Date();
    const fromDate = query.from
      ? new Date(query.from)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where: Prisma.LocationPointWhereInput = {
      recordedAt: { gte: fromDate, lte: toDate },
    };
    const points = await this.prisma.locationPoint.findMany({
      where,
      orderBy: { recordedAt: "asc" },
      select: { lat: true, lng: true },
    });

    let totalMeters = 0;
    for (let i = 1; i < points.length; i++) {
      const seg = haversine(
        points[i - 1].lat,
        points[i - 1].lng,
        points[i].lat,
        points[i].lng,
      );
      if (seg >= MIN_SEGMENT_M) totalMeters += seg;
    }

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      totalMeters: Math.round(totalMeters),
      totalKm: Math.round(totalMeters / 100) / 10,
      pointCount: points.length,
    };
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
