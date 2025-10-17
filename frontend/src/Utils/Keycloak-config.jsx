const keycloakConfigProd = {
  realm: "main",
  url: "https://accounts.kab.info/auth/",
  clientId: "membership_pay",
};

const keycloakConfigDev = {
  realm: "master",
  url: "https://auth.2serv.eu/auth",
  clientId: "kolman-dev",
  clientSecret: "685416c5-87a7-4816-afc0-73d0e588f4b4",
};

// there is a problem with PM2 env variable.
// for now this should do for production
// will then change value for dev.

if (process.env.REACT_APP_STAGING === "true") {
  module.exports = keycloakConfigDev;
} else {
  module.exports = keycloakConfigProd;
}
