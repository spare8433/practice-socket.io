import { type ReactNode } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Home() {
  return (
    <Card className="w-2xl">
      <CardHeader>
        <CardTitle className="text-center">서비스를 선택하세요</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ServiceButton href="./chat-room">일반 채팅방 입장</ServiceButton>
        <ServiceButton href="./server-chat-room">서버 채팅방 입장</ServiceButton>
        <ServiceButton href="./my-camera">내 카메라 확인</ServiceButton>
        <ServiceButton href="./video-chat-room">화상 채팅방 입장</ServiceButton>
      </CardContent>
    </Card>
  );
}

const ServiceButton = ({ children, href }: { children: ReactNode; href: string }) => {
  const navigate = useNavigate();
  return (
    <Button type="button" className="w-full" size="lg" variant="default" onClick={() => navigate(href)}>
      {children}
    </Button>
  );
};

export default Home;
