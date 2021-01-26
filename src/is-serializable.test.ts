import isSerializable from './is-serializable';

describe('isSerializable', () => {
  it('throws if it finds a circular reference', () => {
    const ref = {};

    Object.defineProperty(ref, 'self', {
      enumerable: true,
      get: () => ref,
    });

    expect(() => isSerializable('filename.ts', ref))
      .toThrowErrorMatchingInlineSnapshot(`
      "Error serializing \`.self\` returned from \`preval\` in \\"filename.ts\\".
      Reason: Circular references cannot be expressed in JSON (references: \`(self)\`)."
    `);
  });

  it('throws if it finds undefined', () => {
    const data = { foo: undefined };

    expect(() => isSerializable('filename.ts', data))
      .toThrowErrorMatchingInlineSnapshot(`
      "Error serializing \`.foo\` returned from \`preval\` in \\"filename.ts\\".
      Reason: \`undefined\` cannot be serialized as JSON. Please use \`null\` or omit this value."
    `);
  });

  it('throws serializing complex identifiers', () => {
    const data = {
      arr: [{ 'foo!': undefined }],
    };

    expect(() => isSerializable('filename.ts', data))
      .toThrowErrorMatchingInlineSnapshot(`
      "Error serializing \`.arr[0][\\"foo!\\"]\` returned from \`preval\` in \\"filename.ts\\".
      Reason: \`undefined\` cannot be serialized as JSON. Please use \`null\` or omit this value."
    `);
  });

  it('works with nested objects', () => {
    const data = {
      arr: [{ foo: { bar: [{ test: 'hey' }] } }],
    };

    expect(isSerializable('filename.ts', data)).toBe(true);
  });

  it('throws if it finds an unsupported types', () => {
    const data = { foo: Symbol() };

    expect(() => isSerializable('filename.ts', data))
      .toThrowErrorMatchingInlineSnapshot(`
      "Error serializing \`.foo\` returned from \`preval\` in \\"filename.ts\\".
      Reason: \`symbol\` cannot be serialized as JSON. Please only return JSON serializable data types."
    `);
  });

  test.todo('invariant: Unknown error encountered in Object.');
  test.todo('invariant: Unknown error encountered in Array.');
});
