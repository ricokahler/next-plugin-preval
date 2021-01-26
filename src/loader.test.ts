import loader, { _prevalLoader } from './loader';

describe('_prevalLoader', () => {
  it('takes in code as a string and pre-evaluates it into JSON', async () => {
    const result = await _prevalLoader(
      `
        import preval from 'next-plugin-preval';

        export const getPrevalData = async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));

          return { hello: 'world' };
        }

        export default preval(getPrevalData());
      `,
      '',
      {}
    );

    expect(result).toMatchInlineSnapshot(
      `"module.exports = JSON.parse('{\\"hello\\":\\"world\\"}')"`
    );
  });

  it('compiles itself and dependencies according to the available babel config', async () => {
    const result = await _prevalLoader(
      `
        import dependentModule from './test-module';
        import preval from 'next-plugin-preval';

        async function getData() {
          await new Promise((resolve) => setTimeout(resolve, 0));

          const world: string = 'world';
          const result = await dependentModule();

          return { [result]: world };
        }

        export default preval(getData());
      `,
      `${__dirname}/example.ts`,
      {}
    );

    expect(result).toMatchInlineSnapshot(
      `"module.exports = JSON.parse('{\\"hello\\":\\"world\\"}')"`
    );
  });

  it('works with tsconfig paths', async () => {
    const result = await _prevalLoader(
      `
        import dependentModule from '@/test-module';
        import preval from 'next-plugin-preval';

        const getPrevalData = async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));

          const world: string = 'world';
          const result = await dependentModule();

          return { [result]: world };
        }

        export default preval(getPrevalData());
      `,
      `${__dirname}/example.ts`,
      {}
    );

    expect(result).toMatchInlineSnapshot(
      `"module.exports = JSON.parse('{\\"hello\\":\\"world\\"}')"`
    );
  });

  it('throws if an invalid JSON object is returned', async () => {
    let caught = false;
    try {
      await _prevalLoader(
        `
          import preval from 'next-plugin-preval';
          
          const getPrevalData = async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
  
            return { data: { hello: undefined } };
          }

          export default preval(getPrevalData());
        `,
        `${__dirname}/example.ts`,
        {}
      );
    } catch (e) {
      caught = true;
      expect(e.message.replace(/"[^"]+"/g, '"FILENAME"'))
        .toMatchInlineSnapshot(`
        "Error serializing \`.data.hello\` returned from \`preval\` in \\"FILENAME\\".
        Reason: \`undefined\` cannot be serialized as JSON. Please use \`null\` or omit this value."
      `);
    }

    expect(caught).toBe(true);
  });

  it('throws if no default export was found', async () => {
    let caught = false;
    try {
      await _prevalLoader(
        `
          export const getPrevalData = async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
  
            return { data: { hello: undefined } };
          }
        `,
        `${__dirname}/example.ts`,
        {}
      );
    } catch (e) {
      caught = true;
      expect(e.message.replace(/"[^"]+"/g, '"FILENAME"')).toMatchInlineSnapshot(
        `"Failed to pre-evaluate \\"FILENAME\\". Error: No default export. Did you forget to \`export default\`?"`
      );
    }

    expect(caught).toBe(true);
  });
});

describe('loader', () => {
  it('throws if async is not available', () => {
    expect(() => {
      loader.call({ async: () => null });
    }).toThrowErrorMatchingInlineSnapshot(`"Async was not supported."`);
  });

  it('calls the callback with the result if successful', (done) => {
    const callback = (err: Error, result: string) => {
      expect(err).toBe(null);
      expect(result).toMatchInlineSnapshot(
        `"module.exports = JSON.parse('{\\"hello\\":\\"world\\"}')"`
      );
      done();
    };

    loader.call(
      { async: () => callback },
      `
        import preval from 'next-plugin-preval';

        const getData = () => ({ hello: 'world' });

        export default preval(getData());
      `
    );
  });

  it('calls the callback an error if unsuccessful', (done) => {
    const callback = (err: Error) => {
      expect(err).toMatchInlineSnapshot(
        `[Error: Failed to pre-evaluate "test-resource". Error: test error]`
      );
      done();
    };

    loader.call(
      { async: () => callback, resource: 'test-resource' },
      `
        import preval from 'next-plugin-preval';

        const getData = () => {
          throw new Error('test error');
        };

        export default preval(getData());
      `
    );
  });
});
