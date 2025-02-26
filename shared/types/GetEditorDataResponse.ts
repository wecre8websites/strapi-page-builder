import SimplifiedContentType from "./SimplifiedContentType";

type GetEditorDataResponse = {
  token: string;
  url: string;
  locales: { name: string, code: string, isDefault: boolean }[];
  contentTypes: SimplifiedContentType[];
  contentType: string;
  contentId: string;
  contentData: any;
  contentDocuments: { documentId: string, title: string }[];
  templateId: string;
  templateJson: any;
  templateDocuments: { documentId: string, shortName: string }[];
  errors: {
    licenceError: string | null;
    contentError: string | null;
  }
}

export default GetEditorDataResponse;