import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import DashboardPage from "../pages/DashboardPage";
import RecordsPage from "../pages/RecordsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "records", element: <RecordsPage /> },
    ],
  },
]);

export default router;
