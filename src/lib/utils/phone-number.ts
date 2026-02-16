/**
 * Formats a phone number into a displayable format.
 *
 * @param countryCode - The country code of the phone number (including "+" symbol).
 * @param phoneNumber - The phone number to format with or without country code.
 *
 * @returns Phone number formatted (e.g., "+1 (555) 555-5555").
 */
export function formatPhoneNumber(countryCode: string, phoneNumber: string) {
  if (!countryCode.startsWith('+'))
    throw new Error(
      'Invalid country code. Please ensure "+" symbol is included.',
    );

  let formattedPhoneNumber = '';

  if (phoneNumber.startsWith(countryCode)) {
    if (phoneNumber.length !== 10 + countryCode.length)
      throw new Error('Invalid phone number length.');
    formattedPhoneNumber = `${countryCode} (${phoneNumber.substring(0 + countryCode.length, 3 + countryCode.length)}) ${phoneNumber.substring(3 + countryCode.length, 6 + countryCode.length)}-${phoneNumber.substring(6 + countryCode.length, 10 + countryCode.length)}`;
  } else {
    if (phoneNumber.length !== 10)
      throw new Error('Invalid phone number length.');
    formattedPhoneNumber = `${countryCode} (${phoneNumber.substring(0, 3)}) ${phoneNumber.substring(3, 6)}-${phoneNumber.substring(6, 10)}`;
  }

  return formattedPhoneNumber;
}
