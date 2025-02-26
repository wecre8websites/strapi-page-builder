type StrapiImageFormat = {
  "name": string,
  "hash": string,
  "ext": string,
  "mime": string,
  "path": string | null,
  "width": number,
  "height": number,
  "size": number,
  "sizeInBytes": number,
  "url": string
}

type StrapiImage = {
  "id": number,
  "documentId": string,
  "name": string
  "alternativeText": string | null,
  "caption": string | null,
  "width": number,
  "height": number,
  "formats": {
    "thumbnail"?: StrapiImageFormat,
    "small"?: StrapiImageFormat,
    "medium"?: StrapiImageFormat,
    "large"?: StrapiImageFormat
  },
  "hash": string,
  "ext": string,
  "mime": string,
  "size": number,
  "url": string,
  "previewUrl": string | null,
  "provider": string,
  "provider_metadata": any,
  "folderPath": string,
  "createdAt": string,
  "updatedAt": string,
  "publishedAt": string,
  "locale": string | null,
  "folder": string | null,
  "isUrlSigned": boolean
}

type StrapiPagination = {
  "page": number,
  "pageSize": number,
  "pageCount": number,
  "total": number
}

type StrapiImageResponse = {
  results: StrapiImage[],
  pagination: StrapiPagination
}

export default StrapiImageResponse;