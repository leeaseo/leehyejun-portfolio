const fs = require('fs');

const attachedBackup = {
  "about": {
    "role": "Furniture Designer",
    "bio": "일상에서 편안함을 느낄 수 있는 것들을 좋아합니다. 공간과 가구는 우리 삶의 모든 순간에 존재하며 시각적이거나 기능적으로 가장 오래도록 직접적인 영향을 미친다고 생각합니다. 무엇이 진정한 편안함인지 심도 있게 고민하고 일상의 균형을 맞춰주는 공간과 가구를 디자인합니다. 형태와 기능 사이에서 세밀하게 조율하며 사용하는 사람의 일상 속에 자연스럽게 스며드는 것을 지향합니다.",
    "name": "Lee Hye Jun",
    "contact": {
      "linkedin": "https://linkedin.com/in/leehyejun",
      "github": "",
      "instagram": "",
      "email": "15682@naver.com"
    },
    "location": "Korea, Republic of"
  },
  "resume": {
    "resumePdf": "/files/resume.pdf",
    "education": [
      {
        "major": "산업디자인과",
        "school": "계원예술대학교",
        "period": "2019년 졸업"
      }
    ],
    "skills": [
      "Auto CAD",
      "Adobe softwares",
      "Sketch Up",
      "3D MAX"
    ],
    "certifications": [
      "자동차운전면허 2종보통"
    ],
    "experience": [
      {
        "period": "2022년 11월 - 2026년 06월 / 3년 8개월",
        "tasks": [
          "가구 기획 및 디자인 개발",
          "제품 발주 및 생산관리",
          "협력사와의 커뮤니케이션 및 감리와 검수",
          "제품 촬영 기획 및 진행",
          "쇼룸 VMD · 가구배치 · 공간 프로젝트"
        ],
        "role": "디자인팀 · 대리",
        "company": "찰스퍼니처"
      },
      {
        "period": "2021년 05월 - 2022년 04월 / 1년",
        "company": "플랜모리",
        "role": "디자인팀 · 주임",
        "tasks": [
          "인테리어 빌트인 가구 설계 및 디자인",
          "제작관련 제품 발주 및 관리",
          "현장 시공감리"
        ]
      },
      {
        "company": "바이헤이데이",
        "role": "디자인팀 · 사원",
        "period": "2020년 03월 - 2021년 05월 / 1년 3개월",
        "tasks": [
          "가구 기획 및 디자인 개발",
          "제품 발주 및 생산관리",
          "협력사와의 커뮤니케이션 및 감리와 검수",
          "제품 촬영 기획 및 진행"
        ]
      },
      {
        "period": "2019년 03월 - 2019년 05월 / 3개월",
        "tasks": [
          "모델하우스 빌트인 가구 설계 및 디자인",
          "군산 디오션시티 · 세종 자이 e편한세상 프로젝트 참여"
        ],
        "role": "설계팀 · 인턴",
        "company": "씬디자인"
      }
    ],
    "honors": [
      {
        "title": "Poing — ASIA DESIGN PRIZE 2021 'GOLD WINNER'",
        "period": "2021년"
      },
      {
        "title": "Librat — MIICON 콘크리트 가구 공모전 '장려상'",
        "period": "2019년"
      },
      {
        "title": "Como Desk — 고지베리 목공방 개인프로젝트",
        "period": "2020-21년"
      }
    ],
    "totalExperience": "총 6년 2개월"
  },
  "projects": [
    {
      "order": 2,
      "date": 2025,
      "dimensions": "Various Dimensions",
      "images": [
        "/images/work/display-system-1.jpg",
        "/images/work/display-system-2.jpg"
      ],
      "thumbnail": "/images/work/display-system.jpg",
      "content": "This project was designed and built for The New School alongside Ryan Mo.\n\nFor this project, the client requested a mobile and modular system for the display of merchandise that could collapse and deploy within any given space. Our approach focused on the development of various modules each fulfilling a different need. These modules include shelving, clothing racks, mirrors, tables, platforms, and a point of sale. Deployed together, the space assumes the function of a complete retail environment supporting the displaying and shopping of an assortment of goods.\n\nThe most critical design challenge was collapsing this complete retail environment into an easily mobile and deployable system. For the client, this meant it must be transported and deployed by a single person. This resulted in strict size and weight constraints.\n\nOur solution turns the point of sale module into a means of transportation, where it becomes a cart-like structure, onto which the other modules are collapsed and stacked, allowing the full system to fit through doors and hallways, and inside any standard elevator. This 3ft x 3ft x 6ft package deploys to fill a space up to roughly 500sq ft. It is an entire store on wheels.\n\nImportantly, this process of transportation and deployment should be easy and simple. It is very intentionally not a process of assembly or construction. All interaction is reduced to simple gestures like turning, folding, snapping, setting, etc. There are no tools required, and the entire process can be completed by a single individual in a matter of minutes with very little explanation.\n\nPhotographed by Colin Padulo in addition to Ryan and Myself.",
      "updatedAt": "2026-10-04T22:16:23.698Z",
      "materials": "Aluminum Extrusions, Stainless Steel Hardware",
      "externalUrl": "https://leehyejun.com/work/mobile-display-system",
      "title": "Mobile Display System",
      "slug": "mobile-display-system"
    },
    {
      "order": 3,
      "title": "Seating for Doing Nothing at All",
      "materials": "6061 Aluminum, Polyurethane, Steel Springs, Paracord",
      "date": 2025,
      "thumbnail": "/images/work/seating-doing-nothing.jpg",
      "externalUrl": "https://leehyejun.com/work/seating-for-doing-nothing",
      "dimensions": "36” × 72” × 32”",
      "images": [
        "/images/work/seating-detail-1.jpg",
        "/images/work/seating-detail-2.jpg"
      ],
      "updatedAt": "2026-10-04T21:40:43.735Z",
      "content": "## 개념 및 의도 (Concept & Intent)\n\n생산성과 효율성만을 강요하는 현대의 인체공학 가구 패러다임에 반문하는 라운지 구조물입니다. 신체가 특정 자세를 강요받지 않고, 중력에 몸을 맡긴 채 온전히 무위(Nothing)의 상태로 휴식할 수 있도록 설계되었습니다.\n\n### 구조적 특성 (Structural Features)\n\n- **캔틸레버 서스펜션**: 탄성 계수가 정밀 계산된 스틸 인장 스프링과 6061 튜브 프레임이 사용자의 체중에 맞춰 유연하게 반응합니다.\n- **파라코드 인터레이싱**: 밀리터리 규격 나일론 파라코드를 핸드 우븐 방식으로 직조하여 통기성과 균등한 체압 분산을 실현했습니다.\n- **비정형 폴리우레탄 폼**: 접촉면의 경도를 3단계로 차등화하여 장시간 누워 있어도 피로감을 주지 않습니다.",
      "slug": "seating-for-doing-nothing"
    },
    {
      "order": 4,
      "externalUrl": "https://leehyejun.com/work/modular-adapter",
      "updatedAt": "2026-10-04T21:39:52.654Z",
      "title": "Modular Adapter System",
      "dimensions": "Various Dimensions",
      "date": 2024,
      "images": [
        "/images/work/modular-adapter-1.jpg",
        "/images/work/modular-adapter-2.jpg"
      ],
      "content": "## 개요 (Overview)\n\n모듈러 어댑터 시스템은 다양한 규격의 디바이스와 카메라 리그, 외장 배터리팩, 센서 유닛을 상호 호환시키는 퀵 체인지 플랫폼입니다. Arca-Swiss 규격 및 NATO 레일 표준과 100% 기계적 호환을 제공합니다.\n\n### 기계적 메커니즘 (Mechanical Integrity)\n\n극한의 진동 환경에서도 완벽한 잠금을 보장하기 위해 듀얼 스테이지 세이프티 핀을 내장했습니다. 손가락 한 번의 가벼운 슬라이드 동작으로 부품을 교체할 수 있으면서도, 불시의 이탈 사고를 원천 차단합니다.\n\n- **기계적 허용 오차**: ±0.01mm 초정밀 공차 가공\n- **접촉면 보호**: 고밀도 폼 실리콘 패딩 적용으로 장비 체결면 스크래치 방지\n- **마감 옵션**: Deep Matte Graphite Black PVD 코팅",
      "materials": "Anodized Aluminum, Electronics",
      "slug": "modular-adapter",
      "thumbnail": "/images/work/modular-adapter.jpg"
    },
    {
      "slug": "0",
      "content": "fdfdfdf",
      "title": "05.fjkdljfklds",
      "thumbnail": "",
      "materials": "fdfdsfdsfdsfdsfdsf",
      "order": 5,
      "updatedAt": "2026-10-04T21:39:52.714Z",
      "date": "2026",
      "dimensions": "Various Dimensions",
      "images": []
    }
  ]
};

const existingCustom = JSON.parse(fs.readFileSync('src/content/custom-data.json', 'utf8'));

const merged = {
  projects: attachedBackup.projects,
  about: attachedBackup.about,
  resume: attachedBackup.resume,
  experiences: existingCustom.experiences || []
};

fs.writeFileSync('src/content/custom-data.json', JSON.stringify(merged, null, 2), 'utf8');
fs.writeFileSync('src/content/resume.json', JSON.stringify(attachedBackup.resume, null, 2), 'utf8');
fs.writeFileSync('src/content/about.json', JSON.stringify(attachedBackup.about, null, 2), 'utf8');

console.log('Successfully wrote exact user backup data to custom-data.json, resume.json, and about.json!');
