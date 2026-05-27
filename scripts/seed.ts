import { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import bcryptjs from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { config } from '../src/config/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';

type CountryProfile = {
  code: string;
  currency: string;
  avgSalaryMajor: number; // typical avg salary in major units of the local currency
};

const COUNTRIES: CountryProfile[] = [
  { code: 'US', currency: 'USD', avgSalaryMajor: 150_000 },
  { code: 'UK', currency: 'GBP', avgSalaryMajor: 90_000 },
  { code: 'IN', currency: 'INR', avgSalaryMajor: 1_500_000 },
  { code: 'DE', currency: 'EUR', avgSalaryMajor: 80_000 },
  { code: 'FR', currency: 'EUR', avgSalaryMajor: 75_000 },
  { code: 'CA', currency: 'CAD', avgSalaryMajor: 100_000 },
  { code: 'AU', currency: 'AUD', avgSalaryMajor: 110_000 },
  { code: 'JP', currency: 'JPY', avgSalaryMajor: 6_000_000 },
  { code: 'BR', currency: 'BRL', avgSalaryMajor: 120_000 },
  { code: 'SG', currency: 'SGD', avgSalaryMajor: 110_000 },
];

const JOB_TITLES = ['Engineer', 'Senior Engineer', 'Manager', 'Director', 'Analyst', 'Designer'];
const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Sales',
  'Marketing',
  'Operations',
  'Finance',
  'People',
];
const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACTOR'];
const EMPLOYMENT_TYPE_WEIGHTS = [0.85, 0.1, 0.05]; // FULL_TIME dominant

function pickWeighted<T>(items: T[], weights: number[], rand: () => number): T {
  const r = rand();
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i] ?? 0;
    if (r < acc) return items[i] as T;
  }
  return items[items.length - 1] as T;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

async function readNames(file: string): Promise<string[]> {
  const path = resolve(__dirname, file);
  const text = await fs.readFile(path, 'utf-8');
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type EmployeeRow = {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: string;
  currency: string;
  salary: number;
  employmentType: EmploymentType;
  hireDate: string; // ISO date for COPY
  createdAt: string;
  updatedAt: string;
};

function generateEmployees(
  count: number,
  firstNames: string[],
  lastNames: string[],
): EmployeeRow[] {
  const rand = seededRandom(42);
  const now = new Date().toISOString();
  const employees: EmployeeRow[] = [];

  for (let i = 0; i < count; i++) {
    const country = COUNTRIES[i % COUNTRIES.length] as CountryProfile;
    const first = firstNames[Math.floor(rand() * firstNames.length)] as string;
    const last = lastNames[Math.floor(rand() * lastNames.length)] as string;
    const variation = 0.6 + rand() * 0.8; // 0.6× to 1.4×
    const salaryMajor = Math.round(country.avgSalaryMajor * variation);

    const hireYear = 2018 + Math.floor(rand() * 7);
    const hireMonth = 1 + Math.floor(rand() * 12);
    const hireDay = 1 + Math.floor(rand() * 28);
    const hireDate = `${hireYear}-${String(hireMonth).padStart(2, '0')}-${String(hireDay).padStart(2, '0')}`;

    employees.push({
      id: randomUUID(),
      fullName: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${i + 1}@corp.example`,
      jobTitle: JOB_TITLES[Math.floor(rand() * JOB_TITLES.length)] as string,
      department: DEPARTMENTS[Math.floor(rand() * DEPARTMENTS.length)] as string,
      country: country.code,
      currency: country.currency,
      salary: salaryMajor * 100, // minor units
      employmentType: pickWeighted(EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_WEIGHTS, rand),
      hireDate,
      createdAt: now,
      updatedAt: now,
    });
  }

  return employees;
}

function escapeCopyValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function rowToCopyLine(row: EmployeeRow): string {
  const cols = [
    row.id,
    escapeCopyValue(row.fullName),
    row.email,
    escapeCopyValue(row.jobTitle),
    escapeCopyValue(row.department),
    row.country,
    row.currency,
    String(row.salary),
    row.employmentType,
    row.hireDate,
    row.createdAt,
    row.updatedAt,
  ];
  return cols.join('\t') + '\n';
}

async function seedHRUser(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcryptjs.hash(config.seed.hrPassword, 10);
    await prisma.hRUser.upsert({
      where: { email: config.seed.hrEmail },
      update: { passwordHash, name: config.seed.hrName },
      create: {
        email: config.seed.hrEmail,
        passwordHash,
        name: config.seed.hrName,
      },
    });
    console.warn(`HR user upserted: ${config.seed.hrEmail}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedEmployees(count: number): Promise<void> {
  const [firstNames, lastNames] = await Promise.all([
    readNames('first_names.txt'),
    readNames('last_names.txt'),
  ]);

  const employees = generateEmployees(count, firstNames, lastNames);

  const client = new Client({ connectionString: config.databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE employees RESTART IDENTITY CASCADE');

    const stream = client.query(
      copyFrom(
        `COPY employees (id, "fullName", email, "jobTitle", department, country, currency, salary, "employmentType", "hireDate", "createdAt", "updatedAt") FROM STDIN WITH (FORMAT text)`,
      ),
    );

    const readable = Readable.from(
      (function* () {
        for (const row of employees) yield rowToCopyLine(row);
      })(),
    );

    await pipeline(readable, stream);
    await client.query('COMMIT');
    console.warn(`Seeded ${count} employees`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

async function main() {
  const count = Number(process.env.SEED_COUNT) || 10_000;
  const start = Date.now();
  await seedHRUser();
  await seedEmployees(count);
  console.warn(`Done in ${Date.now() - start}ms`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
