const deepReplace = (parent: { [key: string]: any }, child: { [key: string]: any }) => {
  let newChild = { ...parent };
  for (const key in newChild) {
    if (newChild?.[key] && typeof newChild?.[key] === 'object' && child?.[key]) {
      deepReplace(newChild[key], child[key]);
    } else {
      if (newChild?.[key] && typeof newChild?.[key] === 'string' && child?.[key]) {
        newChild[key] = child[key];
      }
    }
  }
  return newChild;
}

export default deepReplace;