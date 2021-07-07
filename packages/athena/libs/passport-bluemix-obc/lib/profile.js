/**
 * Parse IBM Profile
 */
exports.parse = function(json) {
  if ('string' == typeof json) {
    json = JSON.parse(json);
  }
  var profile = {};

  profile.name = { name: json.name,
                   firstname: json.firstname,
                   lastname: json.lastname };
  
  profile.email = json.email;
  profile.userRealm = json.userRealm;
  profile.userDisplayName = json.userDisplayName;
  profile.userUniqueID = json.userUniqueID;
  profile.authentication_level = json.AUTHENTICATION_LEVEL;
  profile.lastAuthenticated = json.AZN_CRED_CREATE_TIME;
    
  return profile;
};
