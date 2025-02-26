type SaveTemplateRequest = {
  templateId?: string,
  templateName?: string,
  templateJson?: { [key: string]: any },
  contentType: string,
  duplicateId?: string,
  locale?: string
}

export default SaveTemplateRequest;