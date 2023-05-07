import axios from 'axios';
import UserService from '../Services/KeycloakServices';
import { BASE_URL } from '../utils/api.routes';
import { notifyError } from './notify';


const axiosInstance = new axios.create(config);

axiosInstance.interceptors.request.use(
  function (reqConfig) {
    if (UserService.isLoggedIn()) {
      reqConfig.headers = {
        'Bearer': `${UserService.getToken()}`,
      };
    }
    return reqConfig;
  },
  function (error) {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  function (response) {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    notifyError(`#${error.response.status} Something went wrong while processing your request`);
    return Promise.reject(error);
  }
);

export default axiosInstance