import preval from 'next-plugin-preval';

export const getPrevalData = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));

  return { hello: 'world' };
};

export default preval(getPrevalData());
