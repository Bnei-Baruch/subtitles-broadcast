import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import Auth from "./Utils/Auth";
import SideNavBar from './Layout/SideNavBar'
import RenderOnAnonymous from "./Utils/RenderOnAnonymous";
import RenderOnAuthenticated from "./Utils/RenderOnAuthenticated";
import UserService from "./Services/KeycloakServices";
import MainRoutes from './Routes/Routes'


const App = () =>  (
    <BrowserRouter>
      <>
        <SideNavBar/>
        <MainRoutes/>
      </>
    </BrowserRouter>
);

export default App;