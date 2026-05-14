import { ConfigProvider, theme } from "antd";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#E50914",
          colorBgBase: "#0F0F0F",
          colorTextBase: "#ffffff",
          borderRadius: 16,
        },
      }}
    >
      <AppRoutes />
    </ConfigProvider>
  );
}

export default App;
