import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Home() {
  const navigate = useNavigate();

  return (
    <Card className="w-2xl">
      <CardHeader>
        <CardTitle className="text-center">서비스를 선택하세요</CardTitle>
      </CardHeader>
      <CardContent>
        <Button type="button" className="w-full" size="lg" variant="default" onClick={() => navigate("./chat-room")}>
          채팅방 입장
        </Button>
      </CardContent>
    </Card>
  );
}

export default Home;
