import Fastify, { type FastifyInstance } from 'fastify';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { InternalServiceError } from '../../src/clients/internal.js';
import { runCalculation } from '../../src/routes/calculations.js';
import type { ValuationParamsRow } from '../../src/repos/params.js';
import type { ValuationRow } from '../../src/repos/valuations.js';

/**
 * The engine refuses, and the failed run cannot be written down.
 *
 * `runCalculation` records a refused compute as a `failed` calculation and
 * rethrows the engine's error for the caller to map. That record is
 * bookkeeping about the failure — and the outage that fails an engine call is
 * the same one that exhausts the pool. When the write could not land, its
 * error replaced the engine's: the route answered with a generic "run it again
 * in a few minutes" instead of which input was refused, and the auto-pipeline
 * classified a database fault where an upstream refusal had happened.
 */
describe('a refused calculation whose failure cannot be recorded', () => {
  let engine: FastifyInstance;
  let engineUrl: string;

  beforeAll(async () => {
    engine = Fastify({ logger: false });
    engine.post('/engine/v1/compute', async (_req, reply) =>
      reply.status(422).send({ detail: 'income.discount_rate must exceed terminal_growth' }),
    );
    await engine.listen({ port: 0, host: '127.0.0.1' });
    const address = engine.server.address();
    engineUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  });

  afterAll(async () => {
    await engine?.close();
  });

  it("rethrows the engine's error, not the database's, and reports the lost record", async () => {
    const unreachable = new Error('timeout exceeded when trying to connect');
    const pool = {
      connect: () => Promise.reject(unreachable),
      query: () => Promise.reject(unreachable),
    } as unknown as pg.Pool;
    const log = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };

    const thrown = await runCalculation(
      { pool, engineUrl },
      {
        valuation: { id: '01HZZZZZZZZZZZZZZZZZZZZZZZ' } as ValuationRow,
        paramsRow: {} as ValuationParamsRow,
        inputs: {},
        createdBy: 'ops-user',
        actor: { actorType: 'human', actorId: 'ops-user', source: 'api' },
        log: log as never,
      },
    ).catch((err: unknown) => err);

    expect(thrown).toBeInstanceOf(InternalServiceError);
    expect((thrown as InternalServiceError).status).toBe(422);
    const logged = [...log.warn.mock.calls, ...log.error.mock.calls].map((c) => JSON.stringify(c));
    expect(logged.some((line) => line.includes('could not be recorded'))).toBe(true);
  });
});
