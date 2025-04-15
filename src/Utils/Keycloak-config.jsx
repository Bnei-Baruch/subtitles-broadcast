const keycloakConfigProd = {
  realm: "main",
  url: "https://accounts.kab.info/auth/",
  clientId: "membership_pay",
};

const keycloakConfigDev = {
  realm: "master",
  url: "https://auth.bbdev1.kbb1.com",
  clientId: "kolman-dev",
};

// there is a problem with PM2 env variable.
// for now this should do for production
// will then change value for dev.

if (process.env.REACT_APP_STAGING === "true") {
  module.exports = keycloakConfigDev;
} else {
  module.exports = keycloakConfigProd;
}
