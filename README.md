# next-plugin-preval · [![codecov](https://codecov.io/gh/ricokahler/next-plugin-preval/branch/alpha/graph/badge.svg?token=ZMYB4EW4SH)](https://codecov.io/gh/ricokahler/next-plugin-preval) [![github status checks](https://badgen.net/github/checks/ricokahler/next-plugin-preval/alpha)](https://github.com/ricokahler/next-plugin-preval/actions)

> Pre-evaluate async functions (for data fetches) at build time and import them like JSON

## Why?

The primary mechanism Next.js provides for static data is `getStaticProps` — which is a great feature and is the right tool for many use cases. However, there are other use cases for static data that are not covered by `getStaticProps`.

- **Site-wide data**: if you have static data that's required across many different pages, `getStaticProps` is a somewhat awkward mechanism because for each new page, you'll have to re-fetch that same static data. For example, if you use `getStaticProps` to fetch content for your header, that data will be re-fetched on every page change.
- **Static data for API routes**: It's useful to pre-evaluate data fetches in API routes to speed up response times and offload work from your database. `getStaticProps` does not work for API routes while `next-plugin-preval` does.
- **De-duped and code split data**: Since `next-plugin-preval` behaves like importing JSON, you can leverage the optimizations bundlers have for importing standard static assets. This includes standard code-splitting and de-duping.

See the [recipes](#recipes) for concrete examples.

## Installation

### Install

```
# Note: you must install using the `alpha` tag
yarn add next-plugin-preval@alpha
```

or

```
# Note: you must install using the `alpha` tag
npm i next-plugin-preval@alpha
```

### Add to next.config.js

```js
// next.config.js
const createNextPluginPreval = require('next-plugin-preval/config');
const withNextPluginPreval = createNextPluginPreval();

module.exports = withNextPluginPreval(/* optionally add a next.js config */);
```

## Usage

Create a file with the extension `.preval.ts` or `.preval.js`.

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
// component.js (or any file)
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

This works via a webpack loader that takes your code, compiles it, and runs it inside of Node.js.

- Since this is an optimization at the bundler level, it will not update with Next.js [preview mode](https://nextjs.org/docs/advanced-features/preview-mode) or even during dynamic SSR. Once this data is generated during the initial build, it can't change. It's like importing JSON.
- Because this plugin runs code directly in Node.js, code is not executed in the typical Next.js server context. This means certain injections Next.js does at the bundler level will not be available. For most data queries this shouldn't make a difference. Feel free to [open an issue](https://github.com/ricokahler/next-plugin-preval/issues/new) if something seems off.

## Recipes

### Site-wide data: Shared header

```js
// header-data.preval.js
import preval from 'next-plugin-preval';
import db from 'your-db';

async function getHeaderData() {
  const headerData = await db.query(/* query for header data */);

  return headerData;
}

export default preval(getHeaderData());
```

```js
// header.js
import headerData from './header-data.preval';
const { title } = headerData;

function Header() {
  return <header>{title}</header>;
}

export default Header;
```

### Static data for API routes: Pre-evaluated listings

```js
// products.preval.js
import preval from 'next-plugin-preval';
import db from 'your-db';

async function getProducts() {
  const products = await db.query(/* query for products */);

  // create a hash-map for O(1) lookups
  return products.reduce((productsById, product) => {
    productsById[product.id] = product;
    return productsById;
  }, {});
}

export default preval(getProducts());
```

```js
// /pages/api/products/[id].js
import productsById from '../products.preval.js';

const handler = (req, res) => {
  const { id } = req.params;

  const product = productsById[id];

  if (!product) {
    res.status(404).end();
    return;
  }

  res.json(product);
};

export default handler;
```

### Code-split static data: Loading non-critical data

```js
// states.preval.js
import preval from 'next-plugin-preval';
import db from 'your-db';

async function getAvailableStates() {
  const states = await db.query(/* query for states */);
  return states;
}

export default preval(getAvailableStates());
```

```js
// state-picker.js
import { useState, useEffect } from 'react';

function StatePicker({ value, onChange }) {
  const [states, setStates] = useState([]);

  useEffect(() => {
    // ES6 dynamic import
    import('./states.preval').then((response) => setStates(response.default));
  }, []);

  if (!states.length) {
    return <div>Loading…</div>;
  }

  return (
    <select value={value} onChange={onChange}>
      {states.map(({ label, value }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
```
