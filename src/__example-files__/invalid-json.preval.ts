import preval from 'next-plugin-preval';

const getPrevalData = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));

  return { data: { hello: undefined } };
};

export default preval(getPrevalData());
