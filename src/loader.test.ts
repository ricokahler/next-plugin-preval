import loader, { _prevalLoader } from './loader';

// silences the console.error
declare namespace global {
  const console: Console & { error: jest.Mock };
}

beforeEach(() => {
  jest.spyOn(console, 'error');
  global.console.error.mockImplementation(() => {});
});

afterEach(() => {
  global.console.error.mockRestore();
});

describe('_prevalLoader', () => {
  it('takes in code as a string and pre-evaluates it into JSON', async () => {
    const result = await _prevalLoader(
      '',
      require.resolve('./__example-files__/simple.preval.ts'),
      {}
    );

    expect(result).toBe(
      'module.exports = JSON.parse("{\\"hello\\":\\"world\\"}")'
    );
  });

  it('compiles itself and dependencies according to the available babel config', async () => {
    const result = await _prevalLoader(
      '',
      require.resolve('./__example-files__/deps.preval.ts'),
      {}
    );

    expect(result).toBe(
      'module.exports = JSON.parse("{\\"hello\\":\\"world\\"}")'
    );
  });

  it('works with tsconfig paths', async () => {
    const result = await _prevalLoader(
      '',
      require.resolve('./__example-files__/tsconfig-paths.preval.ts'),
      {}
    );

    expect(result).toBe(
      'module.exports = JSON.parse("{\\"hello\\":\\"world\\"}")'
    );
  });

  it('throws if an invalid JSON object is returned', async () => {
    let caught = false;
    try {
      await _prevalLoader(
        '',
        require.resolve('./__example-files__/invalid-json.preval.ts'),
        {}
      );
    } catch (e) {
      caught = true;
      expect(e.message.replace(/"[^"]+"/g, '"FILENAME"')).toBe(
        'Error serializing `.data.hello` returned from `preval` in "FILENAME".\nReason: `undefined` cannot be serialized as JSON. Please use `null` or omit this value.'
      );
    }

    expect(caught).toBe(true);
  });

  it('throws if no default export was found', async () => {
    let caught = false;
    try {
      await _prevalLoader(
        '',
        require.resolve('./__example-files__/no-default-export.preval.ts'),
        {}
      );
    } catch (e) {
      caught = true;
      expect(e.message.replace(/"[^"]+"/g, '"FILENAME"')).toBe(
        'Failed to pre-evaluate "FILENAME". Error: No default export. Did you forget to `export default`? See above for full stack trace.'
      );
    }

    expect(caught).toBe(true);
  });

  it('correctly propagates the stack trace', async () => {
    let caught = false;
    try {
      await _prevalLoader(
        '',
        require.resolve('./__example-files__/throws-indirect.preval.ts'),
        {}
      );
    } catch (e) {
      caught = true;
      expect(e.message.replace(/"[^"]+"/g, '"FILENAME"')).toBe(
        'Failed to pre-evaluate "FILENAME". Error: TAKE IT EASY See above for full stack trace.'
      );
      expect(global.console.error).toHaveBeenCalledTimes(1);

      // prove that the stack trace is there
      const stackTraceErrorMessage = global.console.error.mock.calls[0][1];
      expect(stackTraceErrorMessage.includes('functionThatThrows')).toBe(true);
      expect(stackTraceErrorMessage.includes('function-that-throws')).toBe(
        true
      );
    }

    expect(caught).toBe(true);
  });

  it("polyfills fetch (and others) via require('next')", async () => {
    const result = await _prevalLoader(
      '',
      require.resolve('./__example-files__/uses-fetch.preval.ts'),
      {}
    );

    expect(result.includes('Example Domain')).toBe(true);
  });
});

describe('loader', () => {
  it('throws if async is not available', () => {
    let caught = false;
    try {
      loader.call({ async: () => null, cacheable: () => {} });
    } catch (e) {
      caught = true;
      expect(e.message).toBe(
        'Async was not supported by webpack. Please open an issue in next-plugin-preval.'
      );
    }

    expect(caught).toBe(true);
  });

  it('calls the callback with the result if successful', (done) => {
    const callback = (err, result) => {
      expect(err).toBe(null);
      expect(result).toBe(
        'module.exports = JSON.parse("{\\"hello\\":\\"world\\"}")'
      );
      done();
    };

    loader.call(
      {
        async: () => callback,
        cacheable: () => {},
        resourcePath: require.resolve('./__example-files__/simple.preval.ts'),
      },
      ''
    );
  });

  it('calls the callback an error if unsuccessful', (done) => {
    const callback = (err) => {
      expect(err.message.replace(/"[^"]+"/g, '"FILENAME"')).toBe(
        'Failed to pre-evaluate "FILENAME". Error: WHOA THERE! See above for full stack trace.'
      );
      expect(global.console.error).toHaveBeenCalledTimes(1);
      expect(global.console.error.mock.calls[0][0]).toBe(
        '[next-plugin-preval]'
      );
      done();
    };

    loader.call(
      {
        async: () => callback,
        resource: 'test-resource',
        cacheable: () => {},
        resourcePath: require.resolve('./__example-files__/throws.preval.ts'),
      },
      ''
    );
  });
});
