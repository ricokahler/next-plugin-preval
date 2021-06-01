import preval from 'next-plugin-preval';

async function getDataViaFetch() {
  const response = await fetch('https://example.com');
  const html = await response.text();

  return { html };
}

export default preval(getDataViaFetch());
