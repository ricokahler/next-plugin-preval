import dependentModule from '@/test-module';
import preval from 'next-plugin-preval';

const getPrevalData = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));

  const world: string = 'world';
  const result = await dependentModule();

  return { [result]: world };
};

export default preval(getPrevalData());
