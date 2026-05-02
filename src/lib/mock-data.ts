import { request } from "http";

export interface SettingValue {
  provider: {
    gemini: string;
    claude: string;
    openAI: string;
    custom: {
      requestURL: string;
      requestFormat: string;
      apiKey: string;
      modelCode: string;
    }
  };
  model: {
    role: string;
    name: string | null;
    code: string | null;
  }[];
}

export const mockSettingValue: SettingValue = 
{
  provider:{
    gemini: "",
    claude: "",
    openAI: "",
    custom: {
        requestURL: "",
        requestFormat: "",
        apiKey: "",
        modelCode: "",
      }
  },
  model:[
  {
    role: "main",
    name: "Gemini 3 Flash Preview",
    code: "gemini-3-flash-preview",
  },
  { 
    role: "sub",
    name: "Gemini 3.1 Flash Lite Preview",
    code: "gemini-3.1-flash-lite-preview",
  },
  {
    role: "feedback",
    name: "",
    code: "",
  }]
}

export interface ProjectList {
  id: string;
  title: string;
  value?: string;
}

export const mockProjectList: ProjectList[] = [
  {
    id: "Xkc4Kk",
    title: "News Article",
    value: "“그동안 못 받았던 혜택을 몰아서 받은 느낌입니다.” 대기업 영업부 과장 A씨(44)는 최근 연회비 1만~7만원인 카드 4장을 가위로 잘랐다."
  },
  {
    id: "6svH3F",
    title: "Legal Contract",
    value: "his Agreement is made and entered into as of the Effective Date by and between Party A and Party B. WHEREAS, Party A is engaged"
  },
    {
    id: "3",
    title: "Product Manual",
    value: "User manual for the new smart home device with technical specifications and setup instructions.",
  },
  {
    id: "4",
    title: "Blog Post",
    value: "Travel blog article about hidden gems in Barcelona for international tourists.",
  },
  {
    id: "5",
    title: "API Documentation",
    value: "Technical documentation for the REST API endpoints including code examples and error handling.",
  },
  {
    id: "6",
    title: "Research Notes",
    value: "Initial research findings and analysis for the upcoming product development cycle.",
  },
  {
    id: "7",
    title: "Meeting Minutes",
    value: "Summary of the quarterly business review",
  }
];

export interface ProjectData {
  id: string;
  title: string;
  value: {
    id: string;
    source: string;
    target: string;
    lineBreaks?: number;
  }[];
}

export const mockProjectData: ProjectData = {
  id: "Xkc4Kk",
  title: "News Article",
  value: [
    {
      "id": "1",
      "source": "“그동안 못 받았던 혜택을 몰아서 받은 느낌입니다.”",
      "target": "“It feels like I’ve finally received all the benefits I missed out on.”",
      "lineBreaks": 2
    },
    {
      "id": "2",
      "source": "대기업 영업부 과장 A씨(44)는 최근 연회비 1만~7만원인 카드 4장을 가위로 잘랐다.",
      "target": "Mr. A (44), a sales manager at a large corporation, recently cut up four credit cards with annual fees ranging from 10,000 to 70,000 KRW."
    },
    {
      "id": "3",
      "source": "여러 장의 카드계약을 해지한 대신 연회비 20만원의 매스티지(Masstige)급 카드를 새로 만들기로 했다.",
      "target": "Instead of holding multiple contracts, he decided to switch to a single \"Masstige\" level card with an annual fee of 200,000 KRW."
    },
    {
      "id": "4",
      "source": "매스티지는 대중을 뜻하는 매스(mass)와 특권을 의미하는 프레스티지(prestige)의 합성어로 카드업계에서는 연회비 100만~200만원의 VVIP카드와 연회비 1만~2만원인 카드의 중간지대에 있는 프리미엄급 신용카드를 의미한다.",
      "target": "Masstige —a portmanteau of \"mass\" and \"prestige\"—refers to premium credit cards positioned in the middle ground between VVIP cards (annual fee of 1–2 million KRW) and standard cards (annual fee of 10,000–20,000 KRW)."
    },
    {
      "id": "5",
      "source": "A씨의 경우는 잘 쓰지도 않는 대중교통 할인이나 좀처럼 가기 힘든 커피숍, 영화관 등에 카드 혜택이 몰려 있는 데다 포인트 적립률도 낮고...",
      "target": "In Mr. A's case, his previous card benefits were concentrated on public transit or specific cafes and movie theaters he rarely visited, and the reward rates were low."
    },
    {
      "id": "6",
      "source": "카드별로 사용액이 분산되어 제대로 된 주유 할인도 받기 힘들었다.",
      "target": "His spending was so divided among different cards that it was difficult to even qualify for significant fuel discounts."
    },
    {
      "id": "7",
      "source": "이전보다 연회비는 6만~7만원 늘어났지만 혜택은 몇 배로 돌아왔다.",
      "target": "Although his annual fee increased by 60,000–70,000 KRW, the value of the rewards he received multiplied."
    },
    {
      "id": "8",
      "source": "A씨는 기본 제공되는 특급호텔 식사권으로 기념일에 아내와 오붓한 식사를 즐겼고...",
      "target": "Mr. A enjoyed a high-end hotel dinner with his wife using a provided meal voucher..."
    },
    {
      "id": "9",
      "source": "...기프트권으로 받은 국내 왕복항공권으로 여름휴가를 다녀왔다.",
      "target": "...and went on summer vacation using a complimentary domestic round-trip flight gift."
    },
    {
      "id": "10",
      "source": "해외출장을 떠날 때마다 공항 라운지와 공항철도, 리무진 버스도 무료로 이용하는 등 일반카드에서 볼 수 없었던 다양한 혜택을 누렸다.",
      "target": "During overseas business trips, he utilized free access to airport lounges, airport railroads, and limousine buses—perks rarely found on standard cards."
    },
    {
      "id": "11",
      "source": "A씨는 “왜 진작 카드 리모델링을 하지 않았을까 하는 후회가 컸다”면서 “들어가는 연회비와 혜택을 비교해 봤을 때 싸구려 카드 여러 장보다 자신에 맞는 혜택을 풍성하게 주는 프리미엄 카드 한 장에 집중하는 것이 훨씬 더 바람직하다는 사실을 깨달았다”고 말했다.",
      "target": "Mr. A remarked, “I regret not doing this 'card remodeling' sooner. When comparing fees and rewards, it is much more desirable to focus on one premium card that offers rich, personalized benefits rather than holding several 'cheap' cards.”",
      "lineBreaks": 2
    },
    {
      "id": "12",
      "source": "미끼혜택효과 매스티지급 인기폭발 ‘삼성카드1’ 두각",
      "target": "The \"Masstige\" Card Boom: Samsung Card 1 Stands Out",
      "lineBreaks": 2
    },
    {
      "id": "13",
      "source": "최근 카드업계에선 연회비 10만~20만원대의 매스티지 카드가 대세로 자리 잡았다.",
      "target": "Recently, Masstige cards in the 100,000 to 200,000 KRW range have become a dominant trend in the industry."
    },
    {
      "id": "14",
      "source": "이유는 각 카드사들이 30~50대 비즈니스맨 고객을 늘리기 전략에 나섰기 때문이다.",
      "target": "This shift is driven by card companies' strategies to expand their customer base among business professionals in their 30s to 50s."
    },
    {
      "id": "15",
      "source": "일반 카드에서 제공되는 커피숍이나 영화관 할인, 음원 다운로드 상품권 등의 자잘한 혜택을 하나씩 없애는 대신 1~2개의 고급 서비스를 탑재한 매스티지 카드를 집중 개발해 앞다퉈 내놓고 있는 형국이다.",
      "target": "Instead of offering numerous minor benefits like coffee or movie discounts, they are competing to release cards that focus on one or two high-end core services."
    },
    {
      "id": "16",
      "source": "고객유치를 위해 일반 카드 대비 기본 포인트 적립률을 높여 놓았을 뿐만 아니라 일정한 카드 이용금액별로 추가 적립 혜택을 제공하며 충성도를 높이기 위해 안간힘을 쓰고 있다.",
      "target": "To increase loyalty, these cards offer higher base reward rates and additional bonus points based on annual spending."
    },
    {
      "id": "17",
      "source": "실제로 최근 몇 년간 카드업계에서는 개인정보 유출, 휴면카드 정리, 체크카드 혜택 확대 등으로 신용카드 발급이 대폭 줄었지만 연회비 10만~20만원대 카드 가입자는 역으로 늘어났다.",
      "target": "While overall credit card issuance has decreased due to personal data leaks and the rise of debit cards, the number of Masstige cardholders has actually grown.",
      "lineBreaks": 2
    },
    {
      "id": "18",
      "source": "한 카드사 관계자는 “카드사들이 해외명품이나 수입차 시장에서 흔히 쓰이던 전략을 통해 활로를 찾고 있다”며 “글로벌 명품 브랜드가 세컨드 브랜드를 선보이거나 수입차 회사가 ‘엔트리급’ 모델을 출시하는 것처럼 카드업계에서도 비슷한 전략이 통하고 있는 것”이라고 설명했다.",
      "target": "An industry official explained, “Card companies are finding a breakthrough by adopting strategies commonly used in the luxury fashion or automotive markets, much like a high-end fashion house launching a 'second brand' or a luxury car maker releasing an 'entry-level' model.”"
    },
    {
      "id": "19",
      "source": "하나의 카드에 대표적인 고급 혜택을 집어넣고 여타 서비스는 줄이는 단순화(Simplification) 전략에 고객들이 열광하고 있는 것으로 풀이할 수 있다.",
      "target": "This reflects a \"Simplification\" strategy—consolidating representative premium benefits into a single card while stripping away minor services—which customers are responding to with enthusiasm.",
      "lineBreaks": 2
    },
    {
      "id": "20",
      "source": "현재 출시된 매스티지 카드들을 살펴보면 삼성카드1, 현대카드 레드, 롯데골든 웨이브(이상 연회비 20만원)...",
      "target": "Currently available Masstige cards include: 200,000 KRW Tier : Samsung Card 1, Hyundai Card Red, Lotte Golden Wave."
    },
    {
      "id": "21",
      "source": "...신한카드 더클래식, 우리 블루다이아몬드, 하나SK 프리머스(이상 연회비 10만원) 등이다.",
      "target": "100,000 KRW Tier : Shinhan Card The Classic, Woori Blue Diamond, Hana SK Primus."
    },
    {
      "id": "22",
      "source": "이러한 매스티지 카드들은 혜택을 기존보다 단순화한 대신 특급호텔 숙박권, 국내 항공권 등 기존 프리미엄급 카드에서만 제공하던 서비스를 포함시켜 큰 관심을 불러일으키고 있다.",
      "target": "These cards generate significant interest by including services previously reserved for top-tier premium cards, such as high-end hotel stays and domestic flights."
    },
    {
      "id": "23",
      "source": "특히 눈에 띄는 성공을 보인 카드는 삼성카드1으로 지난 1년간 회원이 70% 가까이 폭증했다.",
      "target": "Samsung Card 1, in particular, has seen remarkable success, with its membership surging nearly 70% over the past year."
    },
    {
      "id": "24",
      "source": "여타 회사들 역시 매스티지 카드고객이 소폭 늘었지만 삼성카드1의 발행 증가 규모는 유난히 크다.",
      "target": "While other companies saw modest growth, Samsung's expansion was exceptionally large.",
      "lineBreaks": 2
    },
    {
      "id": "25",
      "source": "삼성카드의 한 관계자는 “삼성카드 1의 경우 여타 매스티지 카드에 비해 연회비가 높은 편이며 혜택은 프리미엄급으로 제공되고 있다”며...",
      "target": "A Samsung Card official noted, “Samsung Card 1 has a higher annual fee compared to other Masstige cards, but it provides premium-level benefits."
    },
    {
      "id": "26",
      "source": "“...체감할 수 있는 혜택이 클 뿐만 아니라, 보통 주력 카드로 집중해 사용하는 고객들의 경우 연회비 이상의 혜택을 어렵지 않게 받을 수 있다”고 높은 인기의 이유를 설명했다.",
      "target": "For customers who use it as their primary card, it is easy to receive benefits that far exceed the annual fee.”"
    },
    {
      "id": "27",
      "source": "현재 삼성카드1은 충성도가 높은 고객을 위해 포인트, 마일리지 등 기본 리워드 적립률이 높을 뿐만 아니라 연간 누적 이용금액에 따라 1000만원당 3만 포인트 또는 최대 3000마일까지 추가 적립을 받을 수 있는 것이 특징이다.",
      "target": "Samsung Card 1 features high base reward rates for points and mileage and offers an additional 30,000 points or 3,000 miles for every 10 million KRW spent annually."
    },
    {
      "id": "28",
      "source": "한편 고객들의 사용률이 떨어지는 기프트 서비스보다는 마일리지, 신세계상품권 등 고객들이 실제 생활 속에서 자주 사용하는 혜택을 중심으로 재편했다.",
      "target": "The card's gifts were also reorganized around practical items like Shinsegae vouchers or domestic round-trip flight tickets for the cardholder (an industry first), which has shown high satisfaction."
    },
    {
      "id": "29",
      "source": "한편 삼성카드1 사용자는 아웃백 등 주요 외식가맹점 3만원 할인, 프리미엄 커피전문점 커피 무료, CGV 동반 1인 주중 무료 및 주말 50% 할인 등 생활형 실속 할인도 유지하고 있다.",
      "target": "Despite its premium status, it still maintains practical lifestyle discounts at restaurants like Outback Steakhouse, free coffee at premium shops, and \"Buy 1 Get 1\" movie deals at CGV."
    }
  ]
}