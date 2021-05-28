import preval from 'next-plugin-preval';

async function getData() {
  throw new Error('WHOA THERE!');
}

export default preval(getData());
