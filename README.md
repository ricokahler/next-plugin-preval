# next-plugin-preval · [![codecov](https://codecov.io/gh/ricokahler/next-plugin-preval/branch/alpha/graph/badge.svg?token=ZMYB4EW4SH)](https://codecov.io/gh/ricokahler/next-plugin-preval) [![github status checks](https://badgen.net/github/checks/ricokahler/next-plugin-preval/alpha)](https://github.com/ricokahler/next-plugin-preval/actions)

> Pre-evaluate async functions during builds and import them like JSON

## Installation

### Install

```
yarn add next-plugin-preval
```

or

```
npm i next-plugin-preval
```

### Add to next.config.js

```js
const createNextPluginPreval = require('next-plugin-preval/config');
const withNextPluginPreval = createNextPluginPreval();

module.exports = withNextPluginPreval(/* optionally add a next.js config */);
```

## Usage

Create a file with the extension `.preval.ts` or `preval.js`.

```js
// my-data.preval.js
import preval from 'next-plugin-preval';

async function getData() {
  return { hello: 'world'; }
}

export default preval(getData());
```

Then import that file anywhere:

```js
import myData from './my-data.preval';

function Component() {
  return (
    <div>
      <pre>{JSON.stringify(myData, null, 2)}</pre>
    </div>
  );
}

export default Component;
```

## Important notes

This works via a webpack loader that take your code, compiles it, and runs it inside of Node.js.

- Since this is an optimization at the bundler level, it will not update with Next.js [preview mode](https://nextjs.org/docs/advanced-features/preview-mode) or even during dynamic SSR. Once this data is generated during the initial build, it can't change. It's similar to importing JSON.
- Because this plugin runs code directly in Node.js, code is not executed in a typical Next.js server context. This means certain injections Next.js does at the bundler level will not be available. For most data queries this shouldn't cause any different. Feel free to [open an issue](https://github.com/ricokahler/next-plugin-preval/issues/new) if something seems off.
- **⚠️ Environment variables in this context do not respect the `NEXT_PUBLIC_` convention.** If you import a preval'ed file into your frontend build, you could be importing a secret. This is rare because you'd have to include the secret in the data you're returning but it's important to be aware of.
