import type {
  ByCountryRow,
  ByDepartmentRow,
  ByEmploymentTypeRow,
  ByJobTitleRow,
  InsightsRepository,
  InsightsSummary,
} from '../repositories/insights.repository.js';

export class InsightsService {
  constructor(private readonly repo: InsightsRepository) {}

  summary(): Promise<InsightsSummary> {
    return this.repo.summary();
  }

  byCountry(): Promise<ByCountryRow[]> {
    return this.repo.byCountry();
  }

  byJobTitle(country?: string): Promise<ByJobTitleRow[]> {
    return this.repo.byJobTitle(country);
  }

  byDepartment(): Promise<ByDepartmentRow[]> {
    return this.repo.byDepartment();
  }

  byEmploymentType(): Promise<ByEmploymentTypeRow[]> {
    return this.repo.byEmploymentType();
  }
}
