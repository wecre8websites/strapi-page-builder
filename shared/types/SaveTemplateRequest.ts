import { PBConfig } from "./FieldTypes";

type SaveTemplateRequest = {
  templateId?: string,
  templateName?: string,
  templateJson?: { [key: string]: any },
  config?: PBConfig,
  contentType: string,
  duplicateId?: string,
  locale?: string
}

export default SaveTemplateRequest;