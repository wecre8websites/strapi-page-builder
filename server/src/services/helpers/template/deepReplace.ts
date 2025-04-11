const deepReplace = (parent: { [key: string]: any } | { [key: string]: any }[], child: { [key: string]: any } | { [key: string]: any }[]) => {
  let newChild = { ...parent };
  for (const key in newChild) {
    if (newChild?.[key] && child?.[key]) {
      if (typeof newChild?.[key] === 'object' && !Array.isArray(newChild?.[key])) {
        newChild[key] = deepReplace(newChild[key], child[key]);
      } else if(typeof newChild?.[key] === 'object' && !!Array.isArray(newChild?.[key])){
        newChild[key] = child[key].map((childItem: any) => {
          const parentItem = newChild[key].find((parentItem: any) => parentItem.id === childItem.id);
          if (parentItem) {
            return deepReplace(parentItem, childItem);
          }
          return childItem;
        });
      } else {
        if (newChild?.[key] && typeof newChild?.[key] === 'string' && child?.[key]) {
          newChild[key] = child[key];
        }
      }
    }
  }
  return newChild;
}


export default deepReplace;