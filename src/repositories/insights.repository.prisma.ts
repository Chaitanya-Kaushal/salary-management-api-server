import type { Prisma, PrismaClient } from '@prisma/client';
import {
  SALARY_BANDS,
  type ByCountryRow,
  type ByDepartmentRow,
  type ByEmploymentTypeRow,
  type ByJobTitleRow,
  type InsightsRepository,
  type InsightsSummary,
  type SalaryBand,
} from './insights.repository.js';

export class PrismaInsightsRepository implements InsightsRepository {
  constructor(private readonly client: PrismaClient) {}

  async summary(): Promise<InsightsSummary> {
    const [totalEmployees, totalPayrollResult, countries, titles] = await Promise.all([
      this.client.employee.count(),
      this.client.employee.aggregate({ _sum: { salary: true } }),
      this.client.employee.groupBy({
        by: ['country'],
        _count: { _all: true },
        orderBy: { _count: { country: 'desc' } },
        take: 5,
      }),
      this.client.employee.groupBy({
        by: ['jobTitle'],
        _count: { _all: true },
        orderBy: { _count: { jobTitle: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalEmployees,
      totalPayroll: totalPayrollResult._sum.salary ?? 0,
      topCountries: countries.map((c) => ({ country: c.country, count: c._count._all })),
      topJobTitles: titles.map((t) => ({ jobTitle: t.jobTitle, count: t._count._all })),
    };
  }

  async byCountry(): Promise<ByCountryRow[]> {
    const aggregates = await this.client.employee.groupBy({
      by: ['country'],
      _count: true,
      _min: { salary: true },
      _max: { salary: true },
      _avg: { salary: true },
    });

    const currencyRows = await this.client.employee.findMany({
      distinct: ['country'],
      select: { country: true, currency: true },
    });
    const currencyByCountry = new Map(currencyRows.map((c) => [c.country, c.currency]));

    const medianRows = await this.client.$queryRaw<Array<{ country: string; median: number }>>`
      SELECT country, ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY salary))::int AS median
      FROM employees
      GROUP BY country
    `;
    const medianByCountry = new Map(medianRows.map((r) => [r.country, r.median]));

    const bandRows = await this.client.$queryRaw<
      Array<{ country: string; band: string; count: bigint }>
    >`
      SELECT
        country,
        CASE
          WHEN salary < 5000000 THEN '< 50k'
          WHEN salary < 10000000 THEN '50k–100k'
          WHEN salary < 20000000 THEN '100k–200k'
          ELSE '> 200k'
        END AS band,
        COUNT(*)::bigint AS count
      FROM employees
      GROUP BY country, band
    `;

    const bandsByCountry = new Map<string, Map<string, number>>();
    for (const row of bandRows) {
      const inner = bandsByCountry.get(row.country) ?? new Map<string, number>();
      inner.set(row.band, Number(row.count));
      bandsByCountry.set(row.country, inner);
    }

    return aggregates.map((row) => {
      const inner = bandsByCountry.get(row.country) ?? new Map();
      const bands: SalaryBand[] = SALARY_BANDS.map(({ label }) => ({
        label,
        count: inner.get(label) ?? 0,
      }));
      return {
        country: row.country,
        currency: currencyByCountry.get(row.country) ?? 'USD',
        count: row._count,
        min: row._min.salary ?? 0,
        max: row._max.salary ?? 0,
        avg: Math.round(row._avg.salary ?? 0),
        median: medianByCountry.get(row.country) ?? 0,
        bands,
      };
    });
  }

  async byJobTitle(country?: string): Promise<ByJobTitleRow[]> {
    const where: Prisma.EmployeeWhereInput = country ? { country } : {};
    const rows = await this.client.employee.groupBy({
      by: ['jobTitle'],
      where,
      _count: true,
      _avg: { salary: true },
    });
    return rows.map((r) => ({
      jobTitle: r.jobTitle,
      count: r._count,
      avg: Math.round(r._avg.salary ?? 0),
    }));
  }

  async byDepartment(): Promise<ByDepartmentRow[]> {
    const rows = await this.client.employee.groupBy({
      by: ['department'],
      _count: true,
      orderBy: { _count: { department: 'desc' } },
    });
    return rows.map((r) => ({ department: r.department, count: r._count }));
  }

  async byEmploymentType(): Promise<ByEmploymentTypeRow[]> {
    const rows = await this.client.employee.groupBy({
      by: ['employmentType'],
      _count: true,
      orderBy: { _count: { employmentType: 'desc' } },
    });
    return rows.map((r) => ({ employmentType: r.employmentType, count: r._count }));
  }
}
