import LICENCE_SERVER from "./licenceServer";

const saveLicenceSettings = async (apiKey: string, url: string) => {
  const licenceResponse = await fetch(`${LICENCE_SERVER}/cms`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ web_url: url })
  });
  const response = await licenceResponse.json() as { success: boolean, error: string | null };
  if (licenceResponse.status < 200 || licenceResponse.status >= 300) {
    console.error(`[Strapi Page Builder] Licence Server Error`, { responseError: response.error, licenceResponseStatusText: licenceResponse.statusText });
    throw new Error(response.error || licenceResponse.statusText || "Unauthorized");
  }
  return response
}

export default saveLicenceSettings;