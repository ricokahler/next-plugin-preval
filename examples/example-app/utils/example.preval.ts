import preval from 'next-plugin-preval';

async function getData() {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { data: 'hello_world' };
}

export default preval(getData());
