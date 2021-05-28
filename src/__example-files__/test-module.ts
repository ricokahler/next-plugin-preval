async function testDependencyModule(): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 0));

  return 'hello';
}

export default testDependencyModule;
