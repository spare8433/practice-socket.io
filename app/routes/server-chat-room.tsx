import { ChevronLeft } from "lucide-react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ServerChatSocketProvider, useServerChatSocketContext } from "@/contexts/serverChatContext";
import { serverChatSocket } from "@/lib/socket";

export default function ServerChatRoom() {
  return (
    <ServerChatSocketProvider>
      <ServerChatRoomContents />
    </ServerChatSocketProvider>
  );
}

const ServerChatRoomContents = () => {
  const { isConnected, rooms, mode, currentRoom, chatMessages, exitCurrentRoom, sendMessage, enterRoom } =
    useServerChatSocketContext();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: { message: "" },
  });

  const onSubmit: SubmitHandler<{ message: string }> = ({ message }) => {
    sendMessage(message);
    form.setValue("message", "");
  };

  return (
    <>
      {mode === "list" && (
        <Card className="w-2xl">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <div className="flex space-x-3">
                <Button type="button" size={null} variant="image-icon" onClick={() => navigate("/")}>
                  <ChevronLeft className="size-6" />
                </Button>

                <h1>서버 채팅방 목록</h1>
              </div>
              <p>{isConnected ? "연결됨" : "연결끊김"}</p>
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent>
            {rooms.map(([room, count]) => (
              <Button
                key={room}
                variant="ghost"
                className="flex justify-between w-full border shadow px-4 py-6 mb-4"
                onClick={() => enterRoom(room)}
              >
                <b>{room}</b>
                <span>{count}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {mode === "chat" && (
        <Card className="w-2xl">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <div className="flex space-x-3">
                <Button type="button" size={null} variant="image-icon" onClick={exitCurrentRoom}>
                  <ChevronLeft className="size-6" />
                </Button>

                <h1>서버 채팅방 - {currentRoom}</h1>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted h-96 mb-4 rounded-2xl p-4 overflow-y-auto">
              {chatMessages.map(({ message, userId }) => (
                <p key={new Date().toString + userId + message} className="mb-1">
                  {userId === serverChatSocket.id ? "me" : userId}: {message}
                </p>
              ))}
            </div>

            <Form {...form}>
              <form className="flex gap-x-2" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormControl>
                      <Input placeholder="메시지 입력" {...field} />
                    </FormControl>
                  )}
                />
                <Button>전송</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </>
  );
};
