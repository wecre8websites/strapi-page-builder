import LICENCE_SERVER from "./licenceServer";

const saveLicenceSettings = async (apiKey: string, url: string) => {
  const licenceResponse = await fetch(LICENCE_SERVER, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  });
  if (licenceResponse.status < 200 || licenceResponse.status >= 300)
    throw new Error(licenceResponse.statusText || "Unauthorized");
  return await licenceResponse.json() as { success: boolean, error: string | null };
}

export default saveLicenceSettings;