import { BrowserRouter, Route, Routes } from "react-router";

import Layout from "./components/layout";
import { ChatSocketProvider } from "./contexts/chatContext";
import { ServerChatSocketProvider } from "./contexts/serverChatContext";
import Chat from "./pages/Chat";
import Home from "./pages/Home";
import ServerChat from "./pages/ServerChat";

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
        <Route
          path="server-chat-room"
          element={
            <ServerChatSocketProvider>
              <Layout>
                <ServerChat />
              </Layout>
            </ServerChatSocketProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
