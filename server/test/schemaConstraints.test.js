import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractSchemaConstraints, MAX_SCHEMA_CONSTRAINTS } from '../utils/schemaConstraints.js';

describe('bounded schema constraints', () => {
  it('derives readable required/type/format/range/enum defaults', () => {
    const schema = {
      type: 'object',
      required: ['name', 'limit'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 40, example: 'Miso' },
        email: { type: 'string', format: 'email' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
        status: { type: 'string', enum: ['open', 'closed', 'archived'] },
        nested: {
          type: 'object',
          properties: { tag: { type: 'string', description: 'A short label' } }
        }
      }
    };
    const lines = extractSchemaConstraints(schema);
    assert.match(lines[0], /body required fields: name, limit/);
    assert.ok(lines.some((line) => /body\.name: string, minLength 2, maxLength 40, example Miso/.test(line)));
    assert.ok(lines.some((line) => /body\.email: string, format email/.test(line)));
    assert.ok(lines.some((line) => /body\.limit: integer, min 1, max 100, default 10/.test(line)));
    assert.ok(lines.some((line) => /enum open, closed, archived/.test(line)));
    assert.ok(lines.some((line) => /body\.nested\.tag: string, A short label/.test(line)));
    assert.deepEqual(schema.properties.name.example, 'Miso', 'input is not mutated');
  });

  it('caps output at 20 constraints and notes truncation', () => {
    const schema = {
      type: 'object',
      properties: Object.fromEntries(
        Array.from({ length: 40 }, (_, i) => [`field${i}`, { type: 'string', minLength: i }])
      )
    };
    const lines = extractSchemaConstraints(schema);
    assert.equal(lines.length, MAX_SCHEMA_CONSTRAINTS);
    assert.match(lines[lines.length - 1], /further constraints omitted/);
    assert.equal(extractSchemaConstraints(schema, { maxConstraints: 3 }).length, 3);
    assert.equal(extractSchemaConstraints(schema, { maxConstraints: 999 }).length, MAX_SCHEMA_CONSTRAINTS);
  });

  it('never emits sensitive example values and tolerates malformed input', () => {
    const lines = extractSchemaConstraints({
      type: 'object',
      properties: {
        password: { type: 'string', example: 'super-secret', default: 'super-secret' },
        apiKey: { type: 'string', example: 'tok-123' },
        safe: { type: 'string', example: 'visible-value' }
      }
    });
    assert.equal(lines.some((line) => line.includes('super-secret') || line.includes('tok-123')), false);
    assert.ok(lines.some((line) => line.includes('visible-value')));
    assert.deepEqual(extractSchemaConstraints(null), []);
    assert.deepEqual(extractSchemaConstraints('not a schema'), []);
  });
});
