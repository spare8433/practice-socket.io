import { BrowserRouter, Route, Routes } from "react-router";

import Layout from "./components/layout";
import { ChatSocketProvider } from "./contexts/chatContext";
import Chat from "./pages/Chat";
import Home from "./pages/home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          index
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="chat-room"
          element={
            <ChatSocketProvider>
              <Layout>
                <Chat />
              </Layout>
            </ChatSocketProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
