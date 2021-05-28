import preval from 'next-plugin-preval';
import functionThatThrows from './function-that-throws';

async function throwsIndirect() {
  await new Promise((resolve) => setTimeout(resolve, 100));
  functionThatThrows();

  return { data: 'never_should_return' };
}

export default preval(throwsIndirect());
