import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  // Default locale — in production this would be determined from
  // the user's preferredLanguage or Accept-Language header
  const locale = "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
