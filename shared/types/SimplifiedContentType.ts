type SimplifiedContentType = {
  uid: string;
  globalId: string;
  source: string;
  kind: string;
  attributes: {
    [key: string]: {
      type: string;
      localized: boolean;
    }
  };
  templateDocuments: {
    documentId: string;
    shortName: string;
  }[];
}

export default SimplifiedContentType;