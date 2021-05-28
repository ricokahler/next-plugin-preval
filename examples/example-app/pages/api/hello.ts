import { NextApiHandler } from 'next';
import exampleData from '@/utils/example.preval';

const handler: NextApiHandler = (_req, res) => {
  res.status(200).json(exampleData);
};

export default handler;
