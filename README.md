<a id="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h1 align="center">📡 practice-socket.io</h1>
  <p align="center">
    WebSocket 기반 실시간 채팅 및 WebRTC 영상 채팅 학습용 프로젝트입니다.
    <br />
    <br />
    <a href="https://github.com/spare8433/rich-calendar_BE/issues">Report Bug</a>
    &middot;
    <a href="https://github.com/spare8433/rich-calendar_BE/issues">Request Feature</a>
  </p>
</div>

<br />

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#개요">개요</a>      
    </li>
    <li>
      <a href="#개발-환경">개발 환경</a>
    </li>
    <li><a href="#시작하기">시작하기</a></li>
    <li>
      <a href="#주요-기능">주요 기능</a>
      <ul>
        <li><a href="#1-p2p-chat-room">P2P Chat Room</a></li>
        <li><a href="#2-server-based-chat-room-with-mongodb">Server-based Chat Room (with MongoDB)</a></li>
        <li><a href="#3-video-chat-room">Video Chat Room</a></li>
      </ul>
    </li>
    <li><a href="#환경-변수">환경 변수</a></li>
    <li>
      <a href="#프로젝트-구조">프로젝트 구조</a>      
    </li>
    <li><a href="#연락처">연락처</a></li>
  </ol>
</details>

<br />

## 개요

본 프로젝트는 WebSocket 기반 실시간 통신 구조와 WebRTC P2P 연결 과정을 직접 구현하고 검증하기 위해 제작되었습니다.



- Socket.io 기반 실시간 채팅 시스템 구현
- WebRTC 기반 브라우저 간 P2P 영상/음성 통화 기능 구현
- Offer / Answer / ICE Candidate 교환을 포함한 Signaling 흐름 직접 설계
- 채팅방 단위 서비스 분리 (P2P Chat / Server Chat / Video Chat)
- 가상 미디어 디바이스를 활용한 다중 브라우저 테스트 환경 구성


<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br />

## 개발 환경

### 백엔드

-   Node.js    
-   Express    
-   Socket.io
    
### 프론트

-   React    
-   WebRTC    
-   Socket.io-client

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br />

## 시작하기

```bash
# 채팅 서버 실행(로컬) [http://localhost:5173]
npm run server

# 채팅방 페이지 로드 [http://localhost:3000]
npm run dev
```

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br />

### 미디어 디바이스 없는 테스트 환경 브라우저 생성
```bash
# 가짜 미디어 등록한 chrome 세션 생성
# 가짜 마이크 2 개 카메라 1 개 활성화

# 1번 크롬 세션 생성
"C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="C:/chrome1" --use-fake-device-for-media-stream --use-fake-ui-for-media-stream

# 2번 크롬 세션 생성
"C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="C:/chrome2" --use-fake-device-for-media-stream --use-fake-ui-for-media-stream
```

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br />

## 주요 기능

### 1. P2P Chat Room

WebRTC DataChannel을 활용하여 브라우저 간 직접 연결(P2P) 기반 채팅을 구현

- 중앙 서버를 거치지 않고 Peer 간 직접 메시지 전송
- Offer / Answer 교환을 통한 PeerConnection 수립
- ICE Candidate 교환을 통한 NAT 환경 연결 처리
- 연결 상태 변화에 따른 UI 업데이트 처리

![DBless P2P Chat Room](https://github.com/user-attachments/assets/c78ef805-bbfd-4dac-a5a0-9b4c90d9c0fc)


<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br />

### 2. Server-based Chat Room (with MongoDB)

Socket.io 서버를 통해 메시지를 중계하고, MongoDB에 채팅 내용을 저장하는 구조로 구현

- 서버 기반 브로드캐스트 채팅
- 메시지 DB 영속화 처리
- 채팅방 단위 데이터 관리

![P2P Chat Room With DB](https://github.com/user-attachments/assets/2a5967eb-158a-4346-b561-8e8cc4e358bd)

![DB Data](https://github.com/user-attachments/assets/a4bdaabb-e74b-4da7-9c6c-a1635f47a072)

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br />

### 3. Video Chat Room

WebRTC MediaStream을 활용하여 브라우저 간 영상 및 음성 스트림을 교환하는 채팅방 구현

- getUserMedia를 통한 카메라/마이크 스트림 획득
- RTCPeerConnection을 통한 영상 스트림 전달
- MediaStream Track의 미디어 스트림을 실시간으로 제어


![P2P Video Chat Room](https://github.com/user-attachments/assets/6b4043ad-d574-4dc6-b15d-2db510a8064d)

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br />

## 환경 변수

```
# mongodb 연결 관련
MONGODB_URL=
MONGODB_NAME=
```

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br />

## 프로젝트 구조

```
practice-socketio
├── app/                              # 애플리케이션 핵심 로직
│
│   ├── root.tsx                      # 앱 진입점
│   ├── routes.tsx                    # 라우팅 설정
│
│   ├── routes/                       # 페이지 단위 화면 (테스트 대상 UI)
│   │   ├── home.tsx
│   │   ├── chat-room.tsx             # P2P 채팅
│   │   ├── server-chat-room.tsx      # 서버 기반 채팅
│   │   └── video-chat-room.tsx       # WebRTC 영상 채팅
│
│   ├── contexts/                     # 상태 관리 (핵심 비즈니스 로직)
│   │   ├── chatContext.tsx
│   │   ├── serverChatContext.tsx
│   │   └── videoChatContext.tsx
│
│   ├── ws-server/                    # WebSocket 서버 구현
│   │   └── server.ts                 # Socket 서버 진입점
│
│   ├── lib/                          # 공통 유틸 및 인프라 로직
│   │   ├── socket.ts                 # Socket 연결 관리
│   │   ├── db.ts                     # 임시 데이터 관리
│   │   └── utils.ts
│
│   └── types/                        # 전역 타입 정의
│
├── public/                           # 정적 리소스
│
├── package.json                      # 의존성 및 스크립트 정의
└── vite.config.ts                    # 빌드 설정
```

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>


<br />

## 연락처

<b>Email</b> : byeongchan8433@gmail.com

<b>Blog</b> : https://spare8433.tistory.com

<b>GitHub</b> : https://github.com/spare8433

<br />

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>
