// import { SearchResponse } from './outline-yext-types';

export function formatPhone(phoneNumber: string): string | null {
  if (!phoneNumber) {
    return null;
  }
  const countryCode = phoneNumber.slice(0, 2);
  const counterNumber = phoneNumber.length;

  const groups = [
    phoneNumber.slice(counterNumber - 10, counterNumber - 7),
    phoneNumber.slice(counterNumber - 7, counterNumber - 4),
    phoneNumber.slice(counterNumber - 4, counterNumber),
  ];
  const formattedPhoneNumber = `${countryCode} ${groups.join('.')}`;
  return formattedPhoneNumber;
}
// // // deleteDuplicateDoctor ensures that the resulting results from Yext contains
// // // only unique doctors based on the npi property
// // // by leveraging a Set to track and filter out duplicates.
// // export function deleteDuplicateProfiles(jsonResponse: {
// //   meta: {};
// //   response: verticalSearchResponseStructure;
// // }) {
// //   // Create a Set to store unique NPI values
// //   const uniqueNPI = new Set<string>();

// //   // Filter the results array to remove duplicate profiles based on NPI values
// //   // Update the results array with the filtered results
// //   jsonResponse.response.results = jsonResponse.response.results.filter(
// //     (obj) => !uniqueNPI.has(obj.data.npi) && uniqueNPI.add(obj.data.npi)
// //   );
// //   // Return the modified jsonResponse
// //   return jsonResponse;
// // }

// export function deleteDuplicateProfilesEntities(
//   response: verticalSearchResponseStructure
// ) {
//   // Create a Set to store unique NPI values
//   const uniqueNPI = new Set<string>();

//   // Filter the results array to remove duplicate profiles based on NPI values
//   // Update the results array with the filtered results
//   response.entities = response.entities.filter(
//     (obj) => !uniqueNPI.has(obj.npi) && uniqueNPI.add(obj.npi)
//   );
//   // Return the modified jsonResponse
//   return response;
// }

export function addTargetBlankToAnchorTags(text: string): string {
  // Use a regular expression to find and modify <a> tags
  const regex = /<a\b([^>]*)>/g;
  // Replace the matches by adding target="_blank" and rel="noopener noreferrer" to the href attribute
  const modifiedText = text.replace(regex, (match, group1) => {
    let newTag = match;
    if (!group1.includes('target=')) {
      newTag = newTag.replace('>', ' target="_blank">');
    }
    if (!group1.includes('rel=')) {
      newTag = newTag.replace('>', ' rel="noopener noreferrer">');
    }
    return newTag;
  });
  return modifiedText;
}
